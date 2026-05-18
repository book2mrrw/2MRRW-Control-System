import { nowIso } from "@/server/data/seedData";

const progress = new Map<string, Map<string, { positionSeconds: number; updatedAt: string }>>();
const activeSessions = new Map<string, Set<string>>();
const queues = new Map<string, string[]>();
const recentlyPlayed = new Map<string, string[]>();

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

export function getPlaybackSummary(userId: string) {
  const userProgress = progress.get(userId) ?? new Map<string, { positionSeconds: number; updatedAt: string }>();
  return {
    progressByTrackId: Object.fromEntries(userProgress),
    activeSessionIds: [...(activeSessions.get(userId) ?? new Set<string>())],
    queueTrackIds: queues.get(userId) ?? [],
    recentlyPlayedTrackIds: recentlyPlayed.get(userId) ?? []
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
