import { buildReleasePrimaryAsset } from "@/lib/media/releasePrimaryAsset";
import { getLatestReleasesDurable } from "@/server/releases/releaseReadService";
import { publicPathToUrl } from "@/server/media/catalogMediaUrl";
import { fail, ok } from "@/server/http";

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

function enrichPublicAsset(asset: { sourcePath?: string | null; publicUrl?: string | null } | null | undefined) {
  if (!asset) return asset;
  const sourcePath = asset.sourcePath;
  if (!sourcePath) return asset;
  const publicUrl = publicPathToUrl(sourcePath);
  return publicUrl ? { ...asset, publicUrl } : asset;
}

function enrichPublicRelease(release: Awaited<ReturnType<typeof getLatestReleasesDurable>>[number], apiBase: string) {
  const resolvedCover = release.artwork?.sourcePath ? publicPathToUrl(release.artwork.sourcePath) : null;
  const resolvedLoop = release.motionArtwork?.sourcePath ? publicPathToUrl(release.motionArtwork.sourcePath) : null;
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
  const tracks = Array.isArray(release.tracks)
    ? release.tracks.map((track) => ({
        ...track,
        csAudio: track.csAudio ?? null,
        csCover: track.csCover ?? null,
        csCoverType: track.csCoverType ?? "image",
        coverArtType: track.coverArtType ?? "image",
        hasCs: Boolean(track.csAudio || track.csCover),
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
    csAudio: release.csAudio ?? null,
    csCover: release.csCover ?? null,
    csCoverType: release.csCoverType ?? "image",
    hasCs: Boolean(release.csAudio || release.csCover) || tracks.some((t) => t.hasCs),
    coverArtType: release.coverArtType ?? "image",
    status: release.status === "published" ? "published" : release.status,
    coverUrl,
    loopUrl,
    primaryAsset,
    tracks,
    artwork: enrichPublicAsset(release.artwork),
    motionArtwork: enrichPublicAsset(release.motionArtwork)
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? 100);
  const apiBase = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://2mrrw-control-system.vercel.app";
  const boundedLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 100;
  const releases = await Promise.race([
    getLatestReleasesDurable({ limit: boundedLimit }),
    new Promise<Awaited<ReturnType<typeof getLatestReleasesDurable>>>((resolve) => {
      setTimeout(() => resolve([]), 5_000);
    })
  ]);
  if (!releases.length) {
    const unavailable = fail("Catalog temporarily unavailable. Retry shortly.", 503, {
      reason: "catalog_unavailable",
      demoFallbackDisabled: true
    });
    publicReadCorsHeaders(request).forEach((value, key) => {
      unavailable.headers.set(key, value);
    });
    return unavailable;
  }
  const publishedOnly = releases.filter((release) => release.status === "published");
  const enriched = publishedOnly.map((release) => enrichPublicRelease(release, apiBase));
  return ok({ releases: enriched, count: enriched.length }, { headers: publicReadCorsHeaders(request) });
}
