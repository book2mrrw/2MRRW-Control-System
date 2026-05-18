import { getAccountState } from "@/server/account/accountStateService";
import { artists, mediaAssets, releases, tracks } from "@/server/data/seedData";
import { recordStreamAnalytics } from "@/server/analytics/analyticsService";
import {
  buildReleaseMediaObject,
  type MediaAssetContract,
  type ReleaseMediaObject
} from "@/server/media/mediaObjects";
import { markRecentlyPlayed, updatePlaybackProgress } from "@/server/playback/playbackService";
import {
  createReleaseDraft,
  getReadinessSummary,
  getReleaseDraft,
  type ReleaseManagementDraft
} from "@/server/release-management/releaseManagementService";
import { recordReleaseActivity, recordReleaseRevision } from "@/server/release-management/releaseLifecycleService";
import type { Release, Track } from "@/server/types";

// Shared sync-layer catalog: admin write services publish into this central state,
// and public read services render from it through normalized media objects.
type PublishedCatalogRelease = Release & {
  status: "published" | "scheduled";
  scheduledPublishAt?: string;
};

export type PublicReleaseType = NonNullable<Release["releaseType"]>;

type CatalogMediaAsset = {
  id: string;
  bucket: string;
  path: string;
  ownerType: string;
  ownerId: string;
  access: string;
};

type PublishedDraftRecord = {
  release: PublishedCatalogRelease;
  tracks: Track[];
  mediaAssets: CatalogMediaAsset[];
  publishedAt: string;
};

export type PublishReleaseResult =
  | {
      ok: true;
      release: ReleaseMediaObject;
      status: "published" | "scheduled";
      publishedAt: string;
    }
  | {
      ok: false;
      releaseId: string;
      message: string;
      checks: ReturnType<typeof getReadinessSummary>["checks"];
    };

export type PlaybackEventInput = {
  trackId: string;
  releaseId?: string;
  eventType: "play" | "pause" | "progress" | "complete" | "skip";
  positionSeconds?: number;
  listenedSeconds?: number;
  durationSeconds?: number;
  countryCode?: string;
  sessionId: string;
};

const publishedDrafts = new Map<string, PublishedDraftRecord>();

function nowIso() {
  return new Date().toISOString();
}

function isVisibleRelease(release: PublishedCatalogRelease) {
  if (release.status === "published") {
    return true;
  }

  return Boolean(release.scheduledPublishAt && release.scheduledPublishAt <= nowIso());
}

function getSeedCatalogRows() {
  return releases.filter((release) => release.published).map((release) => ({
    release: {
      ...release,
      status: "published" as const
    },
    tracks: tracks.filter((track) => track.releaseId === release.id),
    mediaAssets: [...mediaAssets].filter((asset) => asset.ownerId === release.id || tracks.some((track) => track.releaseId === release.id && asset.ownerId === track.id))
  }));
}

function getPublishedDraftRows() {
  return [...publishedDrafts.values()].map((row) => ({
    release: row.release,
    tracks: row.tracks,
    mediaAssets: row.mediaAssets
  }));
}

function getCatalogRows({ includeUnpublished = false } = {}) {
  return [...getSeedCatalogRows(), ...getPublishedDraftRows()].filter((row) => {
    return includeUnpublished || isVisibleRelease(row.release);
  });
}

function matchesReleaseType(row: ReturnType<typeof getCatalogRows>[number], releaseType?: PublicReleaseType) {
  if (!releaseType) return true;
  return row.release.releaseType === releaseType;
}

function toReleaseObject(row: ReturnType<typeof getCatalogRows>[number], userId?: string) {
  const account = userId ? getAccountState(userId) : null;

  return buildReleaseMediaObject({
    release: row.release,
    artist: artists.find((artist) => artist.id === row.release.artistId) ?? null,
    tracks: row.tracks,
    mediaAssets: row.mediaAssets,
    permissions: account?.permissions,
    savedReleaseIds: account?.library.savedReleaseIds,
    playback: account?.playback
  });
}

function draftToCatalog(draft: ReleaseManagementDraft, status: "published" | "scheduled"): PublishedDraftRecord {
  const releaseDate = draft.scheduledPublishAt?.slice(0, 10) ?? nowIso().slice(0, 10);
  const catalogTracks: Track[] = draft.tracks.map((track) => ({
    id: track.id,
    releaseId: draft.id,
    title: track.title,
    durationSeconds: 0,
    mediaAssetId: `asset_full_${track.id}`,
    position: track.position
  }));
  const catalogMediaAssets: CatalogMediaAsset[] = [
    {
      id: `asset_artwork_${draft.id}`,
      bucket: "protected-media",
      path: `artwork/${draft.slug}/cover.jpg`,
      ownerType: "release",
      ownerId: draft.id,
      access: "public"
    },
    ...catalogTracks.flatMap((track) => [
      {
        id: `asset_preview_${track.id}`,
        bucket: "protected-media",
        path: `previews/${draft.slug}/${track.position}.mp3`,
        ownerType: "track",
        ownerId: track.id,
        access: "public"
      },
      {
        id: track.mediaAssetId,
        bucket: "protected-media",
        path: `masters/${draft.slug}/${track.position}.wav`,
        ownerType: "track",
        ownerId: track.id,
        access: "entitled"
      },
      ...(draft.lyricsState === "not_required"
        ? []
        : [
            {
              id: `asset_lyrics_${track.id}`,
              bucket: "protected-media",
              path: `lyrics/${draft.slug}/${track.position}.txt`,
              ownerType: "track",
              ownerId: track.id,
              access: "entitled"
            }
          ])
    ])
  ];

  return {
    release: {
      id: draft.id,
      slug: draft.slug,
      title: draft.title,
      artistId: draft.artistId,
      releaseDate,
      releaseType: draft.releaseType,
      published: status === "published",
      coverAssetId: `asset_artwork_${draft.id}`,
      status,
      scheduledPublishAt: draft.scheduledPublishAt
    },
    tracks: catalogTracks,
    mediaAssets: catalogMediaAssets,
    publishedAt: nowIso()
  };
}

export function createRelease(input: Parameters<typeof createReleaseDraft>[0]) {
  return createReleaseDraft(input);
}

export function listReleases({
  includeUnpublished = false,
  userId,
  releaseType
}: { includeUnpublished?: boolean; userId?: string; releaseType?: PublicReleaseType } = {}) {
  return getCatalogRows({ includeUnpublished })
    .filter((row) => matchesReleaseType(row, releaseType))
    .map((row) => toReleaseObject(row, userId));
}

export function getLatestReleases({ limit = 12, userId, releaseType }: { limit?: number; userId?: string; releaseType?: PublicReleaseType } = {}) {
  return listReleases({ userId, releaseType })
    .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate))
    .slice(0, limit);
}

export function getReleaseBySlug(slug: string, { userId }: { userId?: string } = {}) {
  const row = getCatalogRows().find((releaseRow) => releaseRow.release.slug === slug);
  return row ? toReleaseObject(row, userId) : null;
}

export function getUserLibrary(userId: string) {
  const account = getAccountState(userId);
  const visibleRows = getCatalogRows();
  const savedTrackIds = new Set(account.library.savedTrackIds);

  return {
    savedTrackIds: account.library.savedTrackIds,
    savedReleaseIds: account.library.savedReleaseIds,
    purchasedProductIds: account.library.purchasedProductIds,
    releases: visibleRows
      .filter((row) => account.library.savedReleaseIds.includes(row.release.id))
      .map((row) => toReleaseObject(row, userId)),
    tracks: visibleRows
      .flatMap((row) => toReleaseObject(row, userId).tracks)
      .filter((track) => savedTrackIds.has(track.id))
  };
}

export function getMediaObjectsForRelease(slug: string, userId?: string) {
  return getReleaseBySlug(slug, { userId });
}

export function getMediaAssetListForRelease(slug: string): MediaAssetContract[] {
  const release = getReleaseBySlug(slug);
  if (!release) {
    return [];
  }

  return [
    ...(release.artwork ? [release.artwork] : []),
    ...release.tracks.flatMap((track) => Object.values(track.assets).filter((asset): asset is MediaAssetContract => Boolean(asset)))
  ];
}

export function trackPlaybackEvent(userId: string, input: PlaybackEventInput) {
  const progress =
    typeof input.positionSeconds === "number"
      ? updatePlaybackProgress(userId, {
          trackId: input.trackId,
          positionSeconds: input.positionSeconds,
          sessionId: input.sessionId
        })
      : null;

  if (input.eventType === "play" || input.eventType === "complete") {
    markRecentlyPlayed(userId, input.trackId);
  }

  const analytics =
    typeof input.listenedSeconds === "number"
      ? recordStreamAnalytics(userId, {
          trackId: input.trackId,
          releaseId: input.releaseId,
          listenedSeconds: input.listenedSeconds,
          countryCode: input.countryCode
        })
      : null;

  return {
    userId,
    trackId: input.trackId,
    releaseId: input.releaseId,
    eventType: input.eventType,
    progress,
    analytics,
    recordedAt: nowIso()
  };
}

export function upsertRelease(input: {
  id?: string;
  slug: string;
  title: string;
  artistId?: string;
  releaseDate?: string;
  releaseType?: PublicReleaseType;
  published?: boolean;
}) {
  const existing = input.id ? releases.find((release) => release.id === input.id) : null;

  if (existing) {
    existing.slug = input.slug;
    existing.title = input.title;
    existing.artistId = input.artistId ?? existing.artistId;
    existing.releaseDate = input.releaseDate ?? existing.releaseDate;
    existing.releaseType = input.releaseType ?? existing.releaseType;
    existing.published = input.published ?? existing.published;
    return existing;
  }

  const release = {
    id: `rel_${input.slug.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}`,
    slug: input.slug,
    title: input.title,
    artistId: input.artistId ?? "artist_2mrrw",
    releaseDate: input.releaseDate ?? nowIso().slice(0, 10),
    releaseType: input.releaseType,
    published: input.published ?? false,
    coverAssetId: "asset_cover_afterhours"
  };
  releases.push(release);
  return release;
}

export function publishRelease(id: string): PublishReleaseResult | null {
  const draft = getReleaseDraft(id);
  if (draft) {
    const readiness = getReadinessSummary(id);
    if (!readiness.ready) {
      return {
        ok: false,
        releaseId: id,
        message: "Release is not ready to publish",
        checks: readiness.checks
      };
    }

    const status = draft.scheduledPublishAt && draft.scheduledPublishAt > nowIso() ? "scheduled" : "published";
    draft.status = status;
    draft.visibilityState = status === "scheduled" ? "scheduled" : "public";
    draft.readinessState = "ready_for_review";
    draft.updatedAt = nowIso();
    recordReleaseRevision({
      releaseId: id,
      kind: "status_change",
      label: status === "scheduled" ? "Release scheduled" : "Release published",
      after: { status, visibilityState: draft.visibilityState, scheduledPublishAt: draft.scheduledPublishAt }
    });
    recordReleaseActivity({
      releaseId: id,
      kind: "processing",
      message: status === "scheduled" ? "Publishing release queued for schedule" : "Publishing release completed"
    });

    const record = draftToCatalog(draft, status);
    publishedDrafts.set(id, record);
    return {
      ok: true,
      release: toReleaseObject(record),
      status,
      publishedAt: record.publishedAt
    };
  }

  const release = releases.find((item) => item.id === id);
  if (!release) {
    return null;
  }

  release.published = true;
  const row = getCatalogRows({ includeUnpublished: true }).find((releaseRow) => releaseRow.release.id === id);
  return row
    ? {
        ok: true,
        release: toReleaseObject(row),
        status: "published",
        publishedAt: nowIso()
      }
    : null;
}
