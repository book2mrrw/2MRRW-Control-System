import { fail, ok, parseJson, requireAdmin } from "@/server/http";
import { getCollectorCard } from "@/server/collector-cards/collectorCardService";
import {
  collectorCardProductSlug,
  releaseProductSlug,
  vaultItemProductSlug,
  type CommerceContentType
} from "@/server/commerce/pricingTaxonomies";
import { getReleaseDraft } from "@/server/release-management/releaseManagementService";
import { getVaultItem } from "@/server/vault/vaultItemService";
import { z } from "zod";

const bodySchema = z.object({
  releaseId: z.string().min(1).optional(),
  contentType: z.enum(["release", "collector_card", "vault_item", "vault_access"]).optional(),
  contentId: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  expiresAt: z.string().nullable().optional(),
  maxRedemptions: z.number().int().positive().nullable().optional()
});

function storefrontApiBase() {
  return (
    process.env.ARTIST_PLATFORM_API_URL ??
    process.env.NEXT_PUBLIC_FRONTEND_URL ??
    process.env.ARTIST_PLATFORM_PUBLIC_URL ??
    "http://localhost:3000"
  ).replace(/\/+$/, "");
}

async function resolveGiftContext(input: {
  releaseId?: string;
  contentType?: CommerceContentType;
  contentId?: string;
}) {
  if (input.releaseId) {
    const draft = getReleaseDraft(input.releaseId);
    if (!draft) return { error: "Release not found", status: 404 as const };
    if (!draft.giftingEnabled) {
      return { error: "Gifting is not enabled for this release. Turn it on under storefront pricing first.", status: 400 as const };
    }
    if (draft.priceInCents == null) {
      return { error: "Release needs a storefront price before creating gift links.", status: 400 as const };
    }
    return {
      title: `Gift — ${draft.title}`,
      slugs: [releaseProductSlug(draft.slug)],
      contentId: draft.id
    };
  }

  const contentType = input.contentType;
  const contentId = input.contentId;
  if (!contentType || !contentId) {
    return { error: "releaseId or contentType + contentId required", status: 400 as const };
  }

  if (contentType === "collector_card") {
    const card = await getCollectorCard(contentId);
    if (!card) return { error: "Collector card not found", status: 404 as const };
    if (!card.giftingEnabled) {
      return { error: "Gifting is not enabled for this collector card.", status: 400 as const };
    }
    if (card.priceInCents == null) {
      return { error: "Collector card needs a storefront price before gifting.", status: 400 as const };
    }
    return { title: `Gift — ${card.title}`, slugs: [collectorCardProductSlug(card.slug)], contentId: card.id };
  }

  if (contentType === "vault_item") {
    const item = await getVaultItem(contentId);
    if (!item) return { error: "Vault item not found", status: 404 as const };
    if (!item.giftingEnabled) {
      return { error: "Gifting is not enabled for this vault item.", status: 400 as const };
    }
    if (item.priceInCents == null) {
      return { error: "Vault item needs a storefront price before gifting.", status: 400 as const };
    }
    return { title: `Gift — ${item.title}`, slugs: [vaultItemProductSlug(item.slug)], contentId: item.id };
  }

  if (contentType === "vault_access") {
    return { title: "Gift — Vault Pass", slugs: ["vault-pass"], contentId: "vault-pass" };
  }

  return { error: "Unsupported content type for gifting", status: 400 as const };
}

export async function POST(request: Request) {
  try {
    requireAdmin(request);
    const body = await parseJson(request, bodySchema);
    const resolved = await resolveGiftContext(body);
    if ("error" in resolved) {
      return fail(resolved.error ?? "Gift request invalid", resolved.status);
    }

    const secret = process.env.ADMIN_SEED_SECRET;
    if (!secret) {
      return fail("ADMIN_SEED_SECRET is not configured for gift proxy.", 503);
    }

    const slugs = resolved.slugs;
    const proxyResponse = await fetch(`${storefrontApiBase()}/api/admin/gifts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-seed-secret": secret
      },
      body: JSON.stringify({
        title: body.title ?? resolved.title,
        slugs,
        expiresAt: body.expiresAt ?? null,
        maxRedemptions: body.maxRedemptions ?? null
      }),
      cache: "no-store"
    });

    const payload = (await proxyResponse.json().catch(() => ({}))) as {
      id?: string;
      title?: string;
      token?: string;
      url?: string;
      slugs?: string[];
      error?: string;
    };

    if (!proxyResponse.ok) {
      return fail(payload.error ?? "Gift creation failed on storefront", proxyResponse.status);
    }

    return ok({
      id: payload.id,
      title: payload.title,
      token: payload.token,
      url: payload.url,
      slugs: payload.slugs ?? slugs,
      contentId: resolved.contentId,
      contentType: body.contentType ?? (body.releaseId ? "release" : undefined)
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid gift request", 400);
  }
}
