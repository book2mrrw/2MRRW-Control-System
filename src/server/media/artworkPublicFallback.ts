const DEFAULT_FRONTEND_PUBLIC_BASE =
  process.env.ARTIST_PLATFORM_PUBLIC_URL ??
  process.env.NEXT_PUBLIC_FRONTEND_URL ??
  "https://artist-platform-silk.vercel.app";

/** Maps Supabase storage filenames → artist-platform public paths when bucket objects are absent. */
const ARTWORK_FILENAME_PUBLIC_PATH: Record<string, string> = {
  "2heavy.jpg": "/images/features/2heavy.jpg",
  "ad.jpg": "/images/albums/ad.jpg",
  "artificial.jpg": "/images/singles/artificial.jpg",
  "hourglass.jpg": "/images/singles/hourglass.jpg",
  "idbu.jpg": "/images/features/idbu.jpg",
  "lovehz.jpg": "/images/albums/lovehz.jpg",
  "tbh.jpg": "/images/albums/tbh.jpg",
  "turnt.jpg": "/images/singles/turnt.jpg",
  "w2d.jpg": "/images/singles/w2d.jpg"
};

/** Motion loops — match artist-platform `public/videos/**` (frontend prefers video over static cover). */
const MOTION_FILENAME_PUBLIC_PATH: Record<string, string> = {
  "hourglass.mp4": "/videos/singles/hourglass.mp4",
  "visual.mp4": "/videos/singles/hourglass.mp4"
};

/** Slug → motion URL when DB only references artwork paths without a separate loop row. */
const SLUG_MOTION_PUBLIC_PATH: Record<string, string> = {
  "hour-glass": "/videos/singles/hourglass.mp4"
};

export function motionPublicFallbackUrl(storagePath?: string | null) {
  if (!storagePath) return null;
  const fileName = storagePath.split("/").pop()?.toLowerCase();
  if (!fileName) return null;
  const publicPath = MOTION_FILENAME_PUBLIC_PATH[fileName];
  if (!publicPath) return null;
  return `${DEFAULT_FRONTEND_PUBLIC_BASE.replace(/\/$/, "")}${publicPath}`;
}

export function slugMotionPublicFallbackUrl(slug?: string | null) {
  if (!slug) return null;
  const publicPath = SLUG_MOTION_PUBLIC_PATH[slug];
  if (!publicPath) return null;
  return `${DEFAULT_FRONTEND_PUBLIC_BASE.replace(/\/$/, "")}${publicPath}`;
}

export function artworkPublicFallbackUrl(storagePath?: string | null) {
  if (!storagePath) return null;
  const fileName = storagePath.split("/").pop()?.toLowerCase();
  if (!fileName) return null;
  if (/\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(fileName)) {
    return motionPublicFallbackUrl(storagePath);
  }
  const publicPath = ARTWORK_FILENAME_PUBLIC_PATH[fileName];
  if (!publicPath) return null;
  return `${DEFAULT_FRONTEND_PUBLIC_BASE.replace(/\/$/, "")}${publicPath}`;
}

export function frontendPublicBaseUrl() {
  return DEFAULT_FRONTEND_PUBLIC_BASE.replace(/\/$/, "");
}
