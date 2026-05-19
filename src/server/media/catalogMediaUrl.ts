import "server-only";

import { artworkPublicFallbackUrl, frontendPublicBaseUrl } from "@/server/media/artworkPublicFallback";
import { createSignedMediaUrl } from "@/server/media/signedUrlService";
import type { MediaAssetContract } from "@/server/media/mediaObjects";

export { artworkPublicFallbackUrl } from "@/server/media/artworkPublicFallback";

export function publicPathToUrl(storagePath: string) {
  if (/^https?:\/\//i.test(storagePath)) return storagePath;
  if (storagePath.startsWith("/")) {
    return `${frontendPublicBaseUrl()}${storagePath}`;
  }
  return artworkPublicFallbackUrl(storagePath);
}

export async function resolveCatalogMediaUrl(
  assetId?: string | null,
  storagePath?: string | null,
  options: { publicKinds?: MediaAssetContract["kind"][]; studioBypass?: boolean } = {}
) {
  if (storagePath) {
    const publicUrl = publicPathToUrl(storagePath);
    if (publicUrl) return publicUrl;
  }

  if (!assetId) return artworkPublicFallbackUrl(storagePath);

  const signed = await createSignedMediaUrl(null, assetId, {
    studioBypass: options.studioBypass ?? true,
    publicKinds: options.publicKinds
  });

  if (signed.ok) return signed.url;
  return artworkPublicFallbackUrl(storagePath) ?? publicPathToUrl(storagePath ?? "") ?? null;
}
