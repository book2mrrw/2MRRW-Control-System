import { vaultCollections, vaultContent } from "@/server/data/seedData";
import { getAccountState } from "@/server/account/accountStateService";

const progress = new Map<string, Map<string, { completed: boolean; updatedAt: string }>>();

export function listVaultContent(userId: string) {
  const allowedCollections = new Set(getAccountState(userId).permissions.canAccessVaultCollectionIds);
  return vaultContent.filter((item) => allowedCollections.has(item.collectionId));
}

export function getVaultContentMedia(userId: string, contentId: string) {
  return listVaultContent(userId).find((item) => item.id === contentId || item.slug === contentId) ?? null;
}

export function updateVaultProgress(userId: string, contentId: string, completed: boolean) {
  const userProgress = progress.get(userId) ?? new Map<string, { completed: boolean; updatedAt: string }>();
  const row = { completed, updatedAt: new Date().toISOString() };
  userProgress.set(contentId, row);
  progress.set(userId, userProgress);
  return row;
}

export function listVaultCollections() {
  return vaultCollections;
}
