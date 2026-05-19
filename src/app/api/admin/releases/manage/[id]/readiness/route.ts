import { fail, ok, requireStudioAccess } from "@/server/http";
import { getReadinessSummary } from "@/server/release-management/releaseManagementService";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireStudioAccess(request);
    const { id } = await params;
    return ok(getReadinessSummary(id));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid readiness request", 400);
  }
}
