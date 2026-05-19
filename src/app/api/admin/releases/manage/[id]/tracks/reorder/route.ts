import { fail, ok, parseJson, requireAdmin } from "@/server/http";
import { reorderReleaseTracks } from "@/server/release-management/releaseManagementService";
import { z } from "zod";

const reorderSchema = z.object({
  trackIds: z.array(z.string().min(1)).min(1)
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireAdmin(request);
    const { id } = await params;
    const { trackIds } = await parseJson(request, reorderSchema);
    return ok(reorderReleaseTracks(id, trackIds));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid track reorder request", 400);
  }
}
