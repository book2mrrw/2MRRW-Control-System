/** Shared artist-platform public media fallbacks (client + server safe). */

const FRONTEND_BASE =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_FRONTEND_URL) ||
  (typeof process !== "undefined" && process.env.ARTIST_PLATFORM_PUBLIC_URL) ||
  "https://artist-platform-silk.vercel.app";

export function frontendPublicBase() {
  return FRONTEND_BASE.replace(/\/$/, "");
}

/**
 * Derive artist-platform loop basename from catalog slug.
 * Matches `public/videos/singles/*.mp4` on artist-platform (hyphens stripped).
 */
export function normalizeSlugToMotionBasename(slug: string) {
  return slug.replace(/-/g, "").toLowerCase();
}

/** When basename ≠ de-hyphenated slug (rare); all current animated singles use default rule. */
export const SLUG_MOTION_BASENAME_OVERRIDES: Record<string, string> = {
  "hour-glass": "hourglass",
  "turnt-me-2-dis": "turntme2dis"
};

export function motionBasenameForSlug(slug: string) {
  return SLUG_MOTION_BASENAME_OVERRIDES[slug] ?? normalizeSlugToMotionBasename(slug);
}

export function singleMotionPublicPath(slug: string) {
  return `/videos/singles/${motionBasenameForSlug(slug)}.mp4`;
}

export type SlugMotionOptions = {
  releaseType?: string | null;
  releaseCategory?: string | null;
};

/** True when catalog row should prefer artist-platform single loop over static cover only. */
export function isCatalogSingleWithMotionFallback(releaseType?: string | null, releaseCategory?: string | null) {
  if (releaseCategory === "feature" || releaseType === "feature") return false;
  if (releaseCategory === "album" || releaseType === "album" || releaseType === "ep") return false;
  return releaseType === "single" || releaseCategory === "single";
}

export function slugMotionPublicUrl(slug?: string | null, options?: SlugMotionOptions) {
  if (!slug) return null;
  if (options && !isCatalogSingleWithMotionFallback(options.releaseType, options.releaseCategory)) {
    return null;
  }
  return `${frontendPublicBase()}${singleMotionPublicPath(slug)}`;
}
