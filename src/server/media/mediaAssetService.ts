import { mediaAssets, tracks } from "@/server/data/seedData";
import { getAccountState } from "@/server/account/accountStateService";
import { coverArtPolicy } from "@/server/release-management/taxonomies";
import { classifyMediaAsset, type MediaAssetContract } from "@/server/media/mediaObjects";

export function getMediaAsset(assetId: string) {
  return mediaAssets.find((asset) => asset.id === assetId) ?? null;
}

export function assertCanAccessMedia(
  userId: string | null | undefined,
  assetId: string,
  options: { publicKinds?: MediaAssetContract["kind"][] } = {}
) {
  const asset = getMediaAsset(assetId);
  if (!asset) {
    return { allowed: false, reason: "Media asset not found" };
  }

  const assetKind = classifyMediaAsset(asset);
  const publicKindAllowed = options.publicKinds ? options.publicKinds.includes(assetKind) : true;
  if (asset.access !== "entitled" && publicKindAllowed) {
    return {
      allowed: true,
      reason: "Public media asset",
      asset
    };
  }

  if (!userId) {
    return { allowed: false, reason: "Entitlement required", asset };
  }

  const state = getAccountState(userId);
  const owningTrack = tracks.find((track) => track.mediaAssetId === assetId);
  const canStreamTrack = owningTrack ? state.permissions.canStreamTrackIds.includes(owningTrack.id) : false;
  const canDownloadAsset = state.permissions.canDownloadAssetIds.includes(assetId);

  return {
    allowed: canStreamTrack || canDownloadAsset,
    reason: "Entitlement required",
    asset
  };
}

export function getCoverArtUploadPolicy() {
  return {
    mediaKind: "cover_art",
    accessLevel: "admin",
    ...coverArtPolicy
  };
}

export function getMediaObjectReadiness(input: {
  coverArtState: string;
  audioAssetsState: string;
  lyricsState: string;
}) {
  return {
    coverArtReady: input.coverArtState === "uploaded" || input.coverArtState === "approved",
    audioReady: input.audioAssetsState === "uploaded" || input.audioAssetsState === "approved",
    lyricsReady: input.lyricsState === "not_required" || input.lyricsState === "uploaded" || input.lyricsState === "approved"
  };
}
