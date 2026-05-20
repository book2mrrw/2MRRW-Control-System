import { fail, ok, parseJson, requireStudioAccess } from "@/server/http";
import { getCollectorCard, updateCollectorCard } from "@/server/collector-cards/collectorCardService";
import { patchCatalogProductByContent } from "@/server/commerce/productCommerceService";
import {
  collectorCardProductSlug,
  releaseProductSlug,
  vaultItemProductSlug,
  type CommerceContentType
} from "@/server/commerce/pricingTaxonomies";
import { getReleaseDraft, updateReleaseMetadata } from "@/server/release-management/releaseManagementService";
import { markSyncDirty } from "@/server/sync/syncStateService";
import { queueStorefrontCatalogSync } from "@/server/sync/frontendCatalogSyncService";
import { getVaultItem, updateVaultItem } from "@/server/vault/vaultItemService";
import { listCollectorCards } from "@/server/collector-cards/collectorCardService";
import { listVaultItems } from "@/server/vault/vaultItemService";
import { getReleaseManagementOverview } from "@/server/release-management/releaseManagementService";
import { z } from "zod";

const patchSchema = z.object({
  contentType: z.enum(["release", "collector_card", "vault_item", "vault_access"]),
  contentId: z.string().min(1),
  priceCents: z.number().int().nonnegative().nullable().optional(),
  giftingEnabled: z.boolean().optional(),
  active: z.boolean().optional()
});

export async function GET(request: Request) {
  try {
    requireStudioAccess(request);
    const overview = getReleaseManagementOverview();
    const releases = overview.allReleases
      .filter((release) => release.priceInCents != null)
      .map((release) => ({
        contentType: "release" as const,
        contentId: release.id,
        slug: releaseProductSlug(release.slug),
        label: release.title,
        priceCents: release.priceInCents ?? null,
        giftingEnabled: Boolean(release.giftingEnabled),
        active: release.status === "published",
        status: release.status
      }));

    const cards = (await listCollectorCards()).map((card) => ({
      contentType: "collector_card" as const,
      contentId: card.id,
      slug: collectorCardProductSlug(card.slug),
      label: card.title,
      priceCents: card.priceInCents ?? null,
      giftingEnabled: card.giftingEnabled,
      active: card.active,
      status: card.visibility
    }));

    const vault = (await listVaultItems())
      .filter((item) => item.priceInCents != null)
      .map((item) => ({
        contentType: "vault_item" as const,
        contentId: item.id,
        slug: vaultItemProductSlug(item.slug),
        label: item.title,
        priceCents: item.priceInCents ?? null,
        giftingEnabled: item.giftingEnabled,
        active: item.visibility === "published",
        status: item.visibility,
        category: item.category
      }));

    return ok({
      items: [...releases, ...cards, ...vault],
      count: releases.length + cards.length + vault.length
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Commerce catalog failed", 400);
  }
}

async function patchUnderlyingContent(input: {
  contentType: CommerceContentType;
  contentId: string;
  priceCents?: number | null;
  giftingEnabled?: boolean;
  active?: boolean;
}) {
  if (input.contentType === "release") {
    const draft = getReleaseDraft(input.contentId);
    if (!draft) return { ok: false as const, message: "Release not found." };
    updateReleaseMetadata(input.contentId, {
      priceInCents: input.priceCents,
      giftingEnabled: input.giftingEnabled
    });
    return { ok: true as const };
  }

  if (input.contentType === "collector_card") {
    const card = await getCollectorCard(input.contentId);
    if (!card) return { ok: false as const, message: "Collector card not found." };
    await updateCollectorCard(input.contentId, {
      priceInCents: input.priceCents,
      giftingEnabled: input.giftingEnabled,
      active: input.active,
      visibility: input.active === false ? "archived" : card.visibility
    });
    return { ok: true as const };
  }

  if (input.contentType === "vault_item") {
    const item = await getVaultItem(input.contentId);
    if (!item) return { ok: false as const, message: "Vault item not found." };
    await updateVaultItem(input.contentId, {
      priceInCents: input.priceCents,
      giftingEnabled: input.giftingEnabled,
      visibility: input.active === false ? "archived" : item.visibility
    });
    return { ok: true as const };
  }

  return { ok: false as const, message: "vault_access rows are managed via Vault Pass product." };
}

export async function PATCH(request: Request) {
  try {
    requireStudioAccess(request);
    const body = await parseJson(request, patchSchema);
    const underlying = await patchUnderlyingContent(body);
    if (!underlying.ok) return fail(underlying.message, 404);

    const product = await patchCatalogProductByContent(body);
    if (!product.ok) return fail(product.message, 400);

    await markSyncDirty("catalog", { contentType: body.contentType, contentId: body.contentId, reason: "commerce.inline_edit" });
    queueStorefrontCatalogSync({
      vaultItemIds: body.contentType === "vault_item" ? [body.contentId] : undefined,
      collectorCardIds: body.contentType === "collector_card" ? [body.contentId] : undefined,
      reason: "commerce.inline_edit"
    });

    return ok({ patched: true, contentType: body.contentType, contentId: body.contentId });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Commerce patch failed", 400);
  }
}
