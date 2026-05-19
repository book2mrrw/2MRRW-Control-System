import "server-only";

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { buildAudioVisualPersistenceRow, type FrontendEcosystemPersistencePlan } from "@/server/release-management/frontendReleaseSqlExport";
import { createAudioVisual, listAudioVisuals, updateAudioVisual } from "@/server/audio-visuals/audioVisualService";
import { persistSyncEvent } from "@/server/events/syncEventPersistenceService";
import { upsertImportedMediaAsset } from "@/server/media/uploadIntentService";
import { hydrateReleaseManagementFromSupabase } from "@/server/release-management/releaseCatalogHydrationService";
import { linkReleaseMediaFromPlan } from "@/server/release-management/releaseMediaLinkService";
import { listReleaseDrafts, upsertImportedReleaseDraft } from "@/server/release-management/releaseManagementService";
import { publishImportedReleaseToCatalog } from "@/server/releases/releaseService";
import { getServerSupabase } from "@/server/supabase/client";
import type { ReleaseType } from "@/server/release-management/taxonomies";

type FrontendReleaseItem = {
  title: string;
  slug: string;
  cover?: string;
  video?: string;
  preview?: string;
  price?: number;
  priceCents?: number;
  date?: string;
  releaseDate?: string;
  featuring?: string;
  tracks?: string[];
};

type FrontendVideoItem = {
  id?: string;
  title: string;
  youtubeId?: string;
  youtubeUrl?: string;
  description?: string;
};

type ManifestRelease = {
  slug: string;
  displayTitle?: string;
  priceCents?: number;
  releaseDate?: string;
  assets?: Array<{
    kind: string;
    storagePath: string;
    localSourcePath?: string;
  }>;
  tracks?: string[];
};

type Manifest = {
  singles?: ManifestRelease[];
  albums?: ManifestRelease[];
  albumTrackAssetPattern?: Record<string, string>;
};

type ImportedReleaseItem = FrontendReleaseItem & {
  priceCents?: number;
  releaseDate?: string;
  fullAudio?: string;
  tracks: string[];
};

export type { FrontendEcosystemPersistencePlan } from "@/server/release-management/frontendReleaseSqlExport";

export type FrontendReleaseIngestionResult = {
  ok: boolean;
  frontendPath: string | null;
  sources: {
    singles: number;
    albums: number;
    features: number;
    audioVisuals: number;
  };
  imported: {
    releases: number;
    mediaAssets: number;
    audioVisuals: number;
  };
  persisted: {
    releases: number;
    tracks: number;
    mediaAssets: number;
    syncEvents: number;
  };
  updated: {
    releases: number;
    audioVisuals: number;
  };
  messages: string[];
};

const candidateFrontendPaths = [
  process.env.FRONTEND_REPO_PATH,
  "/Users/recharge/2mrrw-Official",
  "/Users/recharge/2mrrw-frontend",
  "/Users/recharge/artist-platform"
].filter(Boolean) as string[];

let importOncePromise: Promise<FrontendReleaseIngestionResult> | null = null;

function stableUuid(parts: string[]) {
  const hex = createHash("sha1").update(parts.join(":")).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeStoragePath(value?: string) {
  if (!value) return "";
  return value.replace(/^\/+/, "");
}

function extension(pathname: string) {
  return pathname.split(".").pop()?.toLowerCase() ?? "";
}

function mediaTypeForPath(pathname: string): "image" | "audio" | "video" | "document" {
  const ext = extension(pathname);
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "image";
  if (["mp4", "mov", "webm"].includes(ext)) return "video";
  if (["mp3", "wav", "m4a", "flac", "aiff", "aif"].includes(ext)) return "audio";
  return "document";
}

function canonicalAssetPath(kind: string, releaseId: string, trackId: string | undefined, sourcePath: string) {
  const fileName = sourcePath.split("/").pop() ?? `${kind}.${extension(sourcePath)}`;
  if (kind === "cover" || kind === "album-cover") return `artwork/${releaseId}/${fileName}`;
  if (kind === "visual") return `loops/${releaseId}/${fileName}`;
  if (kind === "preview") return `previews/${releaseId}/${trackId ?? "release"}/${fileName}`;
  if (kind === "audio") return `masters/${releaseId}/${trackId ?? "release"}/${fileName}`;
  if (kind === "lyrics") return `lyrics/${releaseId}/${trackId ?? "release"}/${fileName}`;
  return `vault/${releaseId}/${fileName}`;
}

async function pathExists(candidate: string) {
  try {
    await access(candidate);
    return true;
  } catch {
    return false;
  }
}

async function resolveFrontendPath() {
  for (const candidate of candidateFrontendPaths) {
    if (await pathExists(path.join(candidate, "package.json"))) return candidate;
  }
  return null;
}

function extractConstArray<T>(source: string, constName: string): T[] {
  const start = source.indexOf(`const ${constName} = [`);
  if (start < 0) return [];
  const arrayStart = source.indexOf("[", start);
  let depth = 0;
  let inString: string | null = null;
  let escaped = false;

  for (let index = arrayStart; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === inString) {
        inString = null;
      }
      continue;
    }
    if (char === "\"" || char === "'" || char === "`") {
      inString = char;
      continue;
    }
    if (char === "[") depth += 1;
    if (char === "]") depth -= 1;
    if (depth === 0) {
      const literal = source.slice(arrayStart, index + 1);
      return Function(`"use strict"; return (${literal});`)() as T[];
    }
  }

  return [];
}

function parseReleaseDate(value?: string) {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10);
}

function manifestAsset(manifestRelease: ManifestRelease | undefined, kind: string) {
  return manifestRelease?.assets?.find((asset) => asset.kind === kind);
}

function titleFromTrackSlug(slug: string) {
  return slug.replace(/^\d+-/, "").split("-").map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`).join(" ");
}

function trackSlugParts(slug: string, index: number) {
  const match = /^(\d+)-(.+)$/.exec(slug);
  return {
    trackNumber: match?.[1] ?? String(index + 1).padStart(2, "0"),
    trackSlug: match?.[2] ?? slug.replace(/^\d+-/, "")
  };
}

function manifestTrackAssetPath(manifest: Manifest, manifestRelease: ManifestRelease | undefined, kind: "audio" | "preview" | "visual" | "lyrics", index: number) {
  const trackSlug = manifestRelease?.tracks?.[index];
  const pattern = manifest.albumTrackAssetPattern?.[kind];
  if (!manifestRelease || !trackSlug || !pattern) return undefined;
  const parts = trackSlugParts(trackSlug, index);
  return pattern
    .replaceAll("{albumSlug}", manifestRelease.slug)
    .replaceAll("{trackNumber}", parts.trackNumber)
    .replaceAll("{trackSlug}", parts.trackSlug);
}

function releaseTypeForImportedItem(sourceType: ReleaseType, item: Pick<ImportedReleaseItem, "tracks">): ReleaseType {
  if (sourceType === "album") {
    const count = item.tracks.length;
    if (count >= 2 && count <= 6) return "ep";
    return "album";
  }
  return sourceType;
}

function frontendSectionsForReleaseType(releaseType: ReleaseType) {
  if (releaseType === "single") return ["latest_singles", "music_singles"];
  if (releaseType === "feature") return ["features", "music_features"];
  if (releaseType === "ep") return ["eps", "music_eps"];
  return ["albums", "music_albums"];
}

function mergeManifestRelease(item: FrontendReleaseItem, manifestRelease: ManifestRelease | undefined): ImportedReleaseItem {
  return {
    ...item,
    title: item.title || manifestRelease?.displayTitle || item.slug,
    priceCents: item.priceCents ?? manifestRelease?.priceCents ?? (typeof item.price === "number" ? Math.round(item.price * 100) : undefined),
    releaseDate: parseReleaseDate(item.releaseDate ?? manifestRelease?.releaseDate ?? item.date),
    cover: normalizeStoragePath(item.cover) || manifestAsset(manifestRelease, "cover")?.storagePath || manifestAsset(manifestRelease, "album-cover")?.storagePath,
    video: normalizeStoragePath(item.video) || manifestAsset(manifestRelease, "visual")?.storagePath,
    preview: normalizeStoragePath(item.preview) || manifestAsset(manifestRelease, "preview")?.storagePath,
    fullAudio: manifestAsset(manifestRelease, "audio")?.storagePath,
    tracks: item.tracks ?? manifestRelease?.tracks?.map(titleFromTrackSlug) ?? [item.title]
  };
}

function releaseAssetInputs(input: {
  releaseId: string;
  trackId: string;
  releaseType: ReleaseType;
  item: ImportedReleaseItem;
  sections: string[];
}) {
  const coverCategory = input.releaseType === "album" || input.releaseType === "ep" ? "album_cover_art" : input.releaseType === "feature" ? "features" : "single_cover_art";
  return [
    input.item.cover ? { kind: "cover", category: coverCategory, path: input.item.cover, trackId: undefined } : null,
    input.item.video ? { kind: "visual", category: "audio_visual", path: input.item.video, trackId: undefined } : null,
    input.item.preview ? { kind: "preview", category: "audio_preview", path: input.item.preview, trackId: input.trackId } : null,
    input.item.fullAudio ? { kind: "audio", category: "audio_full_song", path: input.item.fullAudio, trackId: input.trackId } : null
  ].filter(Boolean) as Array<{ kind: string; category: Parameters<typeof upsertImportedMediaAsset>[0]["category"]; path: string; trackId?: string }>;
}

function trackAssetInputs(input: {
  manifest: Manifest;
  manifestRelease?: ManifestRelease;
  trackId: string;
  trackIndex: number;
}) {
  return [
    manifestTrackAssetPath(input.manifest, input.manifestRelease, "preview", input.trackIndex)
      ? { kind: "preview", category: "audio_preview" as const, path: manifestTrackAssetPath(input.manifest, input.manifestRelease, "preview", input.trackIndex)!, trackId: input.trackId }
      : null,
    manifestTrackAssetPath(input.manifest, input.manifestRelease, "audio", input.trackIndex)
      ? { kind: "audio", category: "audio_full_song" as const, path: manifestTrackAssetPath(input.manifest, input.manifestRelease, "audio", input.trackIndex)!, trackId: input.trackId }
      : null
  ].filter(Boolean) as Array<{ kind: string; category: Parameters<typeof upsertImportedMediaAsset>[0]["category"]; path: string; trackId: string }>;
}

function normalizeArtistId(artistId: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(artistId)
    ? artistId
    : stableUuid(["artist", artistId]);
}

const FRONTEND_IMPORT_PUBLISHED_AT = "2026-05-18T12:00:00.000Z";

export async function buildFrontendEcosystemPersistencePlan(): Promise<FrontendEcosystemPersistencePlan | null> {
  const frontendPath = await resolveFrontendPath();
  if (!frontendPath) return null;

  const [pageSource, manifestSource] = await Promise.all([
    readFile(path.join(frontendPath, "src/app/page.js"), "utf8"),
    readFile(path.join(frontendPath, "storage/digital-assets.manifest.json"), "utf8").catch(() => "{}")
  ]);
  const manifest = JSON.parse(manifestSource) as Manifest;
  const singles = extractConstArray<FrontendReleaseItem>(pageSource, "singles");
  const albums = extractConstArray<FrontendReleaseItem>(pageSource, "albums");
  const features = extractConstArray<FrontendReleaseItem>(pageSource, "features");
  const musicVideos = extractConstArray<FrontendVideoItem>(pageSource, "musicVideos");
  const releaseBatches = [
    ...singles.map((item) => ({ item, sourceReleaseType: "single" as const, manifestRelease: manifest.singles?.find((row) => row.slug === item.slug) })),
    ...albums.map((item) => ({ item, sourceReleaseType: "album" as const, manifestRelease: manifest.albums?.find((row) => row.slug === item.slug) })),
    ...features.map((item) => ({ item, sourceReleaseType: "feature" as const, manifestRelease: undefined }))
  ];

  const plan: FrontendEcosystemPersistencePlan = {
    frontendPath,
    sources: {
      singles: singles.length,
      albums: albums.length,
      features: features.length,
      audioVisuals: musicVideos.length
    },
    artists: [],
    releases: [],
    tracks: [],
    mediaAssets: [],
    syncEvents: [],
    audioVisuals: []
  };

  for (const batch of releaseBatches) {
    const item = mergeManifestRelease(batch.item, batch.manifestRelease);
    const releaseType = releaseTypeForImportedItem(batch.sourceReleaseType, item);
    const sections = frontendSectionsForReleaseType(releaseType);
    const releaseCategory = releaseType === "feature" ? "feature" : releaseType === "single" ? "single" : "album";
    const sourceKey = `frontend:${sections[0]}:${item.slug}`;
    const releaseId = stableUuid(["release", sourceKey]);
    const trackTitles = item.tracks?.length ? item.tracks : [item.title];
    const tracks = trackTitles.map((title, index) => ({
      id: stableUuid(["track", sourceKey, String(index + 1), title]),
      title,
      position: index + 1,
      audioFile: index === 0 ? item.fullAudio ?? item.preview : manifestTrackAssetPath(manifest, batch.manifestRelease, "audio", index) ?? manifestTrackAssetPath(manifest, batch.manifestRelease, "preview", index),
      previewAudioFile: index === 0 ? item.preview : manifestTrackAssetPath(manifest, batch.manifestRelease, "preview", index),
      fullAudioFile: index === 0 ? item.fullAudio : manifestTrackAssetPath(manifest, batch.manifestRelease, "audio", index),
      audioState: (index === 0 && (item.fullAudio || item.preview)) || manifestTrackAssetPath(manifest, batch.manifestRelease, "audio", index) || manifestTrackAssetPath(manifest, batch.manifestRelease, "preview", index) ? "uploaded" as const : "missing" as const
    }));
    const draft = upsertImportedReleaseDraft({
      id: releaseId,
      slug: item.slug,
      title: item.title,
      releaseType,
      status: "published",
      visibilityState: "public",
      originalReleaseDate: item.releaseDate,
      tracks,
      tags: releaseType === "feature" ? ["feature"] : [],
      coverArtPath: item.cover,
      motionArtworkPath: item.video,
      frontendSections: sections,
      sourceKey,
      metadataNotes: JSON.stringify({
        source: "frontend_import",
        sourceKey,
        frontendPath,
        frontendSections: sections,
        priceCents: item.priceCents,
        featuring: item.featuring,
        originalPaths: {
          cover: item.cover,
          video: item.video,
          preview: item.preview,
          fullAudio: item.fullAudio
        }
      })
    });
    publishImportedReleaseToCatalog(releaseId);

    const artistId = normalizeArtistId(draft.artistId);
    const artistSlug = slugify(draft.artistName);
    if (!plan.artists.some((artist) => artist.id === artistId)) {
      plan.artists.push({ id: artistId, slug: artistSlug, name: draft.artistName });
    }

    const persistedReleaseType = releaseType === "feature" ? "single" : releaseType;
    plan.releases.push({
      id: releaseId,
      artistId,
      slug: draft.slug,
      title: draft.title,
      releaseDate: item.releaseDate,
      releaseType: persistedReleaseType,
      releaseCategory,
      status: "published",
      publishedAt: FRONTEND_IMPORT_PUBLISHED_AT
    });
    plan.tracks.push(...draft.tracks.map((track) => ({
      id: track.id,
      releaseId,
      title: track.title,
      durationSeconds: 0,
      position: track.position,
      audioState: "uploaded" as const
    })));

    const firstTrack = draft.tracks[0];
    const appendMedia = (asset: { kind: string; category: Parameters<typeof upsertImportedMediaAsset>[0]["category"]; path: string; trackId?: string }) => {
      const assetId = stableUuid(["media", sourceKey, asset.kind, asset.path]);
      const canonicalPath = canonicalAssetPath(asset.kind, releaseId, asset.trackId, asset.path);
      const record = upsertImportedMediaAsset({
        id: assetId,
        category: asset.category,
        releaseId,
        trackId: asset.trackId,
        path: canonicalPath,
        sourcePath: asset.path,
        mediaType: mediaTypeForPath(asset.path)
      });
      plan.mediaAssets.push({
        id: record.id,
        ownerType: record.ownerType,
        ownerId: record.ownerId,
        bucket: "protected-media",
        storagePath: record.path,
        accessLevel: record.access
      });
    };

    if (firstTrack) {
      for (const asset of releaseAssetInputs({ releaseId, trackId: firstTrack.id, releaseType, item, sections })) {
        appendMedia(asset);
      }
    }
    for (const [trackIndex, track] of draft.tracks.entries()) {
      for (const asset of trackAssetInputs({ manifest, manifestRelease: batch.manifestRelease, trackId: track.id, trackIndex })) {
        appendMedia(asset);
      }
    }

    const syncEventId = stableUuid(["sync_event", releaseId, "release.updated"]);
    plan.syncEvents.push({
      id: syncEventId,
      type: "release.updated",
      entityId: releaseId,
      payload: {
        id: syncEventId,
        type: "release.updated",
        entityId: releaseId,
        timestamp: Date.parse(FRONTEND_IMPORT_PUBLISHED_AT),
        data: { releaseId, slug: draft.slug, source: "frontend_import", frontendSections: sections }
      },
      createdAt: FRONTEND_IMPORT_PUBLISHED_AT
    });
  }

  for (const [index, visual] of musicVideos.entries()) {
    const youtubeUrl = visual.youtubeUrl ?? (visual.youtubeId ? `https://www.youtube.com/watch?v=${visual.youtubeId}` : "");
    if (!youtubeUrl) continue;
    const slug = slugify(visual.title);
    const sourceKey = `frontend:audio_visuals:${visual.id ?? visual.youtubeId ?? slug}`;
    const visualId = stableUuid(["audio_visual", sourceKey]);
    plan.audioVisuals.push(buildAudioVisualPersistenceRow({
      id: visualId,
      title: visual.title,
      slug,
      youtubeUrl,
      status: "published",
      sortOrder: index,
      metadata: {
        source: "frontend_import",
        sourceKey,
        description: visual.description,
        frontendSection: "audio_visuals"
      },
      publishedAt: FRONTEND_IMPORT_PUBLISHED_AT,
      createdAt: FRONTEND_IMPORT_PUBLISHED_AT,
      updatedAt: FRONTEND_IMPORT_PUBLISHED_AT
    }));
  }

  return plan;
}

async function persistReleaseRows(input: {
  releaseId: string;
  artistId: string;
  artistName: string;
  slug: string;
  title: string;
  releaseDate?: string;
  releaseType: ReleaseType;
  tracks: Array<{ id: string; title: string; position: number }>;
  media: Array<{ id: string; ownerType: string; ownerId: string; path: string; access: string }>;
  releaseCategory: "single" | "album" | "feature";
}) {
  const supabase = getServerSupabase();
  const persisted = { releases: 0, tracks: 0, mediaAssets: 0 };
  if (!supabase) return persisted;

  const artistId = normalizeArtistId(input.artistId);
  const artist = await supabase.from("artists").upsert({
    id: artistId,
    slug: slugify(input.artistName),
    name: input.artistName
  }, { onConflict: "id" });
  if (artist.error) return persisted;

  const releaseType = input.releaseType === "feature" ? "single" : input.releaseType;
  const releasePayload = {
    id: input.releaseId,
    artist_id: artistId,
    slug: input.slug,
    title: input.title,
    release_date: input.releaseDate ?? null,
    release_type: releaseType,
    release_category: input.releaseCategory,
    status: "published",
    published_at: new Date().toISOString()
  };
  let release = await supabase.from("releases").upsert(releasePayload, { onConflict: "id" });
  if (release.error && /release_category/i.test(release.error.message ?? "")) {
    const legacyPayload: Omit<typeof releasePayload, "release_category"> = {
      id: releasePayload.id,
      artist_id: releasePayload.artist_id,
      slug: releasePayload.slug,
      title: releasePayload.title,
      release_date: releasePayload.release_date,
      release_type: releasePayload.release_type,
      status: releasePayload.status,
      published_at: releasePayload.published_at
    };
    release = await supabase.from("releases").upsert(legacyPayload, { onConflict: "id" });
  }
  if (release.error) return persisted;
  persisted.releases = 1;

  const tracks = await supabase.from("tracks").upsert(input.tracks.map((track) => ({
    id: track.id,
    release_id: input.releaseId,
    title: track.title,
    duration_seconds: 0,
    position: track.position,
    audio_state: "uploaded"
  })), { onConflict: "id" });
  if (tracks.error) return persisted;
  persisted.tracks = input.tracks.length;

  if (!input.media.length) return persisted;
  const media = await supabase.from("media_assets").upsert(input.media.map((asset) => ({
    id: asset.id,
    owner_type: asset.ownerType,
    owner_id: asset.ownerId,
    bucket: "protected-media",
    storage_path: asset.path,
    access_level: asset.access
  })), { onConflict: "id" });
  if (!media.error) persisted.mediaAssets = input.media.length;
  return persisted;
}

export async function ingestFrontendReleaseEcosystem(): Promise<FrontendReleaseIngestionResult> {
  const plan = await buildFrontendEcosystemPersistencePlan();
  const result: FrontendReleaseIngestionResult = {
    ok: Boolean(plan),
    frontendPath: plan?.frontendPath ?? null,
    sources: plan?.sources ?? { singles: 0, albums: 0, features: 0, audioVisuals: 0 },
    imported: { releases: 0, mediaAssets: 0, audioVisuals: 0 },
    persisted: { releases: 0, tracks: 0, mediaAssets: 0, syncEvents: 0 },
    updated: { releases: 0, audioVisuals: 0 },
    messages: []
  };
  if (!plan) {
    result.messages.push("No readable frontend repository was found.");
    return result;
  }

  result.imported.releases = plan.releases.length;
  result.imported.mediaAssets = plan.mediaAssets.length;
  result.imported.audioVisuals = plan.audioVisuals.length;

  for (const release of plan.releases) {
    const releaseTracks = plan.tracks.filter((track) => track.releaseId === release.id);
    const releaseMedia = plan.mediaAssets.filter((asset) => asset.ownerId === release.id || releaseTracks.some((track) => track.id === asset.ownerId));
    const persisted = await persistReleaseRows({
      releaseId: release.id,
      artistId: release.artistId,
      artistName: plan.artists.find((artist) => artist.id === release.artistId)?.name ?? "2MRRW",
      slug: release.slug,
      title: release.title,
      releaseDate: release.releaseDate,
      releaseType: release.releaseType,
      releaseCategory: release.releaseCategory,
      tracks: releaseTracks.map((track) => ({ id: track.id, title: track.title, position: track.position })),
      media: releaseMedia.map((asset) => ({
        id: asset.id,
        ownerType: asset.ownerType,
        ownerId: asset.ownerId,
        path: asset.storagePath,
        access: asset.accessLevel
      }))
    });
    result.persisted.releases += persisted.releases;
    result.persisted.tracks += persisted.tracks;
    result.persisted.mediaAssets += persisted.mediaAssets;
  }

  let releaseMediaLinks = 0;
  try {
    releaseMediaLinks = await linkReleaseMediaFromPlan(plan, `ingest_${Date.now()}`);
    if (releaseMediaLinks > 0) {
      result.messages.push(`Linked ${releaseMediaLinks} release_media row(s).`);
    }
  } catch (error) {
    result.messages.push(error instanceof Error ? error.message : "release_media linking failed");
  }

  for (const event of plan.syncEvents) {
    const syncEvent = await persistSyncEvent({
      type: event.type,
      entityId: event.entityId,
      timestamp: Date.parse(event.createdAt),
      data: event.payload.data as Record<string, unknown>
    });
    if (syncEvent.persisted) result.persisted.syncEvents += 1;
  }

  const existingVisuals = await listAudioVisuals({ publicOnly: false, limit: 200 });
  for (const visual of plan.audioVisuals) {
    const existing = existingVisuals.find((item) => item.slug === visual.slug || item.youtubeVideoId === visual.youtubeVideoId);
    const payload = {
      title: visual.title,
      slug: visual.slug,
      youtubeUrl: visual.youtubeUrl,
      status: visual.status,
      sortOrder: visual.sortOrder,
      metadata: visual.metadata
    };
    if (existing) {
      await updateAudioVisual(existing.id, payload);
      result.updated.audioVisuals += 1;
    } else {
      await createAudioVisual(payload);
    }
  }

  if (result.imported.releases === 0 && result.imported.audioVisuals === 0 && result.updated.audioVisuals === 0) {
    result.messages.push("No frontend release records were discovered.");
  } else {
    result.messages.push("Frontend release ecosystem ingestion completed.");
  }
  if (!getServerSupabase()) {
    result.messages.push("Supabase server persistence was skipped because NEXT_PUBLIC_SUPABASE_URL plus SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY are not configured.");
  } else if (result.imported.releases > 0 && result.persisted.releases === 0) {
    result.messages.push("Supabase release persistence did not complete; apply migrations through 0010_frontend_ecosystem_reconstruction.sql and rerun the import.");
  }
  return result;
}

type HydrationResult = Awaited<ReturnType<typeof doHydrate>>;

let hydrationPromise: Promise<HydrationResult> | null = null;

async function doHydrate() {
  const hydrated = await hydrateReleaseManagementFromSupabase();
  if (hydrated.hydrated && hydrated.releases > 0) {
    return hydrated;
  }
  if (listReleaseDrafts().length > 0) {
    return { hydrated: true, releases: listReleaseDrafts().length, tracks: 0, mediaAssets: 0, message: "Using in-memory catalog." };
  }
  importOncePromise ??= ingestFrontendReleaseEcosystem();
  const ingested = await importOncePromise;
  if (ingested?.imported.releases) {
    return {
      hydrated: true,
      releases: ingested.imported.releases,
      tracks: ingested.persisted.tracks,
      mediaAssets: ingested.persisted.mediaAssets,
      message: ingested.messages.join(" ")
    };
  }
  return hydrated;
}

export async function ensureCatalogHydrated() {
  if (!hydrationPromise) hydrationPromise = doHydrate();
  return hydrationPromise;
}

export async function ensureFrontendReleaseEcosystemImported() {
  if (!hydrationPromise) hydrationPromise = doHydrate();
  return hydrationPromise;
}
