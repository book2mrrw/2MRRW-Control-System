import "server-only";

import { fetchDurableReleaseCatalog, type CatalogRelease } from "@/server/catalog/releaseCatalogService";
import { upsertImportedMediaAsset, type MediaUploadCategory } from "@/server/media/uploadIntentService";
import { getServerSupabase } from "@/server/supabase/client";
import { listReleaseDrafts, upsertImportedReleaseDraft } from "@/server/release-management/releaseManagementService";
import type { ReleaseManagementStatus, ReleaseType, UploadReadinessState } from "@/server/release-management/taxonomies";

function isMotionPath(path: string) {
  return /\.(mp4|mov|webm)(\?|#|$)/i.test(path);
}

function isPreviewPath(path: string) {
  return /preview/i.test(path);
}

function isMasterPath(path: string) {
  return /masters\//i.test(path) || /full[-_]?audio/i.test(path);
}

function mediaCategoryForPath(path: string, ownerType: string): MediaUploadCategory {
  if (isMotionPath(path)) return "single_cover_art";
  if (ownerType === "track") {
    if (isPreviewPath(path)) return "audio_preview";
    if (isMasterPath(path)) return "audio_full_song";
    return "track_audio";
  }
  return "single_cover_art";
}

function mediaTypeForPath(path: string) {
  if (isMotionPath(path)) return "video" as const;
  if (/\.(wav|mp3|aiff|flac|aac|m4a)(\?|#|$)/i.test(path)) return "audio" as const;
  return "image" as const;
}

function mapReleaseStatus(status: string): ReleaseManagementStatus {
  const allowed: ReleaseManagementStatus[] = [
    "draft",
    "metadata_incomplete",
    "assets_pending",
    "rights_pending",
    "ready_for_review",
    "scheduled",
    "published",
    "archived"
  ];
  return allowed.includes(status as ReleaseManagementStatus) ? (status as ReleaseManagementStatus) : "published";
}

function frontendSectionsForReleaseType(releaseType: ReleaseType) {
  if (releaseType === "single") return ["latest_singles", "music_singles"];
  if (releaseType === "feature") return ["features", "music_features"];
  if (releaseType === "ep") return ["eps", "music_eps"];
  return ["albums", "music_albums"];
}

function mapUploadState(value?: string | null): UploadReadinessState {
  if (value === "uploaded" || value === "approved" || value === "partial" || value === "rejected") {
    return value;
  }
  return "missing";
}

export function hydrateDraftFromCatalogRelease(release: CatalogRelease) {
  const sections = frontendSectionsForReleaseType(release.releaseType);
  const sourceKey = `supabase:release:${release.id}`;

  const tracks = release.tracks.map((track) => {
    const previewPath = track.previewAsset?.storagePath;
    const fullPath = track.audioAsset?.storagePath;
    const audioState = mapUploadState(track.audioState);
    return {
      id: track.id,
      title: track.title,
      position: track.position,
      audioFile: fullPath ?? previewPath,
      previewAudioFile: previewPath,
      fullAudioFile: fullPath,
      audioState: audioState === "missing" && (fullPath || previewPath) ? ("uploaded" as const) : audioState
    };
  });

  upsertImportedReleaseDraft({
    id: release.id,
    slug: release.slug,
    title: release.title,
    artistName: release.artistName,
    releaseType: release.releaseType,
    status: mapReleaseStatus(release.status),
    visibilityState: release.status === "published" ? "public" : release.status === "scheduled" ? "scheduled" : "draft",
    originalReleaseDate: release.releaseDate ?? release.publishedAt?.slice(0, 10),
    scheduledPublishAt: release.scheduledPublishAt ?? undefined,
    timezone: release.publishTimezone ?? undefined,
    tracks,
    tags: ["frontend-import", "supabase-catalog"],
    coverArtPath: release.coverArt?.storagePath,
    motionArtworkPath: release.backgroundLoop?.storagePath ?? release.musicVideo?.storagePath,
    frontendSections: sections,
    sourceKey,
    metadataNotes: JSON.stringify({
      source: "supabase_catalog",
      sourceKey,
      releaseCategory: release.releaseCategory,
      ingestionRef: release.ingestionRef,
      publishedAt: release.publishedAt
    })
  });

  let mediaHydrated = 0;
  for (const link of release.releaseMedia) {
    const asset = link.asset;
    if (!asset?.storagePath) continue;
    const trackId = link.trackId ?? (asset.ownerType === "track" ? asset.ownerId : tracks[0]?.id);
    upsertImportedMediaAsset({
      id: asset.id,
      category: mediaCategoryForPath(asset.storagePath, asset.ownerType),
      releaseId: release.id,
      trackId,
      path: asset.storagePath,
      sourcePath: asset.storagePath,
      mediaType: mediaTypeForPath(asset.storagePath)
    });
    mediaHydrated += 1;
  }

  for (const track of release.tracks) {
    for (const asset of [track.audioAsset, track.previewAsset]) {
      if (!asset) continue;
      upsertImportedMediaAsset({
        id: asset.id,
        category: mediaCategoryForPath(asset.storagePath, asset.ownerType),
        releaseId: release.id,
        trackId: track.id,
        path: asset.storagePath,
        sourcePath: asset.storagePath,
        mediaType: mediaTypeForPath(asset.storagePath)
      });
      mediaHydrated += 1;
    }
  }

  return mediaHydrated;
}

export type ReleaseCatalogHydrationResult = {
  hydrated: boolean;
  releases: number;
  tracks: number;
  mediaAssets: number;
  message: string;
};

export async function hydrateReleaseManagementFromSupabase(): Promise<ReleaseCatalogHydrationResult> {
  const supabase = getServerSupabase();
  if (!supabase) {
    return { hydrated: false, releases: 0, tracks: 0, mediaAssets: 0, message: "Supabase is not configured." };
  }

  const catalog = await fetchDurableReleaseCatalog();
  if (!catalog.length) {
    return { hydrated: false, releases: 0, tracks: 0, mediaAssets: 0, message: "No releases found in Supabase." };
  }

  let mediaHydrated = 0;
  let trackCount = 0;
  for (const release of catalog) {
    trackCount += release.tracks.length;
    mediaHydrated += hydrateDraftFromCatalogRelease(release);
  }

  return {
    hydrated: true,
    releases: catalog.length,
    tracks: trackCount,
    mediaAssets: mediaHydrated,
    message: `Hydrated ${catalog.length} releases from Supabase relational catalog.`
  };
}

export async function ensureReleaseCatalogHydrated() {
  return hydrateReleaseManagementFromSupabase();
}

export function listHydratedMediaGroups() {
  const drafts = listReleaseDrafts().filter((draft) => draft.tags.includes("frontend-import") || draft.tags.includes("supabase-catalog"));
  return drafts.map((draft) => ({
    releaseId: draft.id,
    slug: draft.slug,
    title: draft.title,
    releaseType: draft.releaseType,
    status: draft.status,
    coverArtPath: draft.coverArtPath,
    motionArtworkPath: draft.motionArtworkPath,
    trackCount: draft.tracks.length,
    frontendSections: draft.frontendSyncTargets
  }));
}
