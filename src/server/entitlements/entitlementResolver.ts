import { mediaAssets, products, tracks } from "@/server/data/seedData";
import type { EntitlementGrant, NormalizedPermissions, Profile } from "@/server/types";

const userPurchases = new Map<string, Set<string>>();

export function grantProductToUser(userId: string, productId: string) {
  const purchases = userPurchases.get(userId) ?? new Set<string>();
  purchases.add(productId);
  userPurchases.set(userId, purchases);
}

export function getPurchasedProductIds(userId: string) {
  return [...(userPurchases.get(userId) ?? new Set<string>())];
}

export function resolveEntitlements(userId: string): EntitlementGrant[] {
  return getPurchasedProductIds(userId).flatMap((productId) => {
    const product = products.find((item) => item.id === productId);
    return product?.grants ?? [];
  });
}

export function normalizePermissions(profile: Profile | null, grants: EntitlementGrant[]): NormalizedPermissions {
  const releaseIds = new Set(grants.filter((grant) => grant.type === "release").map((grant) => grant.releaseId));
  const trackIds = new Set(grants.filter((grant) => grant.type === "track").map((grant) => grant.trackId));

  for (const track of tracks) {
    if (releaseIds.has(track.releaseId)) {
      trackIds.add(track.id);
    }
  }

  const streamAssetIds = new Set(
    [...trackIds]
      .map((trackId) => tracks.find((track) => track.id === trackId)?.mediaAssetId)
      .filter((assetId): assetId is string => Boolean(assetId))
  );

  return {
    canStreamTrackIds: [...trackIds],
    canDownloadAssetIds: mediaAssets
      .filter((asset) => streamAssetIds.has(asset.id) || grants.some((grant) => grant.type === "vault_collection"))
      .map((asset) => asset.id),
    canAccessVaultCollectionIds: grants
      .filter((grant) => grant.type === "vault_collection")
      .map((grant) => grant.collectionId),
    membershipTiers: grants.filter((grant) => grant.type === "membership").map((grant) => grant.tier),
    isAdmin: profile?.role === "admin"
  };
}
