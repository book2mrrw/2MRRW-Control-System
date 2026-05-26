import "server-only";

import { buildReleasePrimaryAsset } from "@/lib/media/releasePrimaryAsset";
import { slugMotionPublicUrl } from "@/lib/media/frontendMediaFallbacks";
import { detectMediaKind, isMotionMedia } from "@/lib/media/mediaVisual";
import { buildStudioCatalogFallback } from "@/server/catalog/studioCatalogFallback";
import { fetchDurableReleaseCatalog } from "@/server/catalog/releaseCatalogService";
import { deriveReleaseLiveStatus, fetchCatalogSyncState } from "@/server/catalog/releaseLiveStatusEngine";
import { assertSupabaseServiceRoleKeyConfigured } from "@/server/supabase/client";
import { publicPathToUrl } from "@/server/media/catalogMediaUrl";
import type { CatalogRelease } from "@/server/catalog/releaseCatalogService";
import type { DurableCatalogRelease } from "@/services/catalog/controlCatalogClient";

const CATALOG_FETCH_BUDGET_MS = 5_000;
const DEFAULT_CATALOG_LIMIT = 50;

function pickStillCoverAsset(release: CatalogRelease) {
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

function pickLoopAsset(release: CatalogRelease) {
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

/** Stabilization: cover/loop via public fallbacks only — no per-asset signing in bulk build. */
function resolveReleaseMediaPublic(release: CatalogRelease) {
  const stillAsset = pickStillCoverAsset(release);
  const loopAsset = pickLoopAsset(release);
  const stillUrl = stillAsset?.storagePath ? publicPathToUrl(stillAsset.storagePath) : null;
  const loopUrl = loopAsset?.storagePath ? publicPathToUrl(loopAsset.storagePath) : null;
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

export async function buildControlCatalogPayload(options?: {
  limit?: number;
  offset?: number;
}): Promise<DurableCatalogRelease[]> {
  console.log("[stabilize] buildControlCatalogPayload start");
  const started = Date.now();
  const catalogLimit = options?.limit ?? DEFAULT_CATALOG_LIMIT;
  const catalogOffset = options?.offset ?? 0;
  void assertSupabaseServiceRoleKeyConfigured();
  const [catalog, syncRows] = await Promise.all([
    Promise.race([
      fetchDurableReleaseCatalog({ limit: catalogLimit, offset: catalogOffset }),
      new Promise<Awaited<ReturnType<typeof fetchDurableReleaseCatalog>>>((resolve) => {
        setTimeout(() => resolve([]), CATALOG_FETCH_BUDGET_MS);
      })
    ]),
    Promise.race([
      fetchCatalogSyncState(),
      new Promise<Awaited<ReturnType<typeof fetchCatalogSyncState>>>((resolve) => {
        setTimeout(() => resolve([]), CATALOG_FETCH_BUDGET_MS);
      })
    ])
  ]);
  if (!catalog.length) {
    const fallback = buildStudioCatalogFallback();
    console.log("[stabilize] buildControlCatalogPayload using studio fallback", { releases: fallback.length });
    return fallback;
  }
  const payload = catalog.map((release) => {
    const media = resolveReleaseMediaPublic(release);
    const coverAsset = release.coverArt;
    const loopAsset = release.backgroundLoop;
    const cardSrc = media.primaryAsset?.src ?? media.motionUrl ?? media.loopUrl ?? media.posterUrl;
    const live = deriveReleaseLiveStatus(
      {
        id: release.id,
        slug: release.slug,
        status: release.status,
        releaseType: release.releaseType,
        scheduledPublishAt: release.scheduledPublishAt,
        scheduleLastError: release.scheduleLastError,
        publishedAt: release.publishedAt,
        coverUrl: cardSrc,
        coverAssetId: coverAsset?.id ?? loopAsset?.id ?? null,
        tracks: release.tracks.map((track) => ({
          audioAssetId: track.audioAsset?.id ?? track.audioAssetId,
          audioUrl: null,
          audioState: track.audioState
        })),
        releaseMedia: release.releaseMedia.map((link) => ({
          assetRole: link.assetRole,
          isPrimary: link.isPrimary,
          frontendRoute: link.frontendRoute,
          syncTarget: link.syncTarget,
          frontendDestinations: link.frontendDestinations
        }))
      },
      syncRows
    );

    return {
      id: release.id,
      slug: release.slug,
      title: release.title,
      artistName: release.artistName,
      releaseDate: release.releaseDate,
      releaseType: release.releaseType,
      releaseCategory: release.releaseCategory,
      status: release.status,
      scheduledPublishAt: release.scheduledPublishAt,
      publishTimezone: release.publishTimezone,
      releaseTime: release.releaseTime,
      scheduleLastError: release.scheduleLastError,
      liveStatus: live.liveStatus,
      liveStatusReasons: live.liveStatusReasons,
      updatedAt: live.updatedAt ?? release.publishedAt ?? release.releaseDate ?? null,
      coverAssetId: coverAsset?.id ?? null,
      coverUrl: media.posterUrl ?? media.coverUrl,
      loopAssetId: loopAsset?.id ?? null,
      loopUrl: media.motionUrl ?? media.loopUrl,
      motionUrl: media.motionUrl ?? media.loopUrl,
      posterUrl: media.posterUrl,
      primaryAsset: media.primaryAsset,
      tracks: release.tracks.map((track) => ({
        id: track.id,
        title: track.title,
        position: track.position,
        durationSeconds: track.durationSeconds,
        audioState: track.audioState,
        previewAssetId: track.previewAsset?.id ?? track.previewAssetId,
        audioAssetId: track.audioAsset?.id ?? track.audioAssetId,
        previewUrl: null,
        audioUrl: null,
        lyricsText: track.lyricsText ?? null,
        lyricsMode: track.lyricsMode ?? "static",
        csCover: track.csCover ?? null,
        csCoverType: track.csCoverType ?? "image",
        csAudio: track.csAudio ?? null,
        hasCs: Boolean(track.csAudio || track.csCover)
      })),
      releaseMedia: release.releaseMedia.map((link) => ({
        id: link.id,
        assetRole: link.assetRole,
        isPrimary: link.isPrimary,
        storagePath: link.asset?.storagePath ?? "",
        mediaAssetId: link.mediaAssetId,
        trackId: link.trackId,
        version: link.version,
        mediaSection: link.mediaSection ?? null,
        frontendRoute: link.frontendRoute ?? null,
        syncTarget: link.syncTarget ?? null,
        cacheGroup: link.cacheGroup ?? null,
        frontendDestinations: link.frontendDestinations ?? []
      })),
      credits: release.credits,
      distribution: release.distribution
    } satisfies DurableCatalogRelease;
  });
  console.log("[stabilize] buildControlCatalogPayload done", {
    releases: payload.length,
    ms: Date.now() - started
  });
  return payload;
}
