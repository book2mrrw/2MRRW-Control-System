import "server-only";

import { R2_BUCKET } from "@/lib/storage/r2";

import { parseYouTubeAudioVisualUrl } from "@/server/audio-visuals/audioVisualService";
import type { ReleaseType } from "@/server/release-management/taxonomies";

export type FrontendEcosystemPersistencePlan = {
  frontendPath: string;
  sources: {
    singles: number;
    albums: number;
    features: number;
    audioVisuals: number;
  };
  artists: Array<{ id: string; slug: string; name: string }>;
  releases: Array<{
    id: string;
    artistId: string;
    slug: string;
    title: string;
    releaseDate?: string;
    releaseType: ReleaseType;
    releaseCategory: "single" | "album" | "feature";
    status: "published";
    publishedAt: string;
  }>;
  tracks: Array<{
    id: string;
    releaseId: string;
    title: string;
    durationSeconds: number;
    position: number;
    audioState: "uploaded" | "missing";
  }>;
  mediaAssets: Array<{
    id: string;
    ownerType: string;
    ownerId: string;
    bucket: string;
    storagePath: string;
    accessLevel: string;
  }>;
  syncEvents: Array<{
    id: string;
    type: "release.updated";
    entityId: string;
    payload: Record<string, unknown>;
    createdAt: string;
  }>;
  audioVisuals: Array<{
    id: string;
    title: string;
    slug: string;
    youtubeUrl: string;
    youtubeVideoId: string;
    embedUrl: string;
    thumbnailUrl: string;
    releaseId: string | null;
    trackId: string | null;
    status: "published";
    publishedAt: string;
    sortOrder: number;
    metadata: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
  }>;
};

function sqlString(value: string | null | undefined) {
  if (value == null) return "null";
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlJson(value: unknown) {
  return `${sqlString(JSON.stringify(value))}::jsonb`;
}

function upsertArtists(plan: FrontendEcosystemPersistencePlan) {
  if (!plan.artists.length) return "";
  const values = plan.artists
    .map((row) => `(${sqlString(row.id)}::uuid, ${sqlString(row.slug)}, ${sqlString(row.name)})`)
    .join(",\n  ");
  return `-- artists
insert into public.artists (id, slug, name)
values
  ${values}
on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name;
`;
}

function upsertReleases(plan: FrontendEcosystemPersistencePlan) {
  if (!plan.releases.length) return "";
  const values = plan.releases
    .map((row) => {
      const releaseDate = row.releaseDate ? sqlString(row.releaseDate) : "null";
      const releaseCategory = row.releaseCategory ? sqlString(row.releaseCategory) : "null";
      return `(${sqlString(row.id)}::uuid, ${sqlString(row.artistId)}::uuid, ${sqlString(row.slug)}, ${sqlString(row.title)}, ${releaseDate}::date, ${sqlString(row.releaseType)}, ${releaseCategory}, ${sqlString(row.status)}, ${sqlString(row.publishedAt)}::timestamptz, 'public', 'uploaded', 'uploaded')`;
    })
    .join(",\n  ");
  return [
    `-- releases`,
    `insert into public.releases (id, artist_id, slug, title, release_date, release_type, release_category, status, published_at, visibility_state, cover_art_state, audio_assets_state)`,
    `values`,
    `  ${values}`,
    `on conflict (id) do update set`,
    `  artist_id = excluded.artist_id,`,
    `  slug = excluded.slug,`,
    `  title = excluded.title,`,
    `  release_date = excluded.release_date,`,
    `  release_type = excluded.release_type,`,
    `  release_category = excluded.release_category,`,
    `  status = excluded.status,`,
    `  published_at = excluded.published_at,`,
    `  visibility_state = excluded.visibility_state,`,
    `  cover_art_state = excluded.cover_art_state,`,
    `  audio_assets_state = excluded.audio_assets_state;`
  ].join("\n");
}

function upsertTracks(plan: FrontendEcosystemPersistencePlan) {
  if (!plan.tracks.length) return "";
  const values = plan.tracks
    .map((row) => `(${sqlString(row.id)}::uuid, ${sqlString(row.releaseId)}::uuid, ${sqlString(row.title)}, ${row.durationSeconds}, ${row.position}, false, ${sqlString(row.audioState)})`)
    .join(",\n  ");
  return `-- tracks
insert into public.tracks (id, release_id, title, duration_seconds, position, is_explicit, audio_state)
values
  ${values}
on conflict (id) do update set
  release_id = excluded.release_id,
  title = excluded.title,
  duration_seconds = excluded.duration_seconds,
  position = excluded.position,
  is_explicit = excluded.is_explicit,
  audio_state = excluded.audio_state;
`;
}

function upsertMediaAssets(plan: FrontendEcosystemPersistencePlan) {
  if (!plan.mediaAssets.length) return "";
  const values = plan.mediaAssets
    .map((row) => `(${sqlString(row.id)}::uuid, ${sqlString(row.ownerType)}, ${sqlString(row.ownerId)}::uuid, ${sqlString(row.bucket)}, ${sqlString(row.storagePath)}, ${sqlString(row.accessLevel)})`)
    .join(",\n  ");
  return `-- media_assets
insert into public.media_assets (id, owner_type, owner_id, bucket, storage_path, access_level)
values
  ${values}
on conflict (id) do update set
  owner_type = excluded.owner_type,
  owner_id = excluded.owner_id,
  bucket = excluded.bucket,
  storage_path = excluded.storage_path,
  access_level = excluded.access_level;
`;
}

function upsertAudioVisuals(plan: FrontendEcosystemPersistencePlan) {
  if (!plan.audioVisuals.length) return "";
  const values = plan.audioVisuals
    .map((row) => {
      const releaseId = row.releaseId ? `${sqlString(row.releaseId)}::uuid` : "null";
      const trackId = row.trackId ? `${sqlString(row.trackId)}::uuid` : "null";
      const publishedAt = row.publishedAt ? `${sqlString(row.publishedAt)}::timestamptz` : "null";
      return `(${sqlString(row.id)}::uuid, ${sqlString(row.title)}, ${sqlString(row.slug)}, ${sqlString(row.youtubeUrl)}, ${sqlString(row.youtubeVideoId)}, ${sqlString(row.embedUrl)}, ${sqlString(row.thumbnailUrl)}, ${releaseId}, ${trackId}, ${sqlString(row.status)}, ${publishedAt}, ${row.sortOrder}, ${sqlJson(row.metadata)}, ${sqlString(row.createdAt)}::timestamptz, ${sqlString(row.updatedAt)}::timestamptz)`;
    })
    .join(",\n  ");
  return `-- audio_visuals
insert into public.audio_visuals (
  id, title, slug, youtube_url, youtube_video_id, embed_url, thumbnail_url,
  release_id, track_id, status, published_at, sort_order, metadata, created_at, updated_at
)
values
  ${values}
on conflict (id) do update set
  title = excluded.title,
  slug = excluded.slug,
  youtube_url = excluded.youtube_url,
  youtube_video_id = excluded.youtube_video_id,
  embed_url = excluded.embed_url,
  thumbnail_url = excluded.thumbnail_url,
  release_id = excluded.release_id,
  track_id = excluded.track_id,
  status = excluded.status,
  published_at = excluded.published_at,
  sort_order = excluded.sort_order,
  metadata = excluded.metadata,
  updated_at = excluded.updated_at;
`;
}

function upsertSyncEvents(plan: FrontendEcosystemPersistencePlan) {
  if (!plan.syncEvents.length) return "";
  const values = plan.syncEvents
    .map((row) => `(${sqlString(row.id)}::uuid, ${sqlString(row.type)}, ${row.entityId ? `${sqlString(row.entityId)}` : "null"}, ${sqlJson(row.payload)}, ${sqlString(row.createdAt)}::timestamptz)`)
    .join(",\n  ");
  return `-- sync_events
insert into public.sync_events (id, type, entity_id, payload, created_at)
values
  ${values}
on conflict (id) do update set
  type = excluded.type,
  entity_id = excluded.entity_id,
  payload = excluded.payload,
  created_at = excluded.created_at;
`;
}

export function renderFrontendEcosystemSql(plan: FrontendEcosystemPersistencePlan) {
  return [
    "begin;",
    upsertArtists(plan),
    upsertReleases(plan),
    upsertTracks(plan),
    upsertMediaAssets(plan),
    upsertAudioVisuals(plan),
    upsertSyncEvents(plan),
    "commit;"
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function renderFrontendEcosystemSqlChunks(plan: FrontendEcosystemPersistencePlan, mediaChunkSize = 35) {
  const wrap = (body: string) => ["begin;", body, "commit;"].filter(Boolean).join("\n\n");
  const chunks: string[] = [
    wrap([upsertArtists(plan), upsertReleases(plan), upsertTracks(plan)].filter(Boolean).join("\n\n")),
    ...chunkArray(plan.mediaAssets, mediaChunkSize).map((assets, index) => {
      const subset: FrontendEcosystemPersistencePlan = { ...plan, mediaAssets: assets };
      const header = `-- media_assets chunk ${index + 1}`;
      return wrap([header, upsertMediaAssets(subset)].filter(Boolean).join("\n\n"));
    }),
    wrap([upsertAudioVisuals(plan), upsertSyncEvents(plan)].filter(Boolean).join("\n\n"))
  ].filter((chunk) => chunk.trim().length > 0);

  return chunks;
}

function chunkArray<T>(items: T[], size: number) {
  if (!items.length) return [] as T[][];
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export function buildAudioVisualPersistenceRow(input: {
  id: string;
  title: string;
  slug: string;
  youtubeUrl: string;
  status: FrontendEcosystemPersistencePlan["audioVisuals"][number]["status"];
  sortOrder: number;
  metadata: Record<string, unknown>;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}): FrontendEcosystemPersistencePlan["audioVisuals"][number] {
  const normalized = parseYouTubeAudioVisualUrl(input.youtubeUrl);
  return {
    id: input.id,
    title: input.title,
    slug: input.slug,
    youtubeUrl: normalized.youtubeUrl,
    youtubeVideoId: normalized.youtubeVideoId,
    embedUrl: normalized.embedUrl,
    thumbnailUrl: normalized.thumbnailUrl,
    releaseId: null,
    trackId: null,
    status: input.status,
    publishedAt: input.publishedAt ?? input.updatedAt,
    sortOrder: input.sortOrder,
    metadata: input.metadata,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt
  };
}
