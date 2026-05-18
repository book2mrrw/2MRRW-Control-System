import { fail, ok } from "@/server/http";
import { getMediaAssetListForReleaseDurable } from "@/server/releases/releaseReadService";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const assets = await getMediaAssetListForReleaseDurable(slug);
  return assets.length > 0 ? ok(assets) : fail("Release media not found", 404);
}
