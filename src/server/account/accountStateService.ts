import { profiles } from "@/server/data/seedData";
import {
  getPurchasedProductIds,
  normalizePermissions,
  resolveEntitlements
} from "@/server/entitlements/entitlementResolver";
import { getNotificationSummary } from "@/server/notifications/notificationService";
import { getPlaybackSummary } from "@/server/playback/playbackService";
import { getServerSupabase } from "@/server/supabase/client";
import type { AccountState } from "@/server/types";

const savedTrackIds = new Map<string, Set<string>>([["user_demo", new Set(["trk_signal"])]]);
const savedReleaseIds = new Map<string, Set<string>>([["user_demo", new Set(["rel_afterhours"])]]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string | undefined) {
  return Boolean(value && uuidPattern.test(value));
}

export function saveLibraryItem(userId: string, input: { trackId?: string; releaseId?: string }) {
  if (input.trackId) {
    const tracks = savedTrackIds.get(userId) ?? new Set<string>();
    tracks.add(input.trackId);
    savedTrackIds.set(userId, tracks);
  }

  if (input.releaseId) {
    const releases = savedReleaseIds.get(userId) ?? new Set<string>();
    releases.add(input.releaseId);
    savedReleaseIds.set(userId, releases);
  }

  return getLibrary(userId);
}

export async function saveLibraryItemDurable(userId: string, input: { trackId?: string; releaseId?: string }) {
  const library = saveLibraryItem(userId, input);
  const supabase = getServerSupabase();
  if (!supabase || !isUuid(userId)) return library;

  await Promise.all([
    input.trackId && isUuid(input.trackId)
      ? supabase.from("saved_tracks").upsert({ user_id: userId, track_id: input.trackId })
      : Promise.resolve(),
    input.releaseId && isUuid(input.releaseId)
      ? supabase.from("saved_releases").upsert({ user_id: userId, release_id: input.releaseId })
      : Promise.resolve()
  ]);

  return getLibraryDurable(userId);
}

export function getLibrary(userId: string) {
  return {
    savedTrackIds: [...(savedTrackIds.get(userId) ?? new Set<string>())],
    savedReleaseIds: [...(savedReleaseIds.get(userId) ?? new Set<string>())],
    purchasedProductIds: getPurchasedProductIds(userId)
  };
}

export async function getLibraryDurable(userId: string) {
  const fallback = getLibrary(userId);
  const supabase = getServerSupabase();
  if (!supabase || !isUuid(userId)) return fallback;

  const [{ data: tracks }, { data: releases }] = await Promise.all([
    supabase.from("saved_tracks").select("track_id").eq("user_id", userId),
    supabase.from("saved_releases").select("release_id").eq("user_id", userId)
  ]);

  return {
    savedTrackIds: tracks?.map((row) => row.track_id) ?? fallback.savedTrackIds,
    savedReleaseIds: releases?.map((row) => row.release_id) ?? fallback.savedReleaseIds,
    purchasedProductIds: fallback.purchasedProductIds
  };
}

export function getAccountState(userId: string): AccountState {
  const profile = profiles.find((item) => item.id === userId) ?? null;
  const entitlements = resolveEntitlements(userId);
  const playback = getPlaybackSummary(userId);
  const notifications = getNotificationSummary(userId);

  return {
    profile,
    entitlements,
    library: getLibrary(userId),
    playback,
    notifications,
    activeSessions: playback.activeSessionIds,
    permissions: normalizePermissions(profile, entitlements)
  };
}
