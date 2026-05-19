import "server-only";

import { getServerSupabase } from "@/server/supabase/client";
import type { ReleaseType } from "@/server/release-management/taxonomies";

export type CatalogMediaAsset = {
  id: string;
  ownerType: string;
  ownerId: string;
  bucket: string;
  storagePath: string;
  accessLevel: string;
  assetType?: string | null;
  checksumMd5?: string | null;
  version?: number;
  isActive?: boolean;
};

export type CatalogReleaseMedia = {
  id: string;
  releaseId: string;
  trackId: string | null;
  mediaAssetId: string;
  assetRole: string;
  isPrimary: boolean;
  version: number;
  isActive: boolean;
  mediaSection?: string | null;
  frontendRoute?: string | null;
  syncTarget?: string | null;
  cacheGroup?: string | null;
  frontendDestinations?: string[];
  asset?: CatalogMediaAsset;
};

export type CatalogTrack = {
  id: string;
  releaseId: string;
  title: string;
  position: number;
  durationSeconds: number;
  audioState?: string | null;
  audioAssetId?: string | null;
  previewAssetId?: string | null;
  lyricsText?: string | null;
  audioAsset?: CatalogMediaAsset | null;
  previewAsset?: CatalogMediaAsset | null;
};

export type CatalogCredit = {
  id: string;
  releaseId: string;
  name: string;
  role: string;
};

export type CatalogDistribution = {
  id: string;
  releaseId: string;
  provider: string;
  url: string;
};

export type CatalogRelease = {
  id: string;
  artistId: string;
  artistName: string;
  slug: string;
  title: string;
  releaseDate: string | null;
  releaseType: ReleaseType;
  releaseCategory: string | null;
  status: string;
  scheduledPublishAt: string | null;
  releaseTime: string | null;
  publishTimezone: string | null;
  scheduleAttempts?: number | null;
  scheduleLastError?: string | null;
  publishedAt: string | null;
  ingestionSource?: string | null;
  ingestionRef?: string | null;
  catalogVersion?: number;
  tracks: CatalogTrack[];
  releaseMedia: CatalogReleaseMedia[];
  credits: CatalogCredit[];
  distribution: CatalogDistribution[];
  coverArt?: CatalogMediaAsset | null;
  backgroundLoop?: CatalogMediaAsset | null;
  musicVideo?: CatalogMediaAsset | null;
};

function mapReleaseType(row: { release_type?: string | null; release_category?: string | null }): ReleaseType {
  if (row.release_category === "feature" || row.release_type === "feature") return "feature";
  if (row.release_type === "single" || row.release_type === "album" || row.release_type === "ep") return row.release_type;
  if (row.release_type === "deluxe" || row.release_type === "remix_pack") return row.release_type;
  return "album";
}

function roleMatches(role: string, targets: string[]) {
  return targets.includes(role);
}

function pickPrimaryMedia(links: CatalogReleaseMedia[], roles: string[]) {
  return (
    links.find((link) => link.isActive && link.isPrimary && roleMatches(link.assetRole, roles)) ??
    links.find((link) => link.isActive && roleMatches(link.assetRole, roles))
  )?.asset ?? null;
}

function pickAssetByPath(
  assets: CatalogMediaAsset[],
  patterns: RegExp[],
  ownerId?: string,
  ownerType?: string
) {
  return (
    assets.find(
      (asset) =>
        (!ownerId || asset.ownerId === ownerId) &&
        (!ownerType || asset.ownerType === ownerType) &&
        patterns.some((pattern) => pattern.test(asset.storagePath))
    ) ?? null
  );
}

function enrichTrackFromReleaseMedia(track: CatalogTrack, releaseMedia: CatalogReleaseMedia[]) {
  const trackLinks = releaseMedia.filter((link) => link.trackId === track.id);
  const preview =
    track.previewAsset ??
    pickPrimaryMedia(trackLinks, ["preview", "preview_audio", "streaming_preview"]) ??
    pickAssetByPath(
      trackLinks.map((link) => link.asset).filter((asset): asset is CatalogMediaAsset => Boolean(asset)),
      [/preview/i, /previews\//i]
    );
  const audio =
    track.audioAsset ??
    pickPrimaryMedia(trackLinks, ["audio", "master_audio", "full_audio"]) ??
    pickAssetByPath(
      trackLinks.map((link) => link.asset).filter((asset): asset is CatalogMediaAsset => Boolean(asset)),
      [/masters\//i, /\.(mp3|wav|m4a|flac|aiff)(\?|#|$)/i]
    );

  return {
    ...track,
    previewAsset: preview,
    previewAssetId: preview?.id ?? track.previewAssetId,
    audioAsset: audio,
    audioAssetId: audio?.id ?? track.audioAssetId,
    audioState: track.audioState ?? (audio || preview ? "uploaded" : null)
  };
}

const MEDIA_ASSET_SELECT =
  "id, owner_type, owner_id, bucket, storage_path, access_level, asset_type, checksum_md5, version, is_active";

async function fetchScopedMediaAssets(
  supabase: NonNullable<ReturnType<typeof getServerSupabase>>,
  releaseIds: string[],
  trackRows: Array<{ id: string; audio_asset_id?: string | null; preview_asset_id?: string | null }>,
  releaseMediaRows: Array<{ media_asset_id?: string | null }>
) {
  const trackIds = trackRows.map((row) => row.id as string);
  const referencedIds = new Set<string>();
  for (const row of trackRows) {
    if (row.audio_asset_id) referencedIds.add(row.audio_asset_id as string);
    if (row.preview_asset_id) referencedIds.add(row.preview_asset_id as string);
  }
  for (const row of releaseMediaRows) {
    if (row.media_asset_id) referencedIds.add(row.media_asset_id as string);
  }

  const queries = [];
  if (referencedIds.size > 0) {
    queries.push(supabase.from("media_assets").select(MEDIA_ASSET_SELECT).in("id", [...referencedIds]));
  }
  if (releaseIds.length > 0) {
    queries.push(
      supabase.from("media_assets").select(MEDIA_ASSET_SELECT).eq("owner_type", "release").in("owner_id", releaseIds)
    );
  }
  if (trackIds.length > 0) {
    queries.push(
      supabase.from("media_assets").select(MEDIA_ASSET_SELECT).eq("owner_type", "track").in("owner_id", trackIds)
    );
  }
  if (!queries.length) return new Map<string, CatalogMediaAsset>();

  const results = await Promise.all(queries);
  const mediaById = new Map<string, CatalogMediaAsset>();
  for (const result of results) {
    if (result.error) continue;
    for (const row of result.data ?? []) {
      if (row.is_active === false) continue;
      mediaById.set(row.id as string, {
        id: row.id as string,
        ownerType: row.owner_type as string,
        ownerId: row.owner_id as string,
        bucket: row.bucket as string,
        storagePath: row.storage_path as string,
        accessLevel: row.access_level as string,
        assetType: row.asset_type as string | null,
        checksumMd5: row.checksum_md5 as string | null,
        version: row.version as number | undefined,
        isActive: row.is_active as boolean | undefined
      });
    }
  }
  return mediaById;
}

export async function fetchDurableReleaseCatalog(): Promise<CatalogRelease[]> {
  console.log("[stabilize] fetchDurableReleaseCatalog start");
  const started = Date.now();
  const supabase = getServerSupabase();
  if (!supabase) {
    console.log("[stabilize] fetchDurableReleaseCatalog skipped (no supabase)", { ms: Date.now() - started });
    return [];
  }

  const releaseSelect =
    "id, artist_id, slug, title, release_date, release_type, release_category, status, scheduled_publish_at, release_time, publish_timezone, schedule_attempts, schedule_last_error, published_at, ingestion_source, ingestion_ref, catalog_version, artists(id, name, slug)";
  const legacySelect =
    "id, artist_id, slug, title, release_date, release_type, release_category, status, published_at, artists(id, name, slug)";

  const primaryResult = await supabase
    .from("releases")
    .select(releaseSelect)
    .order("release_date", { ascending: false, nullsFirst: false });

  const releaseResult =
    primaryResult.error && /ingestion_|catalog_version/i.test(primaryResult.error.message ?? "")
      ? await supabase.from("releases").select(legacySelect).order("release_date", { ascending: false, nullsFirst: false })
      : primaryResult;

  if (releaseResult.error || !releaseResult.data?.length) {
    console.log("[stabilize] fetchDurableReleaseCatalog empty", { ms: Date.now() - started });
    return [];
  }

  const releaseIds = releaseResult.data.map((row) => row.id as string);

  const releaseMediaSelect =
    "id, release_id, track_id, media_asset_id, asset_role, is_primary, version, is_active, frontend_route, sync_target, media_section, cache_group, metadata";
  const legacyReleaseMediaSelect =
    "id, release_id, track_id, media_asset_id, asset_role, is_primary, version, is_active, metadata";

  const [tracksResult, releaseMediaPrimary, creditsResult, distributionResult] = await Promise.all([
    supabase
      .from("tracks")
      .select("id, release_id, title, duration_seconds, position, audio_state, audio_asset_id, preview_asset_id, lyrics_text")
      .in("release_id", releaseIds)
      .order("position", { ascending: true }),
    supabase.from("release_media").select(releaseMediaSelect).in("release_id", releaseIds),
    supabase.from("release_credits").select("id, release_id, name, role").in("release_id", releaseIds),
    supabase.from("release_external_links").select("id, release_id, provider, url").in("release_id", releaseIds)
  ]);

  const releaseMediaResult =
    releaseMediaPrimary.error && /frontend_route|media_section|cache_group/i.test(releaseMediaPrimary.error.message ?? "")
      ? await supabase.from("release_media").select(legacyReleaseMediaSelect).in("release_id", releaseIds)
      : releaseMediaPrimary;

  const mediaById = await fetchScopedMediaAssets(
    supabase,
    releaseIds,
    tracksResult.data ?? [],
    releaseMediaResult.data ?? []
  );

  const tracksByRelease = new Map<string, CatalogTrack[]>();
  for (const row of tracksResult.data ?? []) {
    const track: CatalogTrack = {
      id: row.id as string,
      releaseId: row.release_id as string,
      title: row.title as string,
      position: row.position as number,
      durationSeconds: row.duration_seconds as number,
      audioState: row.audio_state as string | null,
      audioAssetId: row.audio_asset_id as string | null,
      previewAssetId: row.preview_asset_id as string | null,
      lyricsText: (row as { lyrics_text?: string | null }).lyrics_text ?? null,
      audioAsset: row.audio_asset_id ? mediaById.get(row.audio_asset_id as string) ?? null : null,
      previewAsset: row.preview_asset_id ? mediaById.get(row.preview_asset_id as string) ?? null : null
    };
    const list = tracksByRelease.get(track.releaseId) ?? [];
    list.push(track);
    tracksByRelease.set(track.releaseId, list);
  }

  const releaseMediaByRelease = new Map<string, CatalogReleaseMedia[]>();
  for (const row of (releaseMediaResult.data ?? []).filter((entry) => entry.is_active !== false)) {
    const asset = mediaById.get(row.media_asset_id as string);
    if (!asset) continue;
    const metadata = (row.metadata ?? {}) as { frontendDestinations?: string[] };
    const link: CatalogReleaseMedia = {
      id: row.id as string,
      releaseId: row.release_id as string,
      trackId: row.track_id as string | null,
      mediaAssetId: row.media_asset_id as string,
      assetRole: row.asset_role as string,
      isPrimary: Boolean(row.is_primary),
      version: row.version as number,
      isActive: Boolean(row.is_active),
      mediaSection: ((row as { media_section?: string | null }).media_section as string | null) ?? null,
      frontendRoute: ((row as { frontend_route?: string | null }).frontend_route as string | null) ?? null,
      syncTarget: ((row as { sync_target?: string | null }).sync_target as string | null) ?? null,
      cacheGroup: ((row as { cache_group?: string | null }).cache_group as string | null) ?? null,
      frontendDestinations: metadata.frontendDestinations ?? [],
      asset
    };
    const list = releaseMediaByRelease.get(link.releaseId) ?? [];
    list.push(link);
    releaseMediaByRelease.set(link.releaseId, list);
  }

  const allMediaAssets = [...mediaById.values()];

  const catalog = releaseResult.data.map((row) => {
    const artist = Array.isArray(row.artists) ? row.artists[0] : row.artists;
    const releaseId = row.id as string;
    const releaseMedia = releaseMediaByRelease.get(releaseId) ?? [];
    const ownedAssets = allMediaAssets.filter(
      (asset) => asset.ownerType === "release" && asset.ownerId === releaseId
    );
    const tracks = (tracksByRelease.get(releaseId) ?? []).map((track) => enrichTrackFromReleaseMedia(track, releaseMedia));
    const coverArt =
      pickPrimaryMedia(releaseMedia, ["cover_art", "cover"]) ??
      pickAssetByPath(ownedAssets, [/artwork\//i, /cover/i], releaseId, "release");
    const backgroundLoop =
      pickPrimaryMedia(releaseMedia, ["background_loop", "motion", "visual"]) ??
      pickAssetByPath(ownedAssets, [/loops\//i, /\.(mp4|mov|webm)(\?|#|$)/i], releaseId, "release");
    const musicVideo =
      pickPrimaryMedia(releaseMedia, ["music_video", "visual"]) ??
      pickAssetByPath(ownedAssets, [/music_video/i, /videos\//i], releaseId, "release");

    return {
      id: releaseId,
      artistId: row.artist_id as string,
      artistName: (artist as { name?: string } | null)?.name ?? "2MRRW",
      slug: row.slug as string,
      title: row.title as string,
      releaseDate: row.release_date as string | null,
      releaseType: mapReleaseType(row as { release_type?: string; release_category?: string }),
      releaseCategory: (row.release_category as string | null) ?? null,
      status: row.status as string,
      scheduledPublishAt: ((row as { scheduled_publish_at?: string | null }).scheduled_publish_at as string | null) ?? null,
      releaseTime: ((row as { release_time?: string | null }).release_time as string | null) ?? null,
      publishTimezone: ((row as { publish_timezone?: string | null }).publish_timezone as string | null) ?? null,
      scheduleAttempts: ((row as { schedule_attempts?: number | null }).schedule_attempts as number | null) ?? null,
      scheduleLastError: ((row as { schedule_last_error?: string | null }).schedule_last_error as string | null) ?? null,
      publishedAt: row.published_at as string | null,
      ingestionSource: (row as { ingestion_source?: string }).ingestion_source ?? null,
      ingestionRef: (row as { ingestion_ref?: string }).ingestion_ref ?? null,
      catalogVersion: (row as { catalog_version?: number }).catalog_version ?? 1,
      tracks,
      releaseMedia,
      credits: (creditsResult.data ?? [])
        .filter((credit) => credit.release_id === releaseId)
        .map((credit) => ({
          id: credit.id as string,
          releaseId: credit.release_id as string,
          name: credit.name as string,
          role: credit.role as string
        })),
      distribution: (distributionResult.data ?? [])
        .filter((item) => item.release_id === releaseId)
        .map((item) => ({
          id: item.id as string,
          releaseId: item.release_id as string,
          provider: item.provider as string,
          url: item.url as string
        })),
      coverArt,
      backgroundLoop,
      musicVideo
    } satisfies CatalogRelease;
  });
  console.log("[stabilize] fetchDurableReleaseCatalog done", {
    releases: catalog.length,
    ms: Date.now() - started
  });
  return catalog;
}

export async function fetchDurableReleaseById(releaseId: string) {
  const catalog = await fetchDurableReleaseCatalog();
  return catalog.find((release) => release.id === releaseId) ?? null;
}

export async function fetchDurableReleaseBySlug(slug: string) {
  const catalog = await fetchDurableReleaseCatalog();
  return catalog.find((release) => release.slug === slug) ?? null;
}
