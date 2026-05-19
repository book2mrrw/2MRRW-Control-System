import "server-only";

import { createAudioVisual, listAudioVisuals, updateAudioVisual } from "@/server/audio-visuals/audioVisualService";
import { buildFrontendEcosystemPersistencePlan } from "@/server/release-management/frontendReleaseIngestionService";
import { markSyncDirty } from "@/server/sync/syncStateService";
import { emitAfterSuccessfulAction } from "@/server/events/eventedWriteService";

const MUSIC_VIDEOS_MIN = 3;

export type AudioVisualSyncReport = {
  ok: boolean;
  existing: number;
  expected: number;
  created: number;
  updated: number;
  message: string;
};

export async function ensureAudioVisualsFromFrontend(): Promise<AudioVisualSyncReport> {
  const existing = await listAudioVisuals({ publicOnly: false, limit: 200 });
  const plan = await buildFrontendEcosystemPersistencePlan();

  if (!plan?.audioVisuals.length) {
    return {
      ok: existing.length >= MUSIC_VIDEOS_MIN,
      existing: existing.length,
      expected: MUSIC_VIDEOS_MIN,
      created: 0,
      updated: 0,
      message: plan ? "No musicVideos in frontend page.js" : "Frontend repo not found — set FRONTEND_REPO_PATH or sibling artist-platform"
    };
  }

  let created = 0;
  let updated = 0;

  for (const visual of plan.audioVisuals) {
    const match = existing.find(
      (item) => item.slug === visual.slug || item.youtubeVideoId === visual.youtubeVideoId
    );
    const payload = {
      title: visual.title,
      slug: visual.slug,
      youtubeUrl: visual.youtubeUrl,
      releaseId: visual.releaseId ?? null,
      trackId: visual.trackId ?? null,
      status: visual.status,
      sortOrder: visual.sortOrder,
      metadata: visual.metadata
    };

    if (match) {
      await updateAudioVisual(match.id, payload);
      updated += 1;
    } else {
      await createAudioVisual(payload);
      created += 1;
    }
  }

  if (created > 0 || updated > 0) {
    await markSyncDirty("audio_visuals", { reason: "frontend.musicVideos.sync" });
    emitAfterSuccessfulAction({
      type: "audio_visuals.updated",
      entityId: "catalog",
      data: { action: "frontend_sync", created, updated }
    });
  }

  const total = existing.length + created;
  return {
    ok: total >= Math.min(MUSIC_VIDEOS_MIN, plan.audioVisuals.length),
    existing: total,
    expected: plan.audioVisuals.length,
    created,
    updated,
    message: created || updated ? `Synced ${created} new, ${updated} updated from artist-platform musicVideos` : "Audio visuals already in sync"
  };
}

export async function listAudioVisualsWithFrontendSync(options: { syncIfIncomplete?: boolean } = {}) {
  const visuals = await listAudioVisuals({ publicOnly: false, limit: 100 });
  if (options.syncIfIncomplete !== false && visuals.length < MUSIC_VIDEOS_MIN) {
    await ensureAudioVisualsFromFrontend();
    return listAudioVisuals({ publicOnly: false, limit: 100 });
  }
  return visuals;
}
