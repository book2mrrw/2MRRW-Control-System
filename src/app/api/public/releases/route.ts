import { buildReleasePrimaryAsset } from "@/lib/media/releasePrimaryAsset";
import { getLatestReleasesDurable } from "@/server/releases/releaseReadService";
import { resolveCatalogMediaUrl } from "@/server/media/catalogMediaUrl";
import { ok } from "@/server/http";

const PUBLIC_FRONTEND_ORIGINS = new Set([
  "https://2mrrw.com",
  "https://www.2mrrw.com",
  "https://artist-platform-silk.vercel.app",
  "https://2mrrw-official.vercel.app"
]);

function publicReadCorsHeaders(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  const headers = new Headers({
    Vary: "Origin",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  if (origin && (PUBLIC_FRONTEND_ORIGINS.has(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin))) {
    headers.set("Access-Control-Allow-Origin", origin);
  }
  return headers;
}

export function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: publicReadCorsHeaders(request) });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? 100);
  const apiBase = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://2-mrrw-control-system.vercel.app";
  const releases = await getLatestReleasesDurable({ limit: Number.isFinite(limit) ? limit : 100 });
  const enriched = await Promise.all(
    releases.map(async (release) => {
      const resolvedCover = release.artwork
        ? await resolveCatalogMediaUrl(release.artwork.assetId, release.artwork.sourcePath, { publicKinds: ["artwork", "loop"] })
        : null;
      const resolvedLoop = release.motionArtwork
        ? await resolveCatalogMediaUrl(release.motionArtwork.assetId, release.motionArtwork.sourcePath, { publicKinds: ["artwork", "loop"] })
        : null;
      const coverUrl =
        resolvedCover ?? (release.artwork?.signedUrlEndpoint ? `${apiBase}${release.artwork.signedUrlEndpoint}` : null);
      const loopUrl =
        resolvedLoop ??
        (release.motionArtwork?.signedUrlEndpoint ? `${apiBase}${release.motionArtwork.signedUrlEndpoint}` : null);
      const primaryAsset = buildReleasePrimaryAsset({
        slug: release.slug,
        releaseType: release.releaseType,
        releaseCategory: release.releaseCategory,
        loopUrl,
        motionUrl: loopUrl,
        coverUrl: resolvedCover && !loopUrl ? resolvedCover : null,
        posterUrl: resolvedCover
      });
      return {
        ...release,
        coverUrl,
        loopUrl,
        primaryAsset
      };
    })
  );
  return ok({ releases: enriched, count: enriched.length }, { headers: publicReadCorsHeaders(request) });
}
