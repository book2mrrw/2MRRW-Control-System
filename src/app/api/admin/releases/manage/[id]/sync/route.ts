import { fail, ok, requireStudioAccess } from "@/server/http";
import { hydrateReleaseManagementFromSupabase } from "@/server/release-management/releaseCatalogHydrationService";
import { markSyncDirty } from "@/server/sync/syncStateService";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireStudioAccess(request);
    const { id } = await params;
    await hydrateReleaseManagementFromSupabase();
    await markSyncDirty(`release:${id}`, { releaseId: id, reason: "manual_frontend_sync" });
    await markSyncDirty("catalog", { releaseId: id, reason: "manual_frontend_sync" });
    return ok({ releaseId: id, synced: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid release sync request", 400);
  }
}
