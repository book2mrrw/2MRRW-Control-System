import type { MediaAssetContract, ReleaseMediaObject } from "@/server/media/mediaObjects";
import type { ReleaseCategory } from "@/server/types";

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
  category: ReleaseCategory;
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

export type AutomaticContentRoutes = {
  homepage: {
    latestSingles: UnifiedRelease[];
    albums: UnifiedRelease[];
    features: UnifiedRelease[];
  };
  musicTab: {
    singlesSubtab: {
      singles: UnifiedRelease[];
      features: UnifiedRelease[];
    };
    albumsSubtab: UnifiedRelease[];
  };
};

export function releaseCategoryForContract(release: Pick<ReleaseMediaObject, "releaseCategory" | "releaseType">): ReleaseCategory {
  if (release.releaseCategory) return release.releaseCategory;
  if (release.releaseType === "feature") return "feature";
  if (release.releaseType === "single") return "single";
  return "album";
}

function isVideoMediaAsset(asset: MediaAssetContract) {
  return asset.kind === "loop" || /\.(mp4|mov|webm)$/i.test(asset.sourcePath ?? "");
}

function mediaTypeFor(asset: MediaAssetContract): UnifiedMediaAsset["type"] {
  if (asset.kind === "full_audio" || asset.kind === "preview") return "audio";
  if (isVideoMediaAsset(asset)) return "video";
  return "image";
}

function mediaCategoryFor(asset: MediaAssetContract): UnifiedMediaAsset["category"] {
  if (asset.kind === "full_audio" || asset.kind === "preview") return "audio";
  if (isVideoMediaAsset(asset)) return "mp4_loops";
  return "images";
}

function mediaSlotFor(asset: MediaAssetContract): UnifiedMediaAsset["slot"] {
  if (asset.kind === "artwork") return isVideoMediaAsset(asset) ? "video_loop" : "cover";
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
  const loop = primaryTrack?.assets.loop ?? (release.artwork && isVideoMediaAsset(release.artwork) ? release.artwork : undefined);
  const cover = release.artwork && !isVideoMediaAsset(release.artwork) ? release.artwork : undefined;

  return {
    id: release.id,
    type: release.releaseType === "single" ? "single" : "album",
    category: releaseCategoryForContract(release),
    title: release.title,
    status: release.status === "published" ? "live" : "draft",
    media: {
      cover: cover ? toUnifiedMediaAsset(cover) : undefined,
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

function newestFirst(left: UnifiedRelease, right: UnifiedRelease) {
  const leftTime = Date.parse(left.metadata.releaseDate ?? "") || left.updatedAt;
  const rightTime = Date.parse(right.metadata.releaseDate ?? "") || right.updatedAt;
  return rightTime - leftTime;
}

function sortedNewestFirst(releases: UnifiedRelease[]) {
  return [...releases].sort(newestFirst);
}

export function deriveLiveSinglesAndAlbums(releases: UnifiedRelease[]) {
  const latestSingles = releases.filter(
    (release) => release.category === "single" && release.status === "live"
  );

  const albums = releases.filter(
    (release) => release.category === "album" && release.status === "live"
  );

  return {
    singles: sortedNewestFirst(latestSingles),
    albums: sortedNewestFirst(albums)
  };
}

export function deriveLiveReleaseSections(releases: UnifiedRelease[]) {
  const latestSingles = releases.filter(
    (release) => release.category === "single" && release.status === "live"
  );

  const features = releases.filter(
    (release) => release.category === "feature" && release.status === "live"
  );

  const albums = releases.filter(
    (release) => release.category === "album" && release.status === "live"
  );

  return {
    singles: sortedNewestFirst(latestSingles),
    albums: sortedNewestFirst(albums),
    features: sortedNewestFirst(features)
  };
}

export function deriveAutomaticContentRoutes(releases: UnifiedRelease[]): AutomaticContentRoutes {
  const sections = deriveLiveReleaseSections(releases);
  return {
    homepage: {
      latestSingles: sections.singles,
      albums: sections.albums,
      features: sections.features
    },
    musicTab: {
      singlesSubtab: {
        singles: sections.singles,
        features: sections.features
      },
      albumsSubtab: sections.albums
    }
  };
}
