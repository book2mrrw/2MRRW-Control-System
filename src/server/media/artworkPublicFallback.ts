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

export function artworkPublicFallbackUrl(storagePath?: string | null) {
  if (!storagePath) return null;
  const fileName = storagePath.split("/").pop()?.toLowerCase();
  if (!fileName) return null;
  const publicPath = ARTWORK_FILENAME_PUBLIC_PATH[fileName];
  if (!publicPath) return null;
  return `${DEFAULT_FRONTEND_PUBLIC_BASE.replace(/\/$/, "")}${publicPath}`;
}

export function frontendPublicBaseUrl() {
  return DEFAULT_FRONTEND_PUBLIC_BASE.replace(/\/$/, "");
}
