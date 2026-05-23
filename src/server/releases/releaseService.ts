import { getAccountState, getLibraryDurable } from "@/server/account/accountStateService";
import { artists, mediaAssets, products, releases, tracks } from "@/server/data/seedData";
import { recordStreamAnalytics, recordStreamAnalyticsDurable } from "@/server/analytics/analyticsService";
import {
  buildReleaseMediaObject,
  type MediaAssetContract,
  type ReleaseMediaObject
} from "@/server/media/mediaObjects";
import { markRecentlyPlayed, updatePlaybackProgress, updatePlaybackProgressDurable } from "@/server/playback/playbackService";
import {
  createReleaseDraft,
  getReadinessSummary,
  getReleaseDraft,
  type ReleaseManagementDraft
} from "@/server/release-management/releaseManagementService";
import { emitAfterSuccessfulAction } from "@/server/events/eventedWriteService";
import { recordReleaseActivity, recordReleaseRevision } from "@/server/release-management/releaseLifecycleService";
import { upsertReleaseProduct as upsertReleaseProductFromDraft } from "@/server/commerce/releaseCommerceService";
import { markSyncDirty } from "@/server/sync/syncStateService";
import { getServerSupabase } from "@/server/supabase/client";
import { normalizePricingTier } from "@/server/commerce/pricingValidation";
import { listConfirmedMediaAssets } from "@/server/media/uploadIntentService";
import type { Release, Track } from "@/server/types";

// Shared sync-layer catalog: admin write services publish into this central state,
// and public read services render from it through normalized media objects.
type PublishedCatalogRelease = Release & {
  status: "published" | "scheduled";
  scheduledPublishAt?: string;
};

export type PublicReleaseType = NonNullable<Release["releaseType"]>;
export type PublicReleaseCategory = "single" | "album" | "feature";

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
  productSlug: string;
  title: string;
  priceCents?: number | null;
  priceLabel?: string | null;
  currency?: string | null;
  stripePriceId?: string | null;
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
  if (release.status !== "published") {
    return false;
  }
  if (release.scheduledPublishAt && release.scheduledPublishAt > nowIso()) {
    return false;
  }
  return true;
}

function getSeedCatalogRows() {
  return releases.filter((release) => release.published).map((release) => ({
    release: {
      ...release,
      status: "published" as const
    },
    tracks: tracks.filter((track) => track.releaseId === release.id),
    mediaAssets: [...mediaAssets].filter((asset) => asset.ownerId === release.id || tracks.some((track) => track.releaseId === release.id && asset.ownerId === track.id)),
    artist: artists.find((artist) => artist.id === release.artistId) ?? null,
    products: products.filter((product) => productGrantsRelease(product.grants, release.id)).map(normalizeProduct)
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

function releaseCategoryForRow(row: CatalogRow): PublicReleaseCategory {
  const explicitCategory = (row.release as Release & { releaseCategory?: PublicReleaseCategory }).releaseCategory;
  if (explicitCategory === "single" || explicitCategory === "album" || explicitCategory === "feature") return explicitCategory;
  if (row.release.releaseType === "feature") return "feature";
  if (row.release.releaseType === "single") return "single";
  return "album";
}

function matchesReleaseCategory(row: CatalogRow, releaseCategory?: PublicReleaseCategory) {
  if (!releaseCategory) return true;
  return releaseCategoryForRow(row) === releaseCategory;
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
  release_category?: PublicReleaseCategory | null;
  status: string;
  scheduled_publish_at?: string | null;
  published_at?: string | null;
  price_in_cents?: number | null;
  pricing_tier?: "single" | "ep" | "album" | null;
  gifting_enabled?: boolean | null;
  deluxe_price_in_cents?: number | null;
  bundle_price_in_cents?: number | null;
  per_track_overrides?: Record<string, unknown> | null;
}, mediaRows: CatalogMediaAsset[]): PublishedCatalogRelease {
  const releaseOwned = mediaRows.filter((asset) => asset.ownerType === "release" && asset.ownerId === row.id);
  const artwork =
    releaseOwned.find((asset) => asset.path.startsWith("artwork/") && !/\.(mp4|mov|webm)(\?|#|$)/i.test(asset.path)) ??
    releaseOwned.find((asset) => /cover|artwork/i.test(asset.path) && !/\.(mp4|mov|webm)(\?|#|$)/i.test(asset.path));
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    artistId: row.artist_id,
    releaseDate: row.release_date ?? row.published_at?.slice(0, 10) ?? nowIso().slice(0, 10),
    releaseType: row.release_type ?? undefined,
    releaseCategory: row.release_category ?? undefined,
    published: row.status === "published",
    coverAssetId: artwork?.id ?? "",
    status: row.status === "scheduled" ? "scheduled" : "published",
    scheduledPublishAt: row.scheduled_publish_at ?? undefined,
    priceInCents: row.price_in_cents ?? null,
    pricingTier: row.pricing_tier ?? normalizePricingTier(row.release_type, null),
    giftingEnabled: Boolean(row.gifting_enabled),
    deluxePriceInCents: row.deluxe_price_in_cents ?? null,
    bundlePriceInCents: row.bundle_price_in_cents ?? null,
    perTrackOverrides: row.per_track_overrides ?? null
  };
}

function normalizeProduct(row: {
  id: string;
  slug: string;
  name?: string | null;
  title?: string | null;
  price_cents?: number | null;
  priceCents?: number | null;
  currency?: string | null;
  stripe_price_id?: string | null;
  stripePriceId?: string | null;
}): CatalogProduct {
  const priceCents = row.price_cents ?? row.priceCents ?? null;
  const currency = row.currency ?? "usd";
  const priceLabel =
    typeof priceCents === "number" && priceCents >= 0
      ? new Intl.NumberFormat("en-US", { style: "currency", currency }).format(priceCents / 100)
      : null;

  return {
    id: row.id,
    slug: row.slug,
    productSlug: row.slug,
    title: row.name ?? row.title ?? row.slug,
    priceCents,
    priceLabel,
    currency,
    stripePriceId: row.stripe_price_id ?? row.stripePriceId ?? null
  };
}

function productGrantsRelease(grants: unknown, releaseId: string) {
  return Array.isArray(grants) && grants.some((grant) => {
    if (!grant || typeof grant !== "object") return false;
    const candidate = "releaseId" in grant ? grant.releaseId : "release_id" in grant ? grant.release_id : null;
    return "type" in grant && grant.type === "release" && candidate === releaseId;
  });
}

async function getActiveProductRows(supabase: NonNullable<ReturnType<typeof getServerSupabase>>) {
  const baseColumns = "id, slug, name, stripe_price_id, grants";
  const enhancedColumns = `${baseColumns}, price_cents, currency`;
  const enhanced = await supabase.from("products").select(enhancedColumns).eq("active", true);

  if (!enhanced.error) {
    return { data: enhanced.data ?? [], error: null };
  }

  const missingPriceColumn = /price_cents|currency/i.test(enhanced.error.message ?? "");
  if (!missingPriceColumn) {
    return { data: null, error: enhanced.error };
  }

  // Deploys remain compatible until the 0008 product price migration is applied.
  return supabase.from("products").select(baseColumns).eq("active", true);
}

async function getPersistedCatalogRows({ includeUnpublished = false } = {}): Promise<CatalogRow[] | null> {
  const supabase = getServerSupabase();
  if (!supabase) return null;

  const releaseColumns =
    "id, artist_id, slug, title, release_date, release_type, release_category, status, scheduled_publish_at, published_at, price_in_cents, pricing_tier, gifting_enabled, deluxe_price_in_cents, bundle_price_in_cents, per_track_overrides";
  const legacyReleaseColumns = "id, artist_id, slug, title, release_date, release_type, status, scheduled_publish_at, published_at";
  let releaseQuery = supabase
    .from("releases")
    .select(releaseColumns)
    .order("release_date", { ascending: false, nullsFirst: false });

  if (!includeUnpublished) {
    releaseQuery = releaseQuery.in("status", ["published", "scheduled"]);
  }

  let releaseResult: {
    data: Array<Record<string, unknown>> | null;
    error: { message?: string } | null;
  } = await releaseQuery;
  if (releaseResult.error && /price_in_cents|pricing_tier|gifting_enabled/i.test(releaseResult.error.message ?? "")) {
    let commerceFallbackQuery = supabase
      .from("releases")
      .select(legacyReleaseColumns)
      .order("release_date", { ascending: false, nullsFirst: false });
    if (!includeUnpublished) {
      commerceFallbackQuery = commerceFallbackQuery.in("status", ["published", "scheduled"]);
    }
    releaseResult = await commerceFallbackQuery;
  }
  if (releaseResult.error && /release_category/i.test(releaseResult.error.message ?? "")) {
    let legacyReleaseQuery = supabase
      .from("releases")
      .select(legacyReleaseColumns)
      .order("release_date", { ascending: false, nullsFirst: false });
    if (!includeUnpublished) {
      legacyReleaseQuery = legacyReleaseQuery.in("status", ["published", "scheduled"]);
    }
    releaseResult = await legacyReleaseQuery;
  }

  const { data: releaseRows, error: releaseError } = releaseResult;
  if (releaseError || !releaseRows?.length) return releaseError ? null : [];

  const releaseIds = releaseRows.map((row) => row.id);
  const [{ data: trackRows, error: trackError }, { data: artistRows, error: artistError }, { data: productRows, error: productError }, { data: releaseMediaRows, error: releaseMediaError }] =
    await Promise.all([
      supabase
        .from("tracks")
        .select("id, release_id, title, duration_seconds, position, lyrics_text")
        .in("release_id", releaseIds),
      supabase.from("artists").select("id, name, slug"),
      getActiveProductRows(supabase),
      supabase
        .from("release_media")
        .select("release_id, media_asset_id, asset_role, is_primary, is_active")
        .in("release_id", releaseIds)
        .eq("is_active", true)
    ]);

  if (trackError || artistError || productError || releaseMediaError) return null;

  const trackIds = (trackRows ?? []).map((row) => row.id as string);
  const referencedAssetIds = new Set<string>();
  for (const row of releaseMediaRows ?? []) {
    if (row.media_asset_id) referencedAssetIds.add(row.media_asset_id as string);
  }

  const mediaQueries = [];
  if (referencedAssetIds.size > 0) {
    mediaQueries.push(
      supabase
        .from("media_assets")
        .select("id, owner_type, owner_id, bucket, storage_path, access_level")
        .in("id", [...referencedAssetIds])
    );
  }
  if (releaseIds.length > 0) {
    mediaQueries.push(
      supabase
        .from("media_assets")
        .select("id, owner_type, owner_id, bucket, storage_path, access_level")
        .eq("owner_type", "release")
        .in("owner_id", releaseIds)
    );
  }
  if (trackIds.length > 0) {
    mediaQueries.push(
      supabase
        .from("media_assets")
        .select("id, owner_type, owner_id, bucket, storage_path, access_level")
        .eq("owner_type", "track")
        .in("owner_id", trackIds)
    );
  }

  const mediaResults = mediaQueries.length ? await Promise.all(mediaQueries) : [];
  if (mediaResults.some((result) => result.error)) return null;

  const mediaById = new Map<string, { id: string; bucket: string; path: string; ownerType: string; ownerId: string; access: string }>();
  for (const result of mediaResults) {
    for (const row of result.data ?? []) {
      mediaById.set(row.id as string, {
        id: row.id as string,
        bucket: row.bucket as string,
        path: row.storage_path as string,
        ownerType: row.owner_type as string,
        ownerId: row.owner_id as string,
        access: row.access_level as string
      });
    }
  }

  const media = [...mediaById.values()];

  return releaseRows
    .map((row) => {
      const releaseLinks = (releaseMediaRows ?? []).filter((link) => link.release_id === row.id);
      const primaryCoverLink =
        releaseLinks.find((link) => link.is_primary && (link.asset_role === "cover_art" || link.asset_role === "background_loop")) ??
        releaseLinks.find((link) => link.asset_role === "cover_art" || link.asset_role === "background_loop");
      const releaseMedia = media.filter((asset) => asset.ownerId === row.id || (asset.ownerType === "track" && (trackRows ?? []).some((track) => track.release_id === row.id && track.id === asset.ownerId)));
      const release = normalizePersistedRelease(
        row as Parameters<typeof normalizePersistedRelease>[0],
        releaseMedia
      );
      if (primaryCoverLink?.media_asset_id) {
        release.coverAssetId = primaryCoverLink.media_asset_id;
      }
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
            position: track.position,
            lyricsText: (track as { lyrics_text?: string | null }).lyrics_text ?? null,
            lyricsMode: ((track as { lyrics_mode?: string }).lyrics_mode === "timed" ? "timed" : "static") as "static" | "timed"
          })),
        mediaAssets: releaseMedia,
        artist: (artistRows ?? []).find((artist) => artist.id === row.artist_id) ?? null,
        products: (productRows ?? []).filter((product) => productGrantsRelease(product.grants, String(row.id))).map(normalizeProduct)
      } satisfies CatalogRow;
    })
    .filter((row) => includeUnpublished || isVisibleRelease(row.release));
}

async function getDurableCatalogRows(options: { includeUnpublished?: boolean } = {}) {
  return (await getPersistedCatalogRows(options)) ?? getCatalogRows(options);
}

function draftToCatalog(draft: ReleaseManagementDraft, status: "published" | "scheduled"): PublishedDraftRecord {
  const releaseDate = draft.originalReleaseDate?.slice(0, 10) ?? draft.scheduledPublishAt?.slice(0, 10) ?? nowIso().slice(0, 10);
  const uploadedAssets = listConfirmedMediaAssets().filter((asset) => asset.releaseId === draft.id || draft.tracks.some((track) => track.id === asset.trackId || track.id === asset.ownerId));
  const coverAsset = uploadedAssets.find((asset) => asset.ownerType === "release" && (asset.category.includes("cover") || asset.frontendDestinations.includes("cover_art")));
  const releaseCategory = draft.releaseType === "feature" ? "feature" : draft.releaseType === "single" ? "single" : "album";
  const catalogTracks: Track[] = draft.tracks.map((track) => ({
    id: track.id,
    releaseId: draft.id,
    title: track.title,
    durationSeconds: 0,
    mediaAssetId: uploadedAssets.find((asset) => asset.trackId === track.id && (asset.category === "full_song_files" || asset.category === "audio_full_song" || asset.category === "track_audio"))?.id ?? "",
    position: track.position
  }));
  const catalogMediaAssets: CatalogMediaAsset[] = uploadedAssets.map((asset) => ({
    id: asset.id,
    bucket: asset.bucket,
    path: asset.path,
    ownerType: asset.ownerType,
    ownerId: asset.ownerId,
    access: asset.access
  }));

  return {
    release: {
      id: draft.id,
      slug: draft.slug,
      title: draft.title,
      artistId: draft.artistId,
      releaseDate,
      releaseType: draft.releaseType,
      releaseCategory,
      published: status === "published",
      coverAssetId: coverAsset?.id ?? "",
      status,
      scheduledPublishAt: draft.scheduledPublishAt,
      priceInCents: draft.priceInCents ?? null,
      pricingTier: draft.pricingTier ?? normalizePricingTier(draft.releaseType, null),
      giftingEnabled: draft.giftingEnabled ?? false,
      deluxePriceInCents: draft.deluxePriceInCents ?? null,
      bundlePriceInCents: draft.bundlePriceInCents ?? null,
      perTrackOverrides: draft.perTrackOverrides ?? null
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
  releaseType,
  releaseCategory
}: { includeUnpublished?: boolean; userId?: string; releaseType?: PublicReleaseType; releaseCategory?: PublicReleaseCategory } = {}) {
  return getCatalogRows({ includeUnpublished })
    .filter((row) => matchesReleaseType(row, releaseType))
    .filter((row) => matchesReleaseCategory(row, releaseCategory))
    .map((row) => toReleaseObject(row, userId));
}

export async function listReleasesDurable({
  includeUnpublished = false,
  userId,
  releaseType,
  releaseCategory
}: { includeUnpublished?: boolean; userId?: string; releaseType?: PublicReleaseType; releaseCategory?: PublicReleaseCategory } = {}) {
  return (await getDurableCatalogRows({ includeUnpublished }))
    .filter((row) => matchesReleaseType(row, releaseType))
    .filter((row) => matchesReleaseCategory(row, releaseCategory))
    .map((row) => toReleaseObject(row, userId));
}

export function getLatestReleases({ limit = 12, userId, releaseType, releaseCategory }: { limit?: number; userId?: string; releaseType?: PublicReleaseType; releaseCategory?: PublicReleaseCategory } = {}) {
  return listReleases({ userId, releaseType, releaseCategory })
    .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate))
    .slice(0, limit);
}

export async function getLatestReleasesDurable({ limit = 12, userId, releaseType, releaseCategory }: { limit?: number; userId?: string; releaseType?: PublicReleaseType; releaseCategory?: PublicReleaseCategory } = {}) {
  return (await listReleasesDurable({ userId, releaseType, releaseCategory }))
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

export async function getUserLibraryDurable(userId: string) {
  const library = await getLibraryDurable(userId);
  const visibleRows = await getDurableCatalogRows();
  const savedTrackIds = new Set(library.savedTrackIds);

  return {
    savedTrackIds: library.savedTrackIds,
    savedReleaseIds: library.savedReleaseIds,
    purchasedProductIds: library.purchasedProductIds,
    releases: visibleRows
      .filter((row) => library.savedReleaseIds.includes(row.release.id))
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

export async function trackPlaybackEventDurable(userId: string, input: PlaybackEventInput) {
  const progress =
    typeof input.positionSeconds === "number"
      ? await updatePlaybackProgressDurable(userId, {
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
      ? await recordStreamAnalyticsDurable(userId, {
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
  coverAssetId?: string;
}) {
  const existing = input.id ? releases.find((release) => release.id === input.id) : null;

  if (existing) {
    existing.slug = input.slug;
    existing.title = input.title;
    existing.artistId = input.artistId ?? existing.artistId;
    existing.releaseDate = input.releaseDate ?? existing.releaseDate;
    existing.releaseType = input.releaseType ?? existing.releaseType;
    existing.published = input.published ?? existing.published;
    existing.coverAssetId = input.coverAssetId ?? existing.coverAssetId;
    emitAfterSuccessfulAction({
      type: "release.updated",
      entityId: existing.id,
      data: { releaseId: existing.id, slug: existing.slug, durable: false }
    });
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
    coverAssetId: input.coverAssetId ?? ""
  };
  releases.push(release);
  emitAfterSuccessfulAction({
    type: "release.created",
    entityId: release.id,
    data: { releaseId: release.id, slug: release.slug, durable: false }
  });
  return release;
}

export function publishRelease(id: string): PublishReleaseResult | null {
  const draft = getReleaseDraft(id);
  if (draft) {
    const readiness = getReadinessSummary(id);
    const importedWithMedia =
      draft.tags.some((tag) => tag === "frontend-import" || tag === "supabase-catalog") &&
      Boolean(draft.coverArtPath || draft.coverArtState === "uploaded" || draft.coverArtState === "approved") &&
      draft.tracks.some((track) => track.audioState === "uploaded" || track.audioState === "approved");
    if (!readiness.ready && !importedWithMedia) {
      return {
        ok: false,
        releaseId: id,
        message: "Release is not ready to publish",
        checks: readiness.checks
      };
    }

    const today = nowIso().slice(0, 10);
    const releaseDate = draft.originalReleaseDate?.slice(0, 10) ?? today;
    const status = releaseDate > today || (draft.scheduledPublishAt && draft.scheduledPublishAt > nowIso()) ? "scheduled" : "published";
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
    emitAfterSuccessfulAction({
      type: "release.published",
      entityId: id,
      data: {
        releaseId: id,
        slug: draft.slug,
        status,
        durable: false
      }
    });
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
  emitAfterSuccessfulAction({
    type: "release.published",
    entityId: release.id,
    data: {
      releaseId: release.id,
      slug: release.slug,
      status: "published",
      durable: false
    }
  });
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

export function publishImportedReleaseToCatalog(id: string) {
  const draft = getReleaseDraft(id);
  if (!draft) return null;
  const status = draft.status === "scheduled" ? "scheduled" : "published";
  const record = draftToCatalog(draft, status);
  publishedDrafts.set(id, record);
  emitAfterSuccessfulAction({
    type: "release.published",
    entityId: id,
    data: {
      releaseId: id,
      slug: draft.slug,
      status,
      source: "frontend_import",
      durable: false
    }
  });
  return toReleaseObject(record);
}

async function persistPublishedDraft(record: PublishedDraftRecord) {
  const supabase = getServerSupabase();
  if (!supabase) return false;
  if (![record.release.id, record.release.artistId, ...record.tracks.map((track) => track.id), ...record.mediaAssets.map((asset) => asset.id)].every((id) => uuidPattern.test(id))) {
    return false;
  }

  const releasePayload = {
    id: record.release.id,
    artist_id: record.release.artistId,
    slug: record.release.slug,
    title: record.release.title,
    release_date: record.release.releaseDate,
    release_type: record.release.releaseType ?? "album",
    release_category: record.release.releaseCategory ?? (record.release.releaseType === "feature" ? "feature" : record.release.releaseType === "single" ? "single" : "album"),
    status: record.release.status,
    scheduled_publish_at: record.release.scheduledPublishAt ?? null,
    published_at: record.release.status === "published" ? record.publishedAt : null,
    price_in_cents: record.release.priceInCents ?? null,
    pricing_tier: record.release.pricingTier ?? null,
    gifting_enabled: record.release.giftingEnabled ?? false,
    deluxe_price_in_cents: record.release.deluxePriceInCents ?? null,
    bundle_price_in_cents: record.release.bundlePriceInCents ?? null,
    per_track_overrides: record.release.perTrackOverrides ?? null
  };
  let releaseWrite = await supabase.from("releases").upsert(releasePayload);
  if (releaseWrite.error && /price_in_cents|pricing_tier|gifting_enabled/i.test(releaseWrite.error.message ?? "")) {
    const {
      price_in_cents: _price,
      pricing_tier: _tier,
      gifting_enabled: _gift,
      deluxe_price_in_cents: _deluxe,
      bundle_price_in_cents: _bundle,
      per_track_overrides: _overrides,
      ...releaseWithoutCommerce
    } = releasePayload;
    releaseWrite = await supabase.from("releases").upsert(releaseWithoutCommerce);
  }
  if (releaseWrite.error && /release_category/i.test(releaseWrite.error.message ?? "")) {
    releaseWrite = await supabase.from("releases").upsert({
      id: releasePayload.id,
      artist_id: releasePayload.artist_id,
      slug: releasePayload.slug,
      title: releasePayload.title,
      release_date: releasePayload.release_date,
      release_type: releasePayload.release_type,
      status: releasePayload.status,
      scheduled_publish_at: releasePayload.scheduled_publish_at,
      published_at: releasePayload.published_at
    });
  }
  const releaseError = releaseWrite.error;
  if (releaseError) return false;

  const trackRows = record.tracks.map((track) => ({
    id: track.id,
    release_id: track.releaseId,
    title: track.title,
    duration_seconds: track.durationSeconds,
    position: track.position,
    lyrics_text: track.lyricsText ?? null,
    lyrics_mode: track.lyricsMode ?? "static"
  }));
  let tracksWrite = await supabase.from("tracks").upsert(trackRows);
  if (tracksWrite.error && /lyrics_mode/i.test(tracksWrite.error.message ?? "")) {
    tracksWrite = await supabase.from("tracks").upsert(
      record.tracks.map((track) => ({
        id: track.id,
        release_id: track.releaseId,
        title: track.title,
        duration_seconds: track.durationSeconds,
        position: track.position,
        lyrics_text: track.lyricsText ?? null
      }))
    );
  }
  if (tracksWrite.error) return false;

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

  if (mediaError) return false;

  const draft = getReleaseDraft(record.release.id);
  if (!draft) return true;
  const productResult = await upsertReleaseProductFromDraft(draft);
  return productResult.ok;
}

export async function publishReleaseDurable(id: string): Promise<PublishReleaseResult | null> {
  if (!getReleaseDraft(id)) {
    const { fetchDurableReleaseById } = await import("@/server/catalog/releaseCatalogService");
    const { hydrateDraftFromCatalogRelease } = await import("@/server/release-management/releaseCatalogHydrationService");
    const release = await fetchDurableReleaseById(id);
    if (release) hydrateDraftFromCatalogRelease(release);
  }

  const draftBeforePublish = getReleaseDraft(id);
  if (draftBeforePublish?.priceInCents != null) {
    const { assertPublishStorefrontReadiness } = await import("@/server/sync/frontendCatalogSyncService");
    const syncReady = await assertPublishStorefrontReadiness({
      releaseId: id,
      priceInCents: draftBeforePublish.priceInCents
    });
    if (!syncReady.ok) {
      return {
        ok: false,
        releaseId: id,
        message: syncReady.message,
        checks: getReadinessSummary(id).checks
      };
    }
  }

  const result = publishRelease(id);
  if (!result?.ok) return result;

  const record = publishedDrafts.get(id);
  if (record) {
    const persisted = await persistPublishedDraft(record);
    if (!persisted) {
      return {
        ok: false,
        releaseId: id,
        message: "Could not persist release to database",
        checks: getReadinessSummary(id).checks
      };
    }
    await markSyncDirty(`release:${id}`, { releaseId: id, reason: "release.published" });
    await markSyncDirty("catalog", { releaseId: id, reason: "release.published" });

    const { queueStorefrontCatalogSync } = await import("@/server/sync/frontendCatalogSyncService");
    queueStorefrontCatalogSync({ releaseIds: [id], reason: "release.published" });
  }

  return result;
}
