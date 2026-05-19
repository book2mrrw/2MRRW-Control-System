import { fail, ok, requireStudioAccess } from "@/server/http";
import {
  ensureDraftHydratedFromCatalog,
  getReadinessSummary
} from "@/server/release-management/releaseManagementService";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireStudioAccess(request);
    const { id } = await params;
    await ensureDraftHydratedFromCatalog(id);
    return ok(getReadinessSummary(id));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid readiness request", 400);
  }
}
