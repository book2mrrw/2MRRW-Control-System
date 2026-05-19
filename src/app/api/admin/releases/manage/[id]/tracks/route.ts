import { created, fail, requireAdmin } from "@/server/http";
import { addTrackToReleaseDraft } from "@/server/release-management/releaseManagementService";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireAdmin(request);
    const { id } = await params;
    return created(addTrackToReleaseDraft(id));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid track creation request", 400);
  }
}
