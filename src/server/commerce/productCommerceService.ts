import "server-only";

import type { CommerceContentType } from "@/server/commerce/pricingTaxonomies";
import type { EntitlementGrant } from "@/server/types";
import { getServerSupabase } from "@/server/supabase/client";

export type ProductUpsertInput = {
  slug: string;
  label: string;
  contentType: CommerceContentType;
  contentId: string;
  priceCents: number | null;
  currency?: string;
  giftingEnabled?: boolean;
  active?: boolean;
  grants: EntitlementGrant[];
};

export async function upsertCatalogProduct(input: ProductUpsertInput) {
  const supabase = getServerSupabase();
  if (!supabase) {
    return { ok: false as const, message: "Supabase required to upsert products." };
  }

  const productPayload = {
    slug: input.slug,
    name: input.label,
    label: input.label,
    content_type: input.contentType,
    content_id: input.contentId,
    price_cents: input.priceCents,
    currency: input.currency ?? "usd",
    gifting_enabled: Boolean(input.giftingEnabled),
    active: input.active ?? true,
    grants: input.grants
  };

  let write = await supabase.from("products").upsert(productPayload, { onConflict: "slug" });
  if (write.error && /price_cents|currency|content_type|content_id|label|gifting_enabled/i.test(write.error.message ?? "")) {
    write = await supabase.from("products").upsert(
      {
        slug: productPayload.slug,
        name: productPayload.name,
        active: productPayload.active,
        grants: productPayload.grants
      },
      { onConflict: "slug" }
    );
  }

  if (write.error) {
    return { ok: false as const, message: write.error.message };
  }

  return { ok: true as const, productSlug: input.slug };
}

export async function patchCatalogProductByContent(input: {
  contentType: CommerceContentType;
  contentId: string;
  priceCents?: number | null;
  giftingEnabled?: boolean;
  active?: boolean;
}) {
  const supabase = getServerSupabase();
  if (!supabase) {
    return { ok: false as const, message: "Supabase required to patch products." };
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.priceCents !== undefined) patch.price_cents = input.priceCents;
  if (input.giftingEnabled !== undefined) patch.gifting_enabled = input.giftingEnabled;
  if (input.active !== undefined) patch.active = input.active;

  let query = supabase.from("products").update(patch).eq("content_type", input.contentType).eq("content_id", input.contentId);
  let { error } = await query;

  if (error && /content_type|content_id|gifting_enabled/i.test(error.message ?? "")) {
    const fallback = await supabase.from("products").select("slug, grants").eq("content_id", input.contentId).maybeSingle();
    if (fallback.data?.slug) {
      const retry = await supabase.from("products").update(patch).eq("slug", fallback.data.slug);
      error = retry.error;
    }
  }

  if (error) {
    return { ok: false as const, message: error.message };
  }

  return { ok: true as const };
}
