import type { MediaAssetContract, ReleaseMediaObject } from "@/server/media/mediaObjects";

export type UnifiedMediaAsset = {
  id: string;
  type: "image" | "audio" | "video";
  category: "images" | "audio" | "mp4_loops" | "press_photos" | "hero_media";
  slot?: "cover" | "track_audio" | "video_loop" | "press_photo" | "hero_background" | "vault_asset";
  url: string;
  status: "uploading" | "ready" | "failed";
  version: number;
};

export type UnifiedRelease = {
  id: string;
  type: "single" | "album";
  title: string;
  status: "draft" | "live" | "archived";
  media: {
    cover?: UnifiedMediaAsset;
    audio?: UnifiedMediaAsset;
    videoLoop?: UnifiedMediaAsset;
    pressPhotos?: UnifiedMediaAsset[];
  };
  metadata: {
    releaseDate?: string;
    genre?: string;
    credits?: unknown;
  };
  updatedAt: number;
};

function mediaTypeFor(asset: MediaAssetContract): UnifiedMediaAsset["type"] {
  if (asset.kind === "full_audio" || asset.kind === "preview") return "audio";
  if (asset.kind === "loop") return "video";
  return "image";
}

function mediaCategoryFor(asset: MediaAssetContract): UnifiedMediaAsset["category"] {
  if (asset.kind === "full_audio" || asset.kind === "preview") return "audio";
  if (asset.kind === "loop") return "mp4_loops";
  return "images";
}

function mediaSlotFor(asset: MediaAssetContract): UnifiedMediaAsset["slot"] {
  if (asset.kind === "artwork") return "cover";
  if (asset.kind === "full_audio" || asset.kind === "preview") return "track_audio";
  if (asset.kind === "loop") return "video_loop";
  if (asset.kind === "vault") return "vault_asset";
  return undefined;
}

export function toUnifiedMediaAsset(asset: MediaAssetContract, version = 1): UnifiedMediaAsset {
  return {
    id: asset.assetId,
    type: mediaTypeFor(asset),
    category: mediaCategoryFor(asset),
    slot: mediaSlotFor(asset),
    url: asset.signedUrlEndpoint,
    status: "ready",
    version
  };
}

export function toUnifiedRelease(release: ReleaseMediaObject): UnifiedRelease {
  const primaryTrack = release.tracks[0];
  const fullAudio = primaryTrack?.assets.full ?? primaryTrack?.assets.preview;
  const loop = primaryTrack?.assets.loop;

  return {
    id: release.id,
    type: release.releaseType === "single" ? "single" : "album",
    title: release.title,
    status: release.status === "published" ? "live" : "draft",
    media: {
      cover: release.artwork ? toUnifiedMediaAsset(release.artwork) : undefined,
      audio: fullAudio ? toUnifiedMediaAsset(fullAudio) : undefined,
      videoLoop: loop ? toUnifiedMediaAsset(loop) : undefined,
      pressPhotos: []
    },
    metadata: {
      releaseDate: release.releaseDate,
      credits: undefined
    },
    updatedAt: Date.parse(release.scheduledPublishAt ?? release.releaseDate) || Date.now()
  };
}

export function deriveLiveSinglesAndAlbums(releases: UnifiedRelease[]) {
  return {
    singles: releases.filter((release) => release.type === "single" && release.status === "live"),
    albums: releases.filter((release) => release.type === "album" && release.status === "live")
  };
}
