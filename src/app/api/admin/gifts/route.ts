import { fail, ok, parseJson, requireAdmin } from "@/server/http";
import { getReleaseDraft } from "@/server/release-management/releaseManagementService";
import { releaseProductSlug } from "@/server/commerce/releaseCommerceService";
import { z } from "zod";

const bodySchema = z.object({
  releaseId: z.string().min(1),
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

export async function POST(request: Request) {
  try {
    requireAdmin(request);
    const body = await parseJson(request, bodySchema);
    const draft = getReleaseDraft(body.releaseId);
    if (!draft) {
      return fail("Release not found", 404);
    }
    if (!draft.giftingEnabled) {
      return fail("Gifting is not enabled for this release. Turn it on under storefront pricing first.", 400);
    }
    if (draft.priceInCents == null) {
      return fail("Release needs a storefront price before creating gift links.", 400);
    }

    const secret = process.env.ADMIN_SEED_SECRET;
    if (!secret) {
      return fail("ADMIN_SEED_SECRET is not configured for gift proxy.", 503);
    }

    const slugs = [releaseProductSlug(draft.slug)];
    const proxyResponse = await fetch(`${storefrontApiBase()}/api/admin/gifts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-seed-secret": secret
      },
      body: JSON.stringify({
        title: body.title ?? `Gift — ${draft.title}`,
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
      releaseId: draft.id
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid gift request", 400);
  }
}
