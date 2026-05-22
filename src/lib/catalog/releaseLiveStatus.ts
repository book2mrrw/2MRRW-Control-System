import { resolveMediaSyncRoute } from "@/services/sync/mediaSyncContract";

export type ReleaseLiveStatus = "live" | "scheduled" | "draft" | "sync_error";

export type ReleaseLiveStatusMediaLink = {
  assetRole: string;
  isPrimary?: boolean;
  frontendRoute?: string | null;
  syncTarget?: string | null;
  frontendDestinations?: string[];
};

export type ReleaseLiveStatusTrack = {
  audioAssetId?: string | null;
  audioUrl?: string | null;
  audioState?: string | null;
  previewAssetId?: string | null;
};

export type ReleaseLiveStatusInput = {
  id: string;
  slug: string;
  status?: string | null;
  releaseType?: string | null;
  scheduledPublishAt?: string | null;
  scheduleLastError?: string | null;
  publishedAt?: string | null;
  coverUrl?: string | null;
  coverAssetId?: string | null;
  tracks: ReleaseLiveStatusTrack[];
  releaseMedia?: ReleaseLiveStatusMediaLink[];
};

export type SyncStateSlice = {
  key: string;
  dirty: boolean;
  metadata?: Record<string, unknown>;
  updated_at?: string | null;
};

const PUBLISHED_STATUSES = new Set(["published", "live"]);
const DRAFT_STATUSES = new Set([
  "draft",
  "metadata_incomplete",
  "assets_pending",
  "rights_pending",
  "ready_for_review"
]);
const COVER_ROLES = new Set(["cover_art", "cover", "background_loop"]);

function isPublished(status?: string | null) {
  return Boolean(status && PUBLISHED_STATUSES.has(status));
}

function isScheduledStatus(status?: string | null) {
  return status === "scheduled";
}

function scheduledInFuture(value?: string | null) {
  if (!value) return false;
  const at = new Date(value);
  return !Number.isNaN(at.getTime()) && at.getTime() > Date.now();
}

function isSingleLike(release: ReleaseLiveStatusInput) {
  return release.releaseType === "single" || release.releaseType === "feature" || release.tracks.length <= 1;
}

export function releaseHasCover(release: ReleaseLiveStatusInput) {
  if (release.coverUrl || release.coverAssetId) return true;
  return (release.releaseMedia ?? []).some((link) => COVER_ROLES.has(link.assetRole));
}

export function trackHasAudio(track: ReleaseLiveStatusTrack) {
  return Boolean(
    track.audioAssetId ||
      track.audioUrl ||
      track.audioState === "uploaded" ||
      track.audioState === "approved"
  );
}

export function releaseHasRequiredAudio(release: ReleaseLiveStatusInput) {
  if (!release.tracks.length) return false;
  if (isSingleLike(release)) return release.tracks.some(trackHasAudio);
  return release.tracks.every(trackHasAudio);
}

export function releaseHasActiveMediaLinks(release: ReleaseLiveStatusInput) {
  return (release.releaseMedia ?? []).length > 0;
}

export function releaseHasFrontendMapping(release: ReleaseLiveStatusInput) {
  const links = release.releaseMedia ?? [];
  const routed = links.some(
    (link) =>
      Boolean(link.frontendRoute?.trim()) ||
      Boolean(link.syncTarget?.trim()) ||
      (link.frontendDestinations?.length ?? 0) > 0
  );
  if (routed) return true;
  if (!release.slug?.trim()) return false;
  const contract = resolveMediaSyncRoute({
    relatedReleaseId: release.id,
    releaseType: release.releaseType as "single" | "album" | "ep" | "feature" | undefined,
    releaseSlug: release.slug
  });
  return Boolean(contract.frontendRoute?.trim()) && contract.frontendDestinations.length > 0;
}

export function syncRowsForRelease(rows: SyncStateSlice[], releaseId: string) {
  return rows.filter(
    (row) => row.key === `release:${releaseId}` || row.key === "catalog" || row.key.includes(releaseId)
  );
}

export function releaseSyncDirty(rows: SyncStateSlice[], releaseId: string) {
  return syncRowsForRelease(rows, releaseId).some((row) => row.dirty);
}

export function releaseSyncFailed(rows: SyncStateSlice[], releaseId: string) {
  return syncRowsForRelease(rows, releaseId).some((row) => {
    const meta = row.metadata ?? {};
    return meta.failed === true || meta.status === "failed" || meta.syncStatus === "failed";
  });
}

export function latestSyncTimestamp(rows: SyncStateSlice[], releaseId: string) {
  const stamps = syncRowsForRelease(rows, releaseId)
    .map((row) => row.updated_at)
    .filter((value): value is string => Boolean(value));
  if (!stamps.length) return null;
  return stamps.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;
}

export function computeReleaseLiveStatus(
  release: ReleaseLiveStatusInput,
  syncRows: SyncStateSlice[] = []
): { liveStatus: ReleaseLiveStatus; liveStatusReasons: string[]; updatedAt: string | null } {
  const reasons: string[] = [];
  const status = release.status ?? "draft";
  const dirty = releaseSyncDirty(syncRows, release.id);
  const failed = releaseSyncFailed(syncRows, release.id);
  const hasCover = releaseHasCover(release);
  const hasAudio = releaseHasRequiredAudio(release);
  const hasMedia = releaseHasActiveMediaLinks(release);
  const hasMapping = releaseHasFrontendMapping(release);
  const published = isPublished(status);
  const scheduled = isScheduledStatus(status) || scheduledInFuture(release.scheduledPublishAt);

  const updatedAt =
    latestSyncTimestamp(syncRows, release.id) ??
    release.publishedAt ??
    release.scheduledPublishAt ??
    null;

  if (scheduled) {
    const future = scheduledInFuture(release.scheduledPublishAt);
    if (future) {
      reasons.push("Scheduled publish time is in the future");
      return { liveStatus: "scheduled", liveStatusReasons: reasons, updatedAt };
    }
    if (failed || dirty || release.scheduleLastError) {
      if (failed) reasons.push("Scheduled auto-publish failed");
      if (dirty) reasons.push("Scheduled publish pending sync");
      if (release.scheduleLastError) reasons.push(release.scheduleLastError);
      reasons.push("Past scheduled time — release not live yet");
      return { liveStatus: "sync_error", liveStatusReasons: reasons, updatedAt };
    }
    if (isScheduledStatus(status)) {
      reasons.push("Release status is scheduled");
    }
    return { liveStatus: "scheduled", liveStatusReasons: reasons, updatedAt };
  }

  if (DRAFT_STATUSES.has(status) || status === "archived" || (!published && !scheduled)) {
    if (status === "archived") reasons.push("Release is archived");
    else reasons.push("Release is not published");
    return { liveStatus: "draft", liveStatusReasons: reasons, updatedAt };
  }

  if (!hasCover) reasons.push("Missing cover art");
  if (!hasAudio) reasons.push("Missing required track audio");
  if (!hasMedia) reasons.push("No release_media links");
  if (!hasMapping) reasons.push("Frontend route mapping missing");
  if (dirty) reasons.push("Pending frontend sync (dirty)");
  if (failed) reasons.push("Frontend sync failed");

  const syncError =
    !hasCover ||
    !hasAudio ||
    !hasMapping ||
    failed ||
    (dirty && failed);

  if (syncError) {
    return { liveStatus: "sync_error", liveStatusReasons: reasons, updatedAt };
  }

  const liveReady = published && !failed && hasCover && hasAudio && hasMapping;
  if (liveReady) {
    return { liveStatus: "live", liveStatusReasons: ["Published with cover, audio, routing, and clean sync"], updatedAt };
  }

  reasons.push("Published release is not fully synced");
  return { liveStatus: "sync_error", liveStatusReasons: reasons, updatedAt };
}

export function liveStatusBadgeLabel(status: ReleaseLiveStatus) {
  if (status === "live") return "Live";
  if (status === "scheduled") return "Scheduled";
  if (status === "sync_error") return "Sync error";
  return "Draft";
}

export function liveStatusCssClass(status: ReleaseLiveStatus) {
  if (status === "live") return "media-sync-status-live";
  if (status === "scheduled") return "media-sync-status-scheduled";
  if (status === "sync_error") return "media-sync-status-error";
  return "media-sync-status-draft";
}
