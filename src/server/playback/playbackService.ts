import { nowIso } from "@/server/data/seedData";
import { getServerSupabase } from "@/server/supabase/client";

const progress = new Map<string, Map<string, { positionSeconds: number; updatedAt: string }>>();
const activeSessions = new Map<string, Set<string>>();
const queues = new Map<string, string[]>();
const recentlyPlayed = new Map<string, string[]>();
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string | undefined) {
  return Boolean(value && uuidPattern.test(value));
}

export function updatePlaybackProgress(
  userId: string,
  input: { trackId: string; positionSeconds: number; sessionId: string }
) {
  const userProgress = progress.get(userId) ?? new Map<string, { positionSeconds: number; updatedAt: string }>();
  const row = { positionSeconds: Math.max(0, Math.floor(input.positionSeconds)), updatedAt: nowIso() };
  userProgress.set(input.trackId, row);
  progress.set(userId, userProgress);

  const sessions = activeSessions.get(userId) ?? new Set<string>();
  sessions.add(input.sessionId);
  activeSessions.set(userId, sessions);

  return row;
}

export async function updatePlaybackProgressDurable(
  userId: string,
  input: { trackId: string; positionSeconds: number; sessionId: string }
) {
  const row = updatePlaybackProgress(userId, input);
  const supabase = getServerSupabase();
  if (!supabase || !isUuid(userId) || !isUuid(input.trackId)) return row;

  await Promise.all([
    supabase.from("media_playback_progress").upsert({
      user_id: userId,
      track_id: input.trackId,
      position_seconds: row.positionSeconds,
      updated_at: row.updatedAt
    }),
    isUuid(input.sessionId)
      ? supabase.from("player_sessions").upsert({
          id: input.sessionId,
          user_id: userId,
          status: "active"
        })
      : Promise.resolve()
  ]);

  return row;
}

export function getPlaybackSummary(userId: string) {
  const userProgress = progress.get(userId) ?? new Map<string, { positionSeconds: number; updatedAt: string }>();
  return {
    progressByTrackId: Object.fromEntries(userProgress),
    activeSessionIds: [...(activeSessions.get(userId) ?? new Set<string>())],
    queueTrackIds: queues.get(userId) ?? [],
    recentlyPlayedTrackIds: recentlyPlayed.get(userId) ?? []
  };
}

export async function getPlaybackSummaryDurable(userId: string) {
  const fallback = getPlaybackSummary(userId);
  const supabase = getServerSupabase();
  if (!supabase || !isUuid(userId)) return fallback;

  const [{ data: progressRows }, { data: sessionRows }] = await Promise.all([
    supabase.from("media_playback_progress").select("track_id, position_seconds, updated_at").eq("user_id", userId),
    supabase.from("player_sessions").select("id").eq("user_id", userId).eq("status", "active")
  ]);

  return {
    ...fallback,
    progressByTrackId: progressRows
      ? Object.fromEntries(progressRows.map((row) => [row.track_id, { positionSeconds: row.position_seconds, updatedAt: row.updated_at }]))
      : fallback.progressByTrackId,
    activeSessionIds: sessionRows?.map((row) => row.id) ?? fallback.activeSessionIds
  };
}

export function getPlayerState(userId: string) {
  return {
    userId,
    queue: queues.get(userId) ?? [],
    ...getPlaybackSummary(userId)
  };
}

export function replaceQueue(userId: string, trackIds: string[], { shuffle = false } = {}) {
  const nextQueue = shuffle ? [...trackIds].sort((a, b) => a.localeCompare(b)).reverse() : [...trackIds];
  queues.set(userId, nextQueue);
  return nextQueue;
}

export function markRecentlyPlayed(userId: string, trackId: string) {
  const previous = recentlyPlayed.get(userId) ?? [];
  const next = [trackId, ...previous.filter((item) => item !== trackId)].slice(0, 25);
  recentlyPlayed.set(userId, next);
  return next;
}
