import { listConfirmedMediaAssets } from "@/server/media/uploadIntentService";

export function syncReleaseMedia(releaseId: string) {
  return listConfirmedMediaAssets().filter((asset) => asset.ownerId === releaseId || asset.releaseId === releaseId);
}
