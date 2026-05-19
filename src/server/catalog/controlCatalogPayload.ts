import "server-only";

import { fetchDurableReleaseCatalog } from "@/server/catalog/releaseCatalogService";
import { deriveReleaseLiveStatus, fetchCatalogSyncState } from "@/server/catalog/releaseLiveStatusEngine";
import { hydrateReleaseManagementFromSupabase } from "@/server/release-management/releaseCatalogHydrationService";
import { resolveCatalogMediaUrl } from "@/server/media/catalogMediaUrl";
import { resolveReleasePrimaryAssetForCatalog } from "@/server/media/resolveReleasePrimaryAsset";
import type { DurableCatalogRelease } from "@/services/catalog/controlCatalogClient";

export async function buildControlCatalogPayload(): Promise<DurableCatalogRelease[]> {
  await hydrateReleaseManagementFromSupabase();
  const [catalog, syncRows] = await Promise.all([fetchDurableReleaseCatalog(), fetchCatalogSyncState()]);
  return Promise.all(
    catalog.map(async (release) => {
      const media = await resolveReleasePrimaryAssetForCatalog(release);
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
        tracks: await Promise.all(
          release.tracks.map(async (track) => ({
            id: track.id,
            title: track.title,
            position: track.position,
            durationSeconds: track.durationSeconds,
            audioState: track.audioState,
            previewAssetId: track.previewAsset?.id ?? track.previewAssetId,
            audioAssetId: track.audioAsset?.id ?? track.audioAssetId,
            previewUrl: await resolveCatalogMediaUrl(
              track.previewAsset?.id ?? track.previewAssetId,
              track.previewAsset?.storagePath,
              { publicKinds: ["preview"] }
            ),
            audioUrl: await resolveCatalogMediaUrl(
              track.audioAsset?.id ?? track.audioAssetId,
              track.audioAsset?.storagePath,
              { studioBypass: true }
            ),
            lyricsText: track.lyricsText ?? null
          }))
        ),
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
    })
  );
}
