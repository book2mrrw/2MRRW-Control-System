import "server-only";

import { getPublicR2Url } from "@/lib/storage/r2";
import { extensionFromPath, isMotionMedia } from "@/lib/media/mediaVisual";
import {
  artworkPublicFallbackUrl,
  frontendPublicBaseUrl,
  motionPublicFallbackUrl
} from "@/server/media/artworkPublicFallback";
import { createSignedMediaUrl } from "@/server/media/signedUrlService";
import type { MediaAssetContract } from "@/server/media/mediaObjects";

export { artworkPublicFallbackUrl, motionPublicFallbackUrl } from "@/server/media/artworkPublicFallback";

export function publicPathToUrl(storagePath: string) {
  if (!storagePath) return null;
  if (/^https?:\/\//i.test(storagePath)) return storagePath;
  const normalized = storagePath.replace(/^\//, "");
  const directR2 = getPublicR2Url(normalized);
  if (directR2) return directR2;
  if (storagePath.startsWith("/")) {
    const base = frontendPublicBaseUrl();
    return base ? `${base}${storagePath}` : null;
  }
  if (isMotionMedia(storagePath)) {
    return motionPublicFallbackUrl(storagePath) ?? artworkPublicFallbackUrl(storagePath);
  }
  return artworkPublicFallbackUrl(storagePath);
}

export async function resolveCatalogMediaUrl(
  assetId?: string | null,
  storagePath?: string | null,
  options: { publicKinds?: MediaAssetContract["kind"][]; studioBypass?: boolean } = {}
) {
  const motion = isMotionMedia(storagePath);
  const imageFallback =
    storagePath && !motion && extensionFromPath(storagePath)
      ? artworkPublicFallbackUrl(storagePath)
      : null;

  if (assetId) {
    const signed = await createSignedMediaUrl(null, assetId, {
      studioBypass: options.studioBypass ?? true,
      publicKinds: options.publicKinds
    });
    if (signed.ok) return signed.url;
  }

  if (storagePath) {
    const publicUrl = publicPathToUrl(storagePath);
    if (publicUrl) return publicUrl;
  }

  if (motion) {
    return motionPublicFallbackUrl(storagePath) ?? null;
  }

  return imageFallback ?? artworkPublicFallbackUrl(storagePath) ?? null;
}
