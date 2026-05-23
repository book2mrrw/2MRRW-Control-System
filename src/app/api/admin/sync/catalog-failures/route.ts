import { fail, ok, requireStudioAccess } from "@/server/http";
import { getSyncState } from "@/server/sync/syncStateService";
import { validateStorefrontSyncEnv } from "@/server/sync/storefrontSyncConfig";

export async function GET(request: Request) {
  try {
    requireStudioAccess(request);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Studio access required", 401);
  }

  const catalogState = await getSyncState("catalog");
  const metadata = (catalogState?.metadata ?? {}) as Record<string, unknown>;
  const failedSlugs = Array.isArray(metadata.failedSlugs) ? metadata.failedSlugs : [];
  const env = validateStorefrontSyncEnv({ log: false });

  return ok({
    dirty: Boolean(catalogState?.dirty),
    failedSlugs,
    lastStorefrontSyncAt: metadata.lastStorefrontSyncAt ?? null,
    lastReconcileAt: metadata.lastReconcileAt ?? null,
    drift: metadata.drift ?? [],
    env
  });
}
