import { fail, ok, requireAdmin } from "@/server/http";
import { getReleaseDraft, getReleaseLifecycle } from "@/server/release-management/releaseManagementService";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireAdmin(request);
    const { id } = await params;
    const draft = getReleaseDraft(id);
    if (!draft) return fail("Release draft not found", 404);
    const url = new URL(request.url);
    return ok(url.searchParams.has("preview") ? { draft, lifecycle: getReleaseLifecycle(id) } : draft);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid release-management request", 403);
  }
}
