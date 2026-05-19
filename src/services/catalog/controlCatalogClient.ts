export type DurableCatalogTrack = {
  id: string;
  title: string;
  position: number;
  durationSeconds: number;
  audioState?: string | null;
  previewAssetId?: string | null;
  audioAssetId?: string | null;
  previewUrl?: string | null;
  audioUrl?: string | null;
  lyricsText?: string | null;
};

export type DurableCatalogReleaseMedia = {
  id: string;
  assetRole: string;
  isPrimary: boolean;
  storagePath: string;
  mediaAssetId: string;
  trackId?: string | null;
  version?: number;
  mediaSection?: string | null;
  frontendRoute?: string | null;
  syncTarget?: string | null;
  cacheGroup?: string | null;
  frontendDestinations?: string[];
};

export type ReleaseLiveStatus = "live" | "scheduled" | "draft" | "sync_error";

export type ReleasePrimaryAsset = {
  type: "mp4" | "webm" | "mov" | "jpg" | "png" | "gif" | "avif";
  src: string;
  poster?: string;
  loop?: boolean;
  muted?: boolean;
  autoplay?: boolean;
};

export type DurableCatalogRelease = {
  id: string;
  slug: string;
  title: string;
  artistName?: string;
  releaseDate?: string | null;
  releaseType?: string | null;
  releaseCategory?: string | null;
  status?: string | null;
  scheduledPublishAt?: string | null;
  publishTimezone?: string | null;
  releaseTime?: string | null;
  scheduleLastError?: string | null;
  liveStatus?: ReleaseLiveStatus;
  liveStatusReasons?: string[];
  updatedAt?: string | null;
  coverAssetId?: string | null;
  coverUrl?: string | null;
  loopAssetId?: string | null;
  loopUrl?: string | null;
  motionUrl?: string | null;
  posterUrl?: string | null;
  primaryAsset?: ReleasePrimaryAsset | null;
  tracks: DurableCatalogTrack[];
  releaseMedia?: DurableCatalogReleaseMedia[];
  credits?: Array<{ id: string; name: string; role: string }>;
  distribution?: Array<{ id: string; provider: string; url: string }>;
};

export type ControlUiRelease = {
  id: string;
  slug: string;
  title: string;
  type: "Album" | "Single" | "EP" | "Deluxe";
  status: "Scheduled" | "Released" | "Draft" | "Rejected";
  date: string;
  tracks: number;
  updatedAt?: string | null;
  coverUrl?: string | null;
  loopUrl?: string | null;
  motionUrl?: string | null;
  posterUrl?: string | null;
  primaryAsset?: ReleasePrimaryAsset | null;
  emoji: string;
  grad: string;
};

const GRADIENTS = [
  "135deg,#4C1D95,#8B55F6",
  "135deg,#1E3A5F,#3B82F6",
  "135deg,#064E3B,#10B981",
  "135deg,#7F1D1D,#EF4444",
  "135deg,#78350F,#F59E0B",
  "135deg,#111827,#374151"
] as const;

function catalogSeed(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function visualForTitle(title: string, id: string) {
  const seed = catalogSeed(id || title);
  const emoji = (title.trim()[0] || "♪").toUpperCase();
  return { emoji, grad: GRADIENTS[seed % GRADIENTS.length] };
}

function mapReleaseType(releaseType?: string | null, trackCount = 0): ControlUiRelease["type"] {
  if (releaseType === "single" || releaseType === "feature") return "Single";
  if (releaseType === "ep") return "EP";
  if (releaseType === "deluxe") return "Deluxe";
  if (releaseType === "album" && trackCount >= 2 && trackCount <= 6) return "EP";
  return "Album";
}

function mapReleaseStatus(status?: string | null): ControlUiRelease["status"] {
  if (status === "published") return "Released";
  if (status === "scheduled") return "Scheduled";
  if (status === "draft" || status === "metadata_incomplete" || status === "assets_pending") return "Draft";
  if (status === "archived") return "Rejected";
  return "Released";
}

export function mapCatalogReleaseToUi(release: DurableCatalogRelease): ControlUiRelease {
  const visual = visualForTitle(release.title, release.id);
  return {
    id: release.id,
    slug: release.slug,
    title: release.title,
    type: mapReleaseType(release.releaseType, release.tracks?.length ?? 0),
    status: mapReleaseStatus(release.status),
    date: release.releaseDate?.slice(0, 10) ?? "Date TBD",
    tracks: release.tracks?.length ?? 0,
    updatedAt: release.updatedAt,
    coverUrl: release.posterUrl ?? release.coverUrl,
    loopUrl: release.motionUrl ?? release.loopUrl,
    motionUrl: release.motionUrl ?? release.loopUrl,
    posterUrl: release.posterUrl,
    primaryAsset: release.primaryAsset,
    emoji: visual.emoji,
    grad: visual.grad
  };
}

export function mapCatalogReleasesToUi(releases: DurableCatalogRelease[]) {
  return releases.map(mapCatalogReleaseToUi);
}

function mapLegacyApiReleases(rows: unknown[]): DurableCatalogRelease[] {
  return rows.map((row) => {
    const release = row as {
      id: string;
      slug: string;
      title: string;
      releaseDate?: string;
      releaseType?: string;
      status?: string;
      artwork?: { id?: string; sourcePath?: string };
      tracks?: Array<{
        id: string;
        title: string;
        position: number;
        durationSeconds?: number;
        assets?: Record<string, { id?: string; sourcePath?: string } | undefined>;
      }>;
    };
    return {
      id: release.id,
      slug: release.slug,
      title: release.title,
      releaseDate: release.releaseDate,
      releaseType: release.releaseType,
      status: release.status,
      coverAssetId: release.artwork?.id,
      tracks: (release.tracks ?? []).map((track) => ({
        id: track.id,
        title: track.title,
        position: track.position,
        durationSeconds: track.durationSeconds ?? 0,
        previewAssetId: track.assets?.preview?.id,
        audioAssetId: track.assets?.full?.id
      }))
    };
  });
}

export async function fetchControlCatalogReleases() {
  const response = await fetch("/api/admin/catalog", { cache: "no-store" });
  if (response.ok) {
    const payload = (await response.json()) as { data?: DurableCatalogRelease[] };
    return payload.data ?? [];
  }
  const fallback = await fetch("/api/releases?limit=100", { cache: "no-store" });
  if (!fallback.ok) return [];
  const payload = (await fallback.json()) as { data?: unknown[] };
  return mapLegacyApiReleases(payload.data ?? []);
}
