import "server-only";

import { getServerSupabase } from "@/server/supabase/client";

export type AudioVisualStatus = "draft" | "scheduled" | "published" | "archived";

export type AudioVisualRecord = {
  id: string;
  title: string;
  slug: string;
  youtubeUrl: string;
  youtubeVideoId: string;
  embedUrl: string;
  thumbnailUrl: string;
  releaseId?: string | null;
  trackId?: string | null;
  status: AudioVisualStatus;
  publishedAt?: string | null;
  sortOrder: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type AudioVisualWriteInput = {
  title: string;
  slug?: string;
  youtubeUrl: string;
  releaseId?: string | null;
  trackId?: string | null;
  status?: AudioVisualStatus;
  publishedAt?: string | null;
  sortOrder?: number;
  metadata?: Record<string, unknown>;
};

type AudioVisualRow = {
  id: string;
  title: string;
  slug: string;
  youtube_url: string;
  youtube_video_id: string;
  embed_url: string;
  thumbnail_url: string;
  release_id: string | null;
  track_id: string | null;
  status: AudioVisualStatus;
  published_at: string | null;
  sort_order: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

const youtubeVideoIdPattern = /^[A-Za-z0-9_-]{11}$/;
const memoryAudioVisuals = new Map<string, AudioVisualRecord>();

function nowIso() {
  return new Date().toISOString();
}

function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `visual-${Date.now()}`;
}

function uniqueSlug(baseSlug: string, existingId?: string) {
  const base = slugify(baseSlug);
  let next = base;
  let index = 2;

  while ([...memoryAudioVisuals.values()].some((visual) => visual.slug === next && visual.id !== existingId)) {
    next = `${base}-${index}`;
    index += 1;
  }

  return next;
}

function extractUrlFromMarkup(input: string) {
  const match = input.match(/\bsrc=["']([^"']+)["']/i);
  return match?.[1] ?? input;
}

function normalizeYoutubeInput(input: string) {
  const trimmed = extractUrlFromMarkup(input).trim();
  if (!trimmed) {
    throw new Error("YouTube URL is required");
  }

  if (youtubeVideoIdPattern.test(trimmed)) {
    return { videoId: trimmed };
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;

  try {
    url = new URL(withProtocol);
  } catch {
    throw new Error("Invalid YouTube URL");
  }

  const host = url.hostname.replace(/^www\./i, "").toLowerCase();
  const pathParts = url.pathname.split("/").filter(Boolean);
  let videoId: string | null = null;

  if (host === "youtu.be") {
    videoId = pathParts[0] ?? null;
  } else if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") {
      videoId = url.searchParams.get("v");
    } else if (["embed", "shorts", "live", "v"].includes(pathParts[0] ?? "")) {
      videoId = pathParts[1] ?? null;
    }
  }

  if (!videoId || !youtubeVideoIdPattern.test(videoId)) {
    throw new Error("Could not determine a valid YouTube video ID");
  }

  return { videoId };
}

export function parseYouTubeAudioVisualUrl(input: string) {
  const { videoId } = normalizeYoutubeInput(input);

  return {
    youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
    youtubeVideoId: videoId,
    embedUrl: `https://www.youtube.com/embed/${videoId}`,
    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
  };
}

function fromRow(row: AudioVisualRow): AudioVisualRecord {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    youtubeUrl: row.youtube_url,
    youtubeVideoId: row.youtube_video_id,
    embedUrl: row.embed_url,
    thumbnailUrl: row.thumbnail_url,
    releaseId: row.release_id,
    trackId: row.track_id,
    status: row.status,
    publishedAt: row.published_at,
    sortOrder: row.sort_order,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toRow(input: AudioVisualRecord) {
  return {
    id: input.id,
    title: input.title,
    slug: input.slug,
    youtube_url: input.youtubeUrl,
    youtube_video_id: input.youtubeVideoId,
    embed_url: input.embedUrl,
    thumbnail_url: input.thumbnailUrl,
    release_id: input.releaseId ?? null,
    track_id: input.trackId ?? null,
    status: input.status,
    published_at: input.publishedAt ?? null,
    sort_order: input.sortOrder,
    metadata: input.metadata,
    created_at: input.createdAt,
    updated_at: input.updatedAt
  };
}

function isPublicVisual(visual: AudioVisualRecord) {
  return visual.status === "published" && (!visual.publishedAt || visual.publishedAt <= nowIso());
}

function sortVisuals(a: AudioVisualRecord, b: AudioVisualRecord) {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt);
}

function buildRecord(input: AudioVisualWriteInput, existing?: AudioVisualRecord): AudioVisualRecord {
  const normalized = parseYouTubeAudioVisualUrl(input.youtubeUrl);
  const timestamp = nowIso();
  const status = input.status ?? existing?.status ?? "draft";
  const requestedPublishedAt = input.publishedAt !== undefined ? input.publishedAt : existing?.publishedAt ?? null;
  const publishedAt = status === "published" ? requestedPublishedAt ?? timestamp : requestedPublishedAt;

  return {
    id: existing?.id ?? crypto.randomUUID(),
    title: input.title.trim(),
    slug: uniqueSlug(input.slug ?? input.title, existing?.id),
    ...normalized,
    releaseId: input.releaseId !== undefined ? input.releaseId : existing?.releaseId ?? null,
    trackId: input.trackId !== undefined ? input.trackId : existing?.trackId ?? null,
    status,
    publishedAt,
    sortOrder: input.sortOrder ?? existing?.sortOrder ?? 0,
    metadata: input.metadata ?? existing?.metadata ?? {},
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp
  };
}

async function readRowsFromSupabase(publicOnly: boolean, limit: number) {
  const supabase = getServerSupabase();
  if (!supabase) return null;

  let query = supabase
    .from("audio_visuals")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (publicOnly) {
    query = query.eq("status", "published").or(`published_at.is.null,published_at.lte.${nowIso()}`);
  }

  const { data, error } = await query;
  if (error) return null;
  return (data as AudioVisualRow[]).map(fromRow);
}

export async function listAudioVisuals({
  publicOnly = false,
  limit = 24
}: { publicOnly?: boolean; limit?: number } = {}) {
  const persisted = await readRowsFromSupabase(publicOnly, limit);
  if (persisted) return persisted;

  return [...memoryAudioVisuals.values()]
    .filter((visual) => !publicOnly || isPublicVisual(visual))
    .sort(sortVisuals)
    .slice(0, limit);
}

export async function getAudioVisualBySlug(slug: string, { publicOnly = true }: { publicOnly?: boolean } = {}) {
  const rows = await listAudioVisuals({ publicOnly, limit: 100 });
  return rows.find((visual) => visual.slug === slug) ?? null;
}

export async function createAudioVisual(input: AudioVisualWriteInput) {
  const record = buildRecord(input);
  const supabase = getServerSupabase();

  if (supabase) {
    const { data, error } = await supabase.from("audio_visuals").insert(toRow(record)).select("*").single();
    if (!error && data) return fromRow(data as AudioVisualRow);
  }

  memoryAudioVisuals.set(record.id, record);
  return record;
}

export async function updateAudioVisual(id: string, input: Partial<AudioVisualWriteInput>) {
  const existing = memoryAudioVisuals.get(id) ?? (await listAudioVisuals({ publicOnly: false, limit: 100 })).find((visual) => visual.id === id);
  if (!existing) return null;

  const next = buildRecord(
    {
      title: input.title ?? existing.title,
      slug: input.slug ?? existing.slug,
      youtubeUrl: input.youtubeUrl ?? existing.youtubeUrl,
      releaseId: input.releaseId !== undefined ? input.releaseId : existing.releaseId,
      trackId: input.trackId !== undefined ? input.trackId : existing.trackId,
      status: input.status ?? existing.status,
      publishedAt: input.publishedAt !== undefined ? input.publishedAt : existing.publishedAt,
      sortOrder: input.sortOrder ?? existing.sortOrder,
      metadata: input.metadata ?? existing.metadata
    },
    existing
  );
  const supabase = getServerSupabase();

  if (supabase) {
    const { data, error } = await supabase.from("audio_visuals").update(toRow(next)).eq("id", id).select("*").single();
    if (!error && data) return fromRow(data as AudioVisualRow);
  }

  memoryAudioVisuals.set(id, next);
  return next;
}

export async function publishAudioVisual(id: string) {
  return updateAudioVisual(id, { status: "published", publishedAt: nowIso() });
}
