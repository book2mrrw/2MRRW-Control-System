import { listConfirmedMediaAssets } from "@/server/media/uploadIntentService";

export function reconcileMedia(ownerId?: string) {
  const assets = listConfirmedMediaAssets();
  return ownerId ? assets.filter((asset) => asset.ownerId === ownerId || asset.releaseId === ownerId) : assets;
}
