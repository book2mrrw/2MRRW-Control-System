import { fail, ok, parseJson, requireAdmin } from "@/server/http";
import { bulkUpdateReleaseDrafts } from "@/server/release-management/releaseManagementService";
import { z } from "zod";

const bulkSchema = z.object({
  releaseIds: z.array(z.string().min(1)).min(1),
  action: z.enum(["archive", "tag", "publish_visibility", "private_visibility"]),
  tags: z.array(z.string()).optional()
});

export async function POST(request: Request) {
  try {
    requireAdmin(request);
    return ok(bulkUpdateReleaseDrafts(await parseJson(request, bulkSchema)));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid bulk action request", 400);
  }
}
