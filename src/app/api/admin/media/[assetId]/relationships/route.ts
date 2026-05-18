import { fail, ok, requireAdmin } from "@/server/http";
import { getMediaRelationshipGraph } from "@/server/media/mediaAssetService";

export async function GET(request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  try {
    requireAdmin(request);
    const { assetId } = await params;
    return ok(getMediaRelationshipGraph(assetId));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid media relationship request", 400);
  }
}
