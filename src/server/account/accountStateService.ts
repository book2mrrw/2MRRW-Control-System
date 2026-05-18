import { profiles } from "@/server/data/seedData";
import {
  getPurchasedProductIds,
  normalizePermissions,
  resolveEntitlements
} from "@/server/entitlements/entitlementResolver";
import { getNotificationSummary } from "@/server/notifications/notificationService";
import { getPlaybackSummary } from "@/server/playback/playbackService";
import type { AccountState } from "@/server/types";

const savedTrackIds = new Map<string, Set<string>>([["user_demo", new Set(["trk_signal"])]]);
const savedReleaseIds = new Map<string, Set<string>>([["user_demo", new Set(["rel_afterhours"])]]);

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

export function getLibrary(userId: string) {
  return {
    savedTrackIds: [...(savedTrackIds.get(userId) ?? new Set<string>())],
    savedReleaseIds: [...(savedReleaseIds.get(userId) ?? new Set<string>())],
    purchasedProductIds: getPurchasedProductIds(userId)
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
