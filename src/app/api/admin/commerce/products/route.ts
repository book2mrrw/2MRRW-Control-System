import { fail, ok, requireStudioAccess } from "@/server/http";
import { listCollectorCards } from "@/server/collector-cards/collectorCardService";
import { collectorCardProductSlug, releaseProductSlug, vaultItemProductSlug } from "@/server/commerce/pricingTaxonomies";
import { listVaultItems } from "@/server/vault/vaultItemService";
import { getReleaseManagementOverview } from "@/server/release-management/releaseManagementService";

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
