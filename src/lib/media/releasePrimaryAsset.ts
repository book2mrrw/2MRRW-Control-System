/**
 * Unified release card media — priority mirrors artist-platform `ReleaseArtwork`:
 * 1) motion loop (MP4/WebM/MOV/GIF)  2) static cover  3) poster for video only  4) placeholder
 *
 * @see artist-platform/src/app/page.js — getReleaseMotionArtworkUrl before getReleaseArtworkUrl
 */

import { slugMotionPublicUrl } from "@/lib/media/frontendMediaFallbacks";
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
  releaseType?: string | null;
  releaseCategory?: string | null;
  loopUrl?: string | null;
  motionUrl?: string | null;
  coverUrl?: string | null;
  posterUrl?: string | null;
};

function normalizeMotionUrl(input: BuildPrimaryAssetInput) {
  const slugMotion =
    input.slug &&
    slugMotionPublicUrl(input.slug, {
      releaseType: input.releaseType,
      releaseCategory: input.releaseCategory
    });
  const candidates = [input.loopUrl, input.motionUrl, slugMotion].filter(Boolean) as string[];
  return candidates.find((url) => isMotionMedia(url)) ?? null;
}

function normalizePosterUrl(input: BuildPrimaryAssetInput, motionUrl: string | null) {
  if (input.posterUrl && !isMotionMedia(input.posterUrl)) return input.posterUrl;
  const cover = input.coverUrl?.trim() || null;
  if (cover && !isMotionMedia(cover) && cover !== motionUrl) return cover;
  return undefined;
}

/**
 * Build primary display asset — motion ALWAYS wins over static JPEG.
 */
export function buildReleasePrimaryAsset(input: BuildPrimaryAssetInput): ReleasePrimaryAsset | null {
  const motionUrl = normalizeMotionUrl(input);
  const coverUrl = input.coverUrl?.trim() || null;
  const poster = normalizePosterUrl(input, motionUrl);

  if (motionUrl) {
    return {
      type: primaryAssetTypeFromUrl(motionUrl),
      src: motionUrl,
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

  return null;
}

/**
 * Single resolver for all card UIs — ignores stale JPEG-only `primaryAsset` when motion URLs exist.
 */
export function resolveDisplayPrimaryAsset(input: BuildPrimaryAssetInput & { primaryAsset?: ReleasePrimaryAsset | null }) {
  const motionUrl = normalizeMotionUrl(input);
  const rebuilt = buildReleasePrimaryAsset(input);

  if (motionUrl && rebuilt?.src === motionUrl) {
    return rebuilt;
  }

  if (input.primaryAsset && isVideoPrimaryAsset(input.primaryAsset.type)) {
    return input.primaryAsset;
  }

  if (input.primaryAsset && !motionUrl && !isMotionMedia(input.coverUrl)) {
    return input.primaryAsset;
  }

  return rebuilt ?? input.primaryAsset ?? null;
}

export function primaryAssetFromLegacyUrls(input: BuildPrimaryAssetInput) {
  return buildReleasePrimaryAsset(input);
}
