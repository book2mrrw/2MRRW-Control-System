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
import { getServerSupabase } from "@/server/supabase/client";
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

type CatalogProduct = {
  id: string;
  slug: string;
  title: string;
  priceCents?: number | null;
  currency?: string | null;
};

type CatalogRow = {
  release: PublishedCatalogRelease;
  tracks: Track[];
  mediaAssets: CatalogMediaAsset[];
  artist?: {
    id: string;
    name: string;
    slug?: string;
  } | null;
  products?: CatalogProduct[];
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
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    mediaAssets: [...mediaAssets].filter((asset) => asset.ownerId === release.id || tracks.some((track) => track.releaseId === release.id && asset.ownerId === track.id)),
    artist: artists.find((artist) => artist.id === release.artistId) ?? null
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

function matchesReleaseType(row: CatalogRow, releaseType?: PublicReleaseType) {
  if (!releaseType) return true;
  return row.release.releaseType === releaseType;
}

function toReleaseObject(row: CatalogRow, userId?: string) {
  const account = userId ? getAccountState(userId) : null;

  return buildReleaseMediaObject({
    release: row.release,
    artist: row.artist ?? artists.find((artist) => artist.id === row.release.artistId) ?? null,
    tracks: row.tracks,
    mediaAssets: row.mediaAssets,
    products: row.products,
    permissions: account?.permissions,
    savedReleaseIds: account?.library.savedReleaseIds,
    playback: account?.playback
  });
}

function normalizePersistedRelease(row: {
  id: string;
  artist_id: string;
  slug: string;
  title: string;
  release_date: string | null;
  release_type?: PublicReleaseType | null;
  status: string;
  scheduled_publish_at?: string | null;
  published_at?: string | null;
}, mediaRows: CatalogMediaAsset[]): PublishedCatalogRelease {
  const artwork = mediaRows.find((asset) => asset.ownerType === "release" && asset.ownerId === row.id && asset.path.startsWith("artwork/"));
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    artistId: row.artist_id,
    releaseDate: row.release_date ?? row.published_at?.slice(0, 10) ?? nowIso().slice(0, 10),
    releaseType: row.release_type ?? undefined,
    published: row.status === "published",
    coverAssetId: artwork?.id ?? "",
    status: row.status === "scheduled" ? "scheduled" : "published",
    scheduledPublishAt: row.scheduled_publish_at ?? undefined
  };
}

function normalizeProduct(row: {
  id: string;
  slug: string;
  name: string;
  price_cents?: number | null;
  currency?: string | null;
}): CatalogProduct {
  return {
    id: row.id,
    slug: row.slug,
    title: row.name,
    priceCents: row.price_cents ?? null,
    currency: row.currency ?? null
  };
}

function productGrantsRelease(grants: unknown, releaseId: string) {
  return Array.isArray(grants) && grants.some((grant) => {
    if (!grant || typeof grant !== "object") return false;
    return "type" in grant && grant.type === "release" && "releaseId" in grant && grant.releaseId === releaseId;
  });
}

async function getPersistedCatalogRows({ includeUnpublished = false } = {}): Promise<CatalogRow[] | null> {
  const supabase = getServerSupabase();
  if (!supabase) return null;

  let releaseQuery = supabase
    .from("releases")
    .select("id, artist_id, slug, title, release_date, release_type, status, scheduled_publish_at, published_at")
    .order("release_date", { ascending: false, nullsFirst: false });

  if (!includeUnpublished) {
    releaseQuery = releaseQuery.in("status", ["published", "scheduled"]);
  }

  const [{ data: releaseRows, error: releaseError }, { data: trackRows, error: trackError }, { data: mediaRows, error: mediaError }, { data: artistRows, error: artistError }, { data: productRows, error: productError }] =
    await Promise.all([
      releaseQuery,
      supabase.from("tracks").select("id, release_id, title, duration_seconds, position"),
      supabase.from("media_assets").select("id, owner_type, owner_id, bucket, storage_path, access_level"),
      supabase.from("artists").select("id, name, slug"),
      supabase.from("products").select("id, slug, name, price_cents, currency, grants").eq("active", true)
    ]);

  if (releaseError || trackError || mediaError || artistError || productError || !releaseRows?.length) return null;

  const media = (mediaRows ?? []).map((row) => ({
    id: row.id,
    bucket: row.bucket,
    path: row.storage_path,
    ownerType: row.owner_type,
    ownerId: row.owner_id,
    access: row.access_level
  }));

  return releaseRows
    .map((row) => {
      const releaseMedia = media.filter((asset) => asset.ownerId === row.id || (asset.ownerType === "track" && (trackRows ?? []).some((track) => track.release_id === row.id && track.id === asset.ownerId)));
      const release = normalizePersistedRelease(row, releaseMedia);
      return {
        release,
        tracks: (trackRows ?? [])
          .filter((track) => track.release_id === row.id)
          .map((track) => ({
            id: track.id,
            releaseId: track.release_id,
            title: track.title,
            durationSeconds: track.duration_seconds,
            mediaAssetId: releaseMedia.find((asset) => asset.ownerType === "track" && asset.ownerId === track.id && asset.path.startsWith("masters/"))?.id ?? "",
            position: track.position
          })),
        mediaAssets: releaseMedia,
        artist: (artistRows ?? []).find((artist) => artist.id === row.artist_id) ?? null,
        products: (productRows ?? []).filter((product) => productGrantsRelease(product.grants, row.id)).map(normalizeProduct)
      } satisfies CatalogRow;
    })
    .filter((row) => includeUnpublished || isVisibleRelease(row.release));
}

async function getDurableCatalogRows(options: { includeUnpublished?: boolean } = {}) {
  return (await getPersistedCatalogRows(options)) ?? getCatalogRows(options);
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

export async function listReleasesDurable({
  includeUnpublished = false,
  userId,
  releaseType
}: { includeUnpublished?: boolean; userId?: string; releaseType?: PublicReleaseType } = {}) {
  return (await getDurableCatalogRows({ includeUnpublished }))
    .filter((row) => matchesReleaseType(row, releaseType))
    .map((row) => toReleaseObject(row, userId));
}

export function getLatestReleases({ limit = 12, userId, releaseType }: { limit?: number; userId?: string; releaseType?: PublicReleaseType } = {}) {
  return listReleases({ userId, releaseType })
    .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate))
    .slice(0, limit);
}

export async function getLatestReleasesDurable({ limit = 12, userId, releaseType }: { limit?: number; userId?: string; releaseType?: PublicReleaseType } = {}) {
  return (await listReleasesDurable({ userId, releaseType }))
    .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate))
    .slice(0, limit);
}

export function getReleaseBySlug(slug: string, { userId }: { userId?: string } = {}) {
  const row = getCatalogRows().find((releaseRow) => releaseRow.release.slug === slug);
  return row ? toReleaseObject(row, userId) : null;
}

export async function getReleaseBySlugDurable(slug: string, { userId }: { userId?: string } = {}) {
  const row = (await getDurableCatalogRows()).find((releaseRow) => releaseRow.release.slug === slug);
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

export async function getMediaObjectsForReleaseDurable(slug: string, userId?: string) {
  return getReleaseBySlugDurable(slug, { userId });
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

export async function getMediaAssetListForReleaseDurable(slug: string): Promise<MediaAssetContract[]> {
  const release = await getReleaseBySlugDurable(slug);
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

async function persistPublishedDraft(record: PublishedDraftRecord) {
  const supabase = getServerSupabase();
  if (!supabase) return false;
  if (![record.release.id, record.release.artistId, ...record.tracks.map((track) => track.id), ...record.mediaAssets.map((asset) => asset.id)].every((id) => uuidPattern.test(id))) {
    return false;
  }

  const { error: releaseError } = await supabase.from("releases").upsert({
    id: record.release.id,
    artist_id: record.release.artistId,
    slug: record.release.slug,
    title: record.release.title,
    release_date: record.release.releaseDate,
    release_type: record.release.releaseType ?? "album",
    status: record.release.status,
    scheduled_publish_at: record.release.scheduledPublishAt ?? null,
    published_at: record.release.status === "published" ? record.publishedAt : null
  });
  if (releaseError) return false;

  const { error: tracksError } = await supabase.from("tracks").upsert(
    record.tracks.map((track) => ({
      id: track.id,
      release_id: track.releaseId,
      title: track.title,
      duration_seconds: track.durationSeconds,
      position: track.position
    }))
  );
  if (tracksError) return false;

  const { error: mediaError } = await supabase.from("media_assets").upsert(
    record.mediaAssets.map((asset) => ({
      id: asset.id,
      owner_type: asset.ownerType,
      owner_id: asset.ownerId,
      bucket: asset.bucket,
      storage_path: asset.path,
      access_level: asset.access
    }))
  );

  return !mediaError;
}

export async function publishReleaseDurable(id: string): Promise<PublishReleaseResult | null> {
  const result = publishRelease(id);
  if (!result?.ok) return result;

  const record = publishedDrafts.get(id);
  if (record) {
    await persistPublishedDraft(record);
  }

  return result;
}
