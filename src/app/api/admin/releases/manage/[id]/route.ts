import { fail, ok, requireAdmin } from "@/server/http";
import { getReleaseDraft } from "@/server/release-management/releaseManagementService";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireAdmin(request);
    const { id } = await params;
    const draft = getReleaseDraft(id);
    return draft ? ok(draft) : fail("Release draft not found", 404);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid release-management request", 403);
  }
}
