import { buildReleasePrimaryAsset } from "@/lib/media/releasePrimaryAsset";
import { corsPreflight, fail, getUserId, ok } from "@/server/http";
import { publicPathToUrl } from "@/server/media/catalogMediaUrl";
import { getReleaseBySlugDurable } from "@/server/releases/releaseReadService";

const PUBLIC_FRONTEND_ORIGINS = new Set([
  "https://2mrrw.com",
  "https://www.2mrrw.com",
  "https://artist-platform-silk.vercel.app",
  "https://2mrrw-official.vercel.app"
]);

function isAllowedPublicFrontendOrigin(origin: string) {
  if (PUBLIC_FRONTEND_ORIGINS.has(origin)) return true;
  if (/^https:\/\/artist-platform-silk-[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;
  if (/^https:\/\/2mrrw-official-[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

function enrichPublicAsset(asset: { sourcePath?: string | null; publicUrl?: string | null } | null | undefined) {
  if (!asset) return asset;
  const sourcePath = asset.sourcePath;
  if (!sourcePath) return asset;
  const publicUrl = publicPathToUrl(sourcePath);
  return publicUrl ? { ...asset, publicUrl } : asset;
}

function enrichReleaseDetail(release: NonNullable<Awaited<ReturnType<typeof getReleaseBySlugDurable>>>, apiBase: string) {
  const resolvedCover = release.artwork?.sourcePath ? publicPathToUrl(release.artwork.sourcePath) : null;
  const resolvedLoop = release.motionArtwork?.sourcePath ? publicPathToUrl(release.motionArtwork.sourcePath) : null;
  const coverUrl =
    resolvedCover ?? (release.artwork?.signedUrlEndpoint ? `${apiBase}${release.artwork.signedUrlEndpoint}` : null);
  const loopUrl =
    resolvedLoop ??
    (release.motionArtwork?.signedUrlEndpoint ? `${apiBase}${release.motionArtwork.signedUrlEndpoint}` : null);
  const tracks = Array.isArray(release.tracks)
    ? release.tracks.map((track) => ({
        ...track,
        assets: {
          preview: enrichPublicAsset(track.assets?.preview),
          full: track.assets?.full,
          loop: enrichPublicAsset(track.assets?.loop),
          lyrics: track.assets?.lyrics
        }
      }))
    : [];

  return {
    ...release,
    coverUrl,
    loopUrl,
    primaryAsset: buildReleasePrimaryAsset({
      slug: release.slug,
      releaseType: release.releaseType,
      releaseCategory: release.releaseCategory,
      loopUrl,
      motionUrl: loopUrl,
      coverUrl: resolvedCover && !loopUrl ? resolvedCover : null,
      posterUrl: resolvedCover
    }),
    tracks,
    artwork: enrichPublicAsset(release.artwork),
    motionArtwork: enrichPublicAsset(release.motionArtwork)
  };
}

function publicReadCorsHeaders(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  const headers = new Headers({
    Vary: "Origin",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-user-id"
  });

  if (origin && isAllowedPublicFrontendOrigin(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }

  return headers;
}

export async function OPTIONS(request: Request) {
  return corsPreflight(request);
}

function withPublicReadCors(response: Response, request: Request) {
  publicReadCorsHeaders(request).forEach((value, key) => {
    response.headers.set(key, value);
  });
  return response;
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const release = await getReleaseBySlugDurable(slug, { userId: getUserId(request) });
  if (!release || release.status !== "published") {
    return withPublicReadCors(fail("Release not found", 404), request);
  }
  const apiBase = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://2mrrw-control-system.vercel.app";
  return ok(enrichReleaseDetail(release, apiBase), { headers: publicReadCorsHeaders(request) });
}
