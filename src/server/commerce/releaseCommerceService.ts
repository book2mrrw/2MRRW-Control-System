import "server-only";

import { releaseProductSlug } from "@/server/commerce/pricingTaxonomies";
import { upsertCatalogProduct } from "@/server/commerce/productCommerceService";
import {
  normalizePricingTier,
  validateReleasePriceInCents,
  type PricingTier
} from "@/server/commerce/pricingValidation";
import type { ReleaseManagementDraft } from "@/server/release-management/releaseManagementService";
import { getServerSupabase } from "@/server/supabase/client";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export { releaseProductSlug };

export function resolveDraftPricingTier(draft: Pick<ReleaseManagementDraft, "pricingTier" | "releaseType">) {
  return draft.pricingTier ?? normalizePricingTier(draft.releaseType);
}

export function validateDraftCommerceFields(
  draft: Pick<ReleaseManagementDraft, "priceInCents" | "pricingTier" | "releaseType" | "giftingEnabled">
) {
  const tier = resolveDraftPricingTier(draft);
  if (draft.pricingTier && draft.priceInCents == null) {
    return { ok: false as const, message: "Set a price when a pricing tier is selected." };
  }
  if (draft.priceInCents != null && !tier) {
    return { ok: false as const, message: "pricingTier is required when priceInCents is set." };
  }
  const priceCheck = validateReleasePriceInCents(draft.priceInCents, tier);
  if (!priceCheck.ok) return priceCheck;
  if (draft.giftingEnabled && draft.priceInCents == null) {
    return { ok: false as const, message: "Gifting requires a valid storefront price." };
  }
  return { ok: true as const };
}

export async function persistDraftCommerceColumns(draft: ReleaseManagementDraft) {
  const supabase = getServerSupabase();
  if (!supabase || !uuidPattern.test(draft.id)) return { persisted: false };

  const tier = resolveDraftPricingTier(draft);
  const payload = {
    price_in_cents: draft.priceInCents ?? null,
    pricing_tier: tier,
    gifting_enabled: Boolean(draft.giftingEnabled)
  };

  const { error } = await supabase.from("releases").update(payload).eq("id", draft.id);
  if (error && /price_in_cents|pricing_tier|gifting_enabled/i.test(error.message ?? "")) {
    return { persisted: false, skipped: true };
  }
  if (error) return { persisted: false, error: error.message };

  return { persisted: true };
}

export async function upsertReleaseProduct(draft: ReleaseManagementDraft) {
  if (draft.priceInCents == null) {
    return { ok: true as const, skipped: true as const };
  }

  const validation = validateDraftCommerceFields(draft);
  if (!validation.ok) {
    return { ok: false as const, message: validation.message };
  }

  const supabase = getServerSupabase();
  if (!supabase || !uuidPattern.test(draft.id)) {
    return { ok: false as const, message: "Supabase UUID release required to create product." };
  }

  const slug = releaseProductSlug(draft.slug);
  const tier = resolveDraftPricingTier(draft) as PricingTier;
  const product = await upsertCatalogProduct({
    slug,
    label: draft.title,
    contentType: "release",
    contentId: draft.id,
    priceCents: draft.priceInCents,
    giftingEnabled: draft.giftingEnabled,
    active: true,
    grants: [{ type: "release", releaseId: draft.id }]
  });

  if (!product.ok) {
    return product;
  }

  await persistDraftCommerceColumns({ ...draft, pricingTier: tier });

  return { ok: true as const, productSlug: slug };
}
