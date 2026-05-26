import { fail, ok } from "@/server/http";
import { getMediaAssetListForReleaseDurable, getMediaObjectsForReleaseDurable } from "@/server/releases/releaseReadService";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const release = await getMediaObjectsForReleaseDurable(slug);
  const assets = await getMediaAssetListForReleaseDurable(slug);
  if (!release && assets.length === 0) {
    return fail("Release media not found", 404);
  }
  if (!release) {
    return ok(assets);
  }
  return ok({
    ...release,
    csAudio: release.csAudio ?? null,
    csCover: release.csCover ?? null,
    hasCs: Boolean(release.csAudio),
    assets
  });
}
