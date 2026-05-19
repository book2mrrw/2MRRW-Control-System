/**
 * Unified release card media — priority mirrors artist-platform `ReleaseArtwork`:
 * motion (video/gif loop) before static cover image.
 *
 * @see artist-platform/src/app/page.js — getReleaseMotionArtworkUrl, getReleaseArtworkUrl
 */

import { detectMediaKind, extensionFromPath, isMotionMedia, type DetectedMediaKind } from "@/lib/media/mediaVisual";

export type ReleasePrimaryAssetType = "mp4" | "webm" | "mov" | "jpg" | "png" | "gif" | "avif";

export type ReleasePrimaryAsset = {
  type: ReleasePrimaryAssetType;
  src: string;
  poster?: string;
  loop?: boolean;
  muted?: boolean;
  autoplay?: boolean;
};

const VIDEO_TYPES = new Set<ReleasePrimaryAssetType>(["mp4", "webm", "mov"]);

export function isVideoPrimaryAsset(type: ReleasePrimaryAssetType) {
  return VIDEO_TYPES.has(type);
}

export function detectedKindToPrimaryType(kind: DetectedMediaKind, url: string): ReleasePrimaryAssetType {
  const ext = extensionFromPath(url);
  if (ext === "webm") return "webm";
  if (ext === "mov") return "mov";
  if (ext === "gif") return "gif";
  if (ext === "png") return "png";
  if (ext === "avif") return "avif";
  if (ext === "mp4" || kind === "video_loop") return "mp4";
  if (ext === "jpg" || ext === "jpeg") return "jpg";
  return "jpg";
}

export function primaryAssetTypeFromUrl(url: string): ReleasePrimaryAssetType {
  return detectedKindToPrimaryType(detectMediaKind(url), url);
}

export type BuildPrimaryAssetInput = {
  slug?: string;
  loopUrl?: string | null;
  coverUrl?: string | null;
  posterUrl?: string | null;
};

/**
 * Client-safe builder when URLs are already resolved (catalog payload).
 */
export function buildReleasePrimaryAsset(input: BuildPrimaryAssetInput): ReleasePrimaryAsset | null {
  const loopUrl = input.loopUrl?.trim() || null;
  const coverUrl = input.coverUrl?.trim() || null;
  const posterUrl = input.posterUrl?.trim() || null;

  const poster =
    posterUrl && !isMotionMedia(posterUrl)
      ? posterUrl
      : coverUrl && !isMotionMedia(coverUrl)
        ? coverUrl
        : undefined;

  if (loopUrl && isMotionMedia(loopUrl)) {
    return {
      type: primaryAssetTypeFromUrl(loopUrl),
      src: loopUrl,
      poster,
      loop: true,
      muted: true,
      autoplay: true
    };
  }

  if (coverUrl && isMotionMedia(coverUrl)) {
    return {
      type: primaryAssetTypeFromUrl(coverUrl),
      src: coverUrl,
      poster,
      loop: true,
      muted: true,
      autoplay: true
    };
  }

  if (coverUrl && detectMediaKind(coverUrl) === "image") {
    return {
      type: primaryAssetTypeFromUrl(coverUrl),
      src: coverUrl,
      poster: coverUrl,
      loop: false,
      muted: true,
      autoplay: false
    };
  }

  if (loopUrl && detectMediaKind(loopUrl) === "image") {
    return {
      type: primaryAssetTypeFromUrl(loopUrl),
      src: loopUrl,
      poster: loopUrl,
      loop: false,
      muted: true,
      autoplay: false
    };
  }

  return null;
}

export function primaryAssetFromLegacyUrls(input: BuildPrimaryAssetInput) {
  return buildReleasePrimaryAsset(input);
}
