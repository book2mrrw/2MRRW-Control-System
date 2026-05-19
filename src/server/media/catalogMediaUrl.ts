import "server-only";

import { createSignedMediaUrl } from "@/server/media/signedUrlService";
import type { MediaAssetContract } from "@/server/media/mediaObjects";

const DEFAULT_FRONTEND_PUBLIC_BASE =
  process.env.ARTIST_PLATFORM_PUBLIC_URL ??
  process.env.NEXT_PUBLIC_FRONTEND_URL ??
  "https://2mrrw-official.vercel.app";

export function publicPathToUrl(storagePath: string) {
  if (/^https?:\/\//i.test(storagePath)) return storagePath;
  if (storagePath.startsWith("/")) {
    return `${DEFAULT_FRONTEND_PUBLIC_BASE.replace(/\/$/, "")}${storagePath}`;
  }
  return null;
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

  if (!assetId) return null;

  const signed = await createSignedMediaUrl(null, assetId, {
    studioBypass: options.studioBypass ?? true,
    publicKinds: options.publicKinds
  });

  return signed.ok ? signed.url : publicPathToUrl(storagePath ?? "") ?? null;
}
