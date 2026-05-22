import { getPublicR2Url } from "@/lib/storage/r2";
import { slugMotionPublicUrl } from "@/lib/media/frontendMediaFallbacks";

const ARTWORK_FILENAME_R2_PATH: Record<string, string> = {
  "2heavy.jpg": "artwork/features/2heavy.jpg",
  "ad.jpg": "artwork/albums/ad.jpg",
  "artificial.jpg": "artwork/singles/artificial.jpg",
  "hourglass.jpg": "artwork/singles/hourglass.jpg",
  "idbu.jpg": "artwork/features/idbu.jpg",
  "lovehz.jpg": "artwork/albums/lovehz.jpg",
  "tbh.jpg": "artwork/albums/tbh.jpg",
  "turnt.jpg": "artwork/singles/turnt.jpg",
  "w2d.jpg": "artwork/singles/w2d.jpg",
};

const MOTION_FILENAME_R2_PATH: Record<string, string> = {
  "hourglass.mp4": "videos/singles/hourglass.mp4",
  "artificial.mp4": "videos/singles/artificial.mp4",
  "w2d.mp4": "videos/singles/w2d.mp4",
  "turntme2dis.mp4": "videos/singles/turntme2dis.mp4",
  "visual.mp4": "videos/singles/hourglass.mp4",
};

export function motionPublicFallbackUrl(storagePath?: string | null) {
  if (!storagePath) return null;
  const fileName = storagePath.split("/").pop()?.toLowerCase();
  if (!fileName) return null;
  const r2Path = MOTION_FILENAME_R2_PATH[fileName];
  if (!r2Path) return null;
  return getPublicR2Url(r2Path);
}

export function slugMotionPublicFallbackUrl(
  slug?: string | null,
  options?: Parameters<typeof slugMotionPublicUrl>[1]
) {
  return slugMotionPublicUrl(slug, options);
}

export function artworkPublicFallbackUrl(storagePath?: string | null) {
  if (!storagePath) return null;
  const fileName = storagePath.split("/").pop()?.toLowerCase();
  if (!fileName) return null;
  if (/\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(fileName)) {
    return motionPublicFallbackUrl(storagePath);
  }
  const r2Path = ARTWORK_FILENAME_R2_PATH[fileName];
  if (!r2Path) return null;
  return getPublicR2Url(r2Path);
}

export function frontendPublicBaseUrl() {
  return process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, "") || "";
}
