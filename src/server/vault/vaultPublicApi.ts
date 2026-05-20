import "server-only";

import { audioQualityBadgeFromMetadata } from "@/lib/media/audioQualityBadge";
import { publicPathToUrl } from "@/server/media/catalogMediaUrl";
import { listVaultItems } from "@/server/vault/vaultItemService";

function mediaUrl(path?: string | null, direct?: string | null) {
  if (direct) return direct;
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return publicPathToUrl(path);
}

export async function listPublishedVaultApiSections() {
  const items = (await listVaultItems()).filter((item) => item.visibility === "published");

  return items.map((item) => {
    const shelf = item.shelfUrl ?? item.coverUrl ?? null;
    const previewUrl = mediaUrl(item.shelfStoragePath ?? item.previewStoragePath, shelf);
    const contentUrl = mediaUrl(item.contentStoragePath ?? item.mediaStoragePath, item.contentUrl);

    return {
      id: item.id,
      slug: item.slug,
      title: item.title,
      description: item.description,
      category: item.category,
      accessTier: item.accessTier,
      access_tier: item.accessTier,
      mediaType: item.mediaType,
      media_type: item.mediaType,
      atmosphere: item.atmosphere,
      behavior: item.behavior,
      cover: shelf,
      coverUrl: shelf,
      previewUrl,
      mediaUrl: contentUrl,
      contentUrl,
      hasPreview: Boolean(previewUrl),
      hasMedia: Boolean(contentUrl),
      unlocked: item.accessTier === "public",
      visibility: "published",
      status: "published",
      featured: item.featured,
      order: item.sortOrder,
      sortOrder: item.sortOrder,
      durationSeconds: item.durationSeconds,
      metadata: {
        ...item.metadata,
        audioQualityBadge: audioQualityBadgeFromMetadata(item.metadata),
        isDropItem: item.isDropItem,
        glowEffect: item.glowEffect
      }
    };
  });
}
