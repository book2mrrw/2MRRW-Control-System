import { fail, ok } from "@/server/http";
import { getServerSupabase } from "@/server/supabase/client";
import { releaseProductSlug } from "@/server/commerce/pricingTaxonomies";
import { syncPublishedCatalogToStorefront } from "@/server/sync/frontendCatalogSyncService";
import { upsertSyncState } from "@/server/sync/syncStateService";
import { isStorefrontSyncPushReady } from "@/server/sync/storefrontSyncConfig";

function authorizeCron(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  if (header === `Bearer ${secret}`) return true;
  return request.headers.get("x-cron-secret") === secret;
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return fail("Unauthorized cron request", 401);
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    return fail("Supabase is not configured", 503);
  }

  const { data: releases, error } = await supabase
    .from("releases")
    .select("id, slug, title, status, price_in_cents")
    .eq("status", "published")
    .not("price_in_cents", "is", null);

  if (error) {
    return fail(error.message, 500);
  }

  const drift: Array<{ releaseId: string; slug: string; issue: string }> = [];

  for (const release of releases ?? []) {
    const expectedSlug = releaseProductSlug(release.slug as string);
    const { data: product } = await supabase
      .from("products")
      .select("slug, active, storage_path")
      .eq("content_type", "release")
      .eq("content_id", release.id)
      .maybeSingle();

    if (!product?.slug) {
      drift.push({ releaseId: release.id as string, slug: expectedSlug, issue: "missing_control_product" });
      continue;
    }
    if (!product.active) {
      drift.push({ releaseId: release.id as string, slug: expectedSlug, issue: "inactive_control_product" });
    }
  }

  let syncResult: Awaited<ReturnType<typeof syncPublishedCatalogToStorefront>> | null = null;
  if (drift.length && isStorefrontSyncPushReady()) {
    const releaseIds = [...new Set(drift.map((row) => row.releaseId))];
    syncResult = await syncPublishedCatalogToStorefront({
      releaseIds,
      reason: "cron.reconcile_catalog"
    });
  }

  await upsertSyncState({
    key: "catalog",
    dirty: drift.length > 0,
    metadata: {
      lastReconcileAt: new Date().toISOString(),
      driftCount: drift.length,
      drift,
      syncAttempted: Boolean(syncResult),
      syncOk: syncResult?.ok ?? false
    }
  });

  return ok({
    publishedPricedReleases: releases?.length ?? 0,
    driftCount: drift.length,
    drift,
    sync: syncResult
  });
}

export async function POST(request: Request) {
  return GET(request);
}
