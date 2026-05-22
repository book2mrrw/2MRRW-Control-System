/** Shared R2 public media fallbacks (client + server safe). */

import { getPublicR2Url } from "@/lib/storage/r2";

function legacyFrontendBase() {
  return (
    process.env.ARTIST_PLATFORM_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_FRONTEND_URL ||
    ""
  ).replace(/\/$/, "");
}

export function frontendPublicBase() {
  return (process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "").replace(/\/$/, "") || legacyFrontendBase();
}

export function normalizeSlugToMotionBasename(slug: string) {
  return slug.replace(/-/g, "").toLowerCase();
}

export const SLUG_MOTION_BASENAME_OVERRIDES: Record<string, string> = {
  "hour-glass": "hourglass",
  "turnt-me-2-dis": "turntme2dis",
};

export function motionBasenameForSlug(slug: string) {
  return SLUG_MOTION_BASENAME_OVERRIDES[slug] ?? normalizeSlugToMotionBasename(slug);
}

export function singleMotionPublicPath(slug: string) {
  return `videos/singles/${motionBasenameForSlug(slug)}.mp4`;
}

export type SlugMotionOptions = {
  releaseType?: string | null;
  releaseCategory?: string | null;
};

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
  const path = singleMotionPublicPath(slug);
  const r2 = getPublicR2Url(path);
  if (r2) return r2;
  const legacy = legacyFrontendBase();
  if (legacy) return `${legacy}/${path}`;
  return null;
}
