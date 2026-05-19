import "server-only";

import {
  localScheduleToUtcIso,
  releaseDateFromParts,
  releaseTimeFromParts,
  scheduleIsInFuture,
  type ScheduleParts
} from "@/lib/scheduling/releaseScheduleTime";
import { getServerSupabase } from "@/server/supabase/client";
import { hydrateDraftFromCatalogRelease } from "@/server/release-management/releaseCatalogHydrationService";
import { getReleaseDraft } from "@/server/release-management/releaseManagementService";
import { publishReleaseDurable } from "@/server/releases/releaseWriteService";
import { markSyncDirty, upsertSyncState } from "@/server/sync/syncStateService";
import { fetchDurableReleaseById } from "@/server/catalog/releaseCatalogService";

const RETRY_DELAYS_MS = [0, 2_000, 5_000];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type DueScheduledRelease = {
  id: string;
  slug: string;
  title: string;
  scheduled_publish_at: string;
  publish_timezone?: string | null;
  schedule_attempts?: number | null;
};

export async function listDueScheduledReleases(nowIso = new Date().toISOString()): Promise<DueScheduledRelease[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("releases")
    .select("id, slug, title, scheduled_publish_at, publish_timezone, schedule_attempts")
    .eq("status", "scheduled")
    .not("scheduled_publish_at", "is", null)
    .lte("scheduled_publish_at", nowIso)
    .order("scheduled_publish_at", { ascending: true });

  if (error || !data) return [];
  return data as DueScheduledRelease[];
}

export async function persistReleaseSchedule(
  releaseId: string,
  input: {
    scheduledPublishAt: string;
    releaseDate: string;
    releaseTime: string;
    publishTimezone: string;
    status?: "scheduled";
  }
) {
  const supabase = getServerSupabase();
  if (!supabase) return { persisted: false as const, error: "Supabase unavailable" };

  const payload = {
    status: input.status ?? "scheduled",
    scheduled_publish_at: input.scheduledPublishAt,
    release_date: input.releaseDate,
    release_time: input.releaseTime,
    publish_timezone: input.publishTimezone,
    schedule_last_error: null,
    schedule_attempts: 0
  };

  let write = await supabase.from("releases").update(payload).eq("id", releaseId);
  if (write.error && /publish_timezone|release_time|schedule_/i.test(write.error.message ?? "")) {
    write = await supabase
      .from("releases")
      .update({
        status: payload.status,
        scheduled_publish_at: payload.scheduled_publish_at,
        release_date: payload.release_date
      })
      .eq("id", releaseId);
  }

  if (write.error) return { persisted: false as const, error: write.error.message };
  return { persisted: true as const };
}

export async function persistReleaseUnpublish(releaseId: string) {
  const supabase = getServerSupabase();
  if (!supabase) return { persisted: false as const, error: "Supabase unavailable" };

  const { error } = await supabase
    .from("releases")
    .update({
      status: "draft",
      scheduled_publish_at: null,
      schedule_last_error: null,
      schedule_attempts: 0
    })
    .eq("id", releaseId);

  if (error) return { persisted: false as const, error: error.message };
  return { persisted: true as const };
}

export function buildSchedulePayload(parts: ScheduleParts) {
  if (!scheduleIsInFuture(localScheduleToUtcIso(parts))) {
    throw new Error("Schedule must be in the future");
  }
  const scheduledPublishAt = localScheduleToUtcIso(parts);
  return {
    scheduledPublishAt,
    releaseDate: releaseDateFromParts(parts),
    releaseTime: releaseTimeFromParts(parts),
    publishTimezone: parts.timezone
  };
}

async function ensureDraftHydrated(releaseId: string) {
  if (getReleaseDraft(releaseId)) return;
  const release = await fetchDurableReleaseById(releaseId);
  if (release) hydrateDraftFromCatalogRelease(release);
}

async function recordScheduleFailure(releaseId: string, error: string, attempts: number) {
  const supabase = getServerSupabase();
  if (supabase) {
    await supabase
      .from("releases")
      .update({ schedule_last_error: error, schedule_attempts: attempts })
      .eq("id", releaseId);
  }
  await markSyncDirty(`release:${releaseId}`, {
    failed: true,
    status: "failed",
    schedulePublishError: error,
    scheduleAttempts: attempts,
    at: new Date().toISOString()
  });
}

async function clearScheduleFailure(releaseId: string) {
  const supabase = getServerSupabase();
  if (supabase) {
    await supabase
      .from("releases")
      .update({
        status: "published",
        schedule_last_error: null,
        schedule_attempts: 0,
        published_at: new Date().toISOString()
      })
      .eq("id", releaseId);
  }
  await upsertSyncState({
    key: `release:${releaseId}`,
    dirty: false,
    metadata: { schedulePublishedAt: new Date().toISOString() }
  });
}

export async function attemptScheduledPublish(releaseId: string, options: { maxAttempts?: number } = {}) {
  const maxAttempts = options.maxAttempts ?? 3;
  let lastError = "Publish failed";

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (RETRY_DELAYS_MS[attempt - 1]) {
      await sleep(RETRY_DELAYS_MS[attempt - 1]!);
    }
    try {
      await ensureDraftHydrated(releaseId);
      const result = await publishReleaseDurable(releaseId);
      if (result?.ok && result.status === "published") {
        await clearScheduleFailure(releaseId);
        return { ok: true as const, releaseId, attempt, status: result.status };
      }
      lastError = result && "message" in result ? result.message ?? "Release is not ready to publish" : "Release is not ready to publish";
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Scheduled publish failed";
    }
  }

  await recordScheduleFailure(releaseId, lastError, maxAttempts);
  return { ok: false as const, releaseId, error: lastError, attempts: maxAttempts };
}

export async function runScheduledPublishJob() {
  const due = await listDueScheduledReleases();
  const results = [];
  for (const row of due) {
    results.push(await attemptScheduledPublish(row.id));
  }
  return { due: due.length, results };
}
