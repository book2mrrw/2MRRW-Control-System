import "server-only";

import { buildReleasePrimaryAsset, type ReleasePrimaryAsset } from "@/lib/media/releasePrimaryAsset";
import { slugMotionPublicUrl } from "@/lib/media/frontendMediaFallbacks";
import { detectMediaKind, isMotionMedia } from "@/lib/media/mediaVisual";
import { resolveCatalogMediaUrl } from "@/server/media/catalogMediaUrl";
import type { CatalogMediaAsset, CatalogReleaseMedia } from "@/server/catalog/releaseCatalogService";

export type ResolvedReleaseMedia = {
  /** Still image / poster only — never use alone for card render when motion exists */
  coverUrl: string | null;
  loopUrl: string | null;
  motionUrl: string | null;
  posterUrl: string | null;
  primaryAsset: ReleasePrimaryAsset | null;
};

type CatalogReleaseSlice = {
  slug: string;
  releaseType?: string | null;
  releaseCategory?: string | null;
  coverArt?: CatalogMediaAsset | null;
  backgroundLoop?: CatalogMediaAsset | null;
  musicVideo?: CatalogMediaAsset | null;
  releaseMedia: CatalogReleaseMedia[];
};

function pickStillCoverAsset(release: CatalogReleaseSlice) {
  const links = release.releaseMedia.filter(
    (row) =>
      row.isActive &&
      row.asset?.storagePath &&
      !isMotionMedia(row.asset.storagePath) &&
      (row.assetRole === "cover_art" || row.assetRole === "cover")
  );
  const primary = links.find((row) => row.isPrimary) ?? links[0];
  const cover = release.coverArt;
  if (cover?.storagePath && !isMotionMedia(cover.storagePath)) return cover;
  return primary?.asset ?? null;
}

function pickLoopAsset(release: CatalogReleaseSlice) {
  const motionLinks = release.releaseMedia.filter(
    (row) => row.isActive && row.asset?.storagePath && isMotionMedia(row.asset.storagePath)
  );
  const loopRole =
    motionLinks.find((row) => row.assetRole === "background_loop") ??
    motionLinks.find((row) => row.isPrimary) ??
    motionLinks[0];
  if (release.backgroundLoop?.storagePath) return release.backgroundLoop;
  if (loopRole?.asset) return loopRole.asset;
  if (release.musicVideo?.storagePath && isMotionMedia(release.musicVideo.storagePath)) {
    return release.musicVideo;
  }
  const motionCover = release.coverArt;
  if (motionCover?.storagePath && isMotionMedia(motionCover.storagePath)) return motionCover;
  return null;
}

export async function resolveReleasePrimaryAssetForCatalog(
  release: CatalogReleaseSlice
): Promise<ResolvedReleaseMedia> {
  const stillAsset = pickStillCoverAsset(release);
  const loopAsset = pickLoopAsset(release);

  const [stillUrl, loopUrl] = await Promise.all([
    resolveCatalogMediaUrl(stillAsset?.id, stillAsset?.storagePath, { publicKinds: ["artwork", "loop"] }),
    resolveCatalogMediaUrl(loopAsset?.id, loopAsset?.storagePath, { publicKinds: ["artwork", "loop"] })
  ]);

  let motionUrl = loopUrl && isMotionMedia(loopUrl) ? loopUrl : null;
  if (!motionUrl) {
    const slugMotion = slugMotionPublicUrl(release.slug, {
      releaseType: release.releaseType,
      releaseCategory: release.releaseCategory
    });
    if (slugMotion) motionUrl = slugMotion;
  }

  const posterUrl =
    stillUrl && !isMotionMedia(stillUrl)
      ? stillUrl
      : stillAsset?.storagePath && detectMediaKind(stillAsset.storagePath) === "image"
        ? stillUrl
        : null;

  const primaryAsset = buildReleasePrimaryAsset({
    slug: release.slug,
    releaseType: release.releaseType,
    releaseCategory: release.releaseCategory,
    loopUrl: motionUrl,
    motionUrl,
    coverUrl: posterUrl,
    posterUrl
  });

  return {
    coverUrl: posterUrl,
    loopUrl: motionUrl,
    motionUrl,
    posterUrl,
    primaryAsset
  };
}
