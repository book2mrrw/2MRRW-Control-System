import "server-only";

import { buildReleasePrimaryAsset, type ReleasePrimaryAsset } from "@/lib/media/releasePrimaryAsset";
import { detectMediaKind, isMotionMedia } from "@/lib/media/mediaVisual";
import { slugMotionPublicFallbackUrl } from "@/server/media/artworkPublicFallback";
import { resolveCatalogMediaUrl } from "@/server/media/catalogMediaUrl";
import type { CatalogMediaAsset, CatalogReleaseMedia } from "@/server/catalog/releaseCatalogService";

export type ResolvedReleaseMedia = {
  coverUrl: string | null;
  loopUrl: string | null;
  posterUrl: string | null;
  primaryAsset: ReleasePrimaryAsset | null;
};

type CatalogReleaseSlice = {
  slug: string;
  coverArt?: CatalogMediaAsset | null;
  backgroundLoop?: CatalogMediaAsset | null;
  musicVideo?: CatalogMediaAsset | null;
  releaseMedia: CatalogReleaseMedia[];
};

function pickCoverAsset(release: CatalogReleaseSlice) {
  const link =
    release.releaseMedia.find(
      (row) => row.isActive && row.isPrimary && (row.assetRole === "cover_art" || row.assetRole === "cover")
    ) ??
    release.releaseMedia.find((row) => row.isActive && (row.assetRole === "cover_art" || row.assetRole === "cover"));
  return release.coverArt ?? link?.asset ?? null;
}

function pickLoopAsset(release: CatalogReleaseSlice) {
  const motionLink = release.releaseMedia.find(
    (row) => row.isActive && row.asset?.storagePath && isMotionMedia(row.asset.storagePath)
  );
  const link =
    release.releaseMedia.find((row) => row.isActive && row.assetRole === "background_loop") ?? motionLink;
  return release.backgroundLoop ?? link?.asset ?? release.musicVideo ?? motionLink?.asset ?? null;
}

/** Prefer still image for poster (never an mp4 path). */
function pickPosterAsset(release: CatalogReleaseSlice, coverAsset: CatalogMediaAsset | null, loopAsset: CatalogMediaAsset | null) {
  if (coverAsset?.storagePath && !isMotionMedia(coverAsset.storagePath)) {
    return coverAsset;
  }
  const stillLink = release.releaseMedia.find(
    (row) =>
      row.isActive &&
      row.asset?.storagePath &&
      !isMotionMedia(row.asset.storagePath) &&
      (row.assetRole === "cover_art" || row.assetRole === "cover")
  );
  if (stillLink?.asset) return stillLink.asset;
  if (loopAsset?.storagePath && detectMediaKind(loopAsset.storagePath) === "image") {
    return loopAsset;
  }
  return coverAsset && !isMotionMedia(coverAsset.storagePath) ? coverAsset : null;
}

export async function resolveReleasePrimaryAssetForCatalog(
  release: CatalogReleaseSlice
): Promise<ResolvedReleaseMedia> {
  const coverAsset = pickCoverAsset(release);
  const loopAsset = pickLoopAsset(release);
  const posterAsset = pickPosterAsset(release, coverAsset, loopAsset);

  const [coverUrl, loopUrl, posterUrl] = await Promise.all([
    resolveCatalogMediaUrl(coverAsset?.id, coverAsset?.storagePath, { publicKinds: ["artwork", "loop"] }),
    resolveCatalogMediaUrl(loopAsset?.id, loopAsset?.storagePath, { publicKinds: ["artwork", "loop"] }),
    resolveCatalogMediaUrl(posterAsset?.id, posterAsset?.storagePath, { publicKinds: ["artwork", "loop"] })
  ]);

  let resolvedLoopUrl = loopUrl;
  if (!resolvedLoopUrl || !isMotionMedia(resolvedLoopUrl)) {
    const slugMotion = slugMotionPublicFallbackUrl(release.slug);
    if (slugMotion) resolvedLoopUrl = slugMotion;
  }

  const resolvedPoster = posterUrl && !isMotionMedia(posterUrl) ? posterUrl : null;
  let primaryAsset = buildReleasePrimaryAsset({
    slug: release.slug,
    loopUrl: resolvedLoopUrl,
    coverUrl,
    posterUrl: resolvedPoster
  });

  if (!primaryAsset && resolvedLoopUrl) {
    primaryAsset = buildReleasePrimaryAsset({
      slug: release.slug,
      loopUrl: resolvedLoopUrl,
      coverUrl: resolvedPoster,
      posterUrl: resolvedPoster
    });
  }

  return {
    coverUrl,
    loopUrl: resolvedLoopUrl,
    posterUrl: resolvedPoster,
    primaryAsset
  };
}
