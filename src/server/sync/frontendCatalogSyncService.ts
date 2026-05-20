import "server-only";

import { listCollectorCards, type CollectorCardRecord } from "@/server/collector-cards/collectorCardService";
import { collectorCardProductSlug, vaultItemProductSlug } from "@/server/commerce/pricingTaxonomies";
import { audioQualityBadgeFromMetadata } from "@/lib/media/audioQualityBadge";
import { persistSyncEvent } from "@/server/events/syncEventPersistenceService";
import { listVaultItems, type VaultItemRecord } from "@/server/vault/vaultItemService";
import { upsertSyncState } from "@/server/sync/syncStateService";
import { publicPathToUrl } from "@/server/media/catalogMediaUrl";

type StorefrontVaultRow = {
  slug: string;
  category: string;
  title: string;
  description: string;
  access_tier: string;
  media_type: string;
  atmosphere?: string | null;
  behavior?: string | null;
  cover_url?: string | null;
  thumbnail_url?: string | null;
  preview_url?: string | null;
  content_url?: string | null;
  preview_storage_path?: string | null;
  media_storage_path?: string | null;
  duration_seconds?: number | null;
  sort_order: number;
  featured: boolean;
  visibility: string;
  published_at?: string | null;
  metadata: Record<string, unknown>;
};

type StorefrontProductRow = {
  slug: string;
  title: string;
  product_type: string;
  price_cents: number;
  cover_url?: string | null;
  storage_path?: string | null;
  preview_path?: string | null;
  gifting_enabled?: boolean;
  active: boolean;
  metadata: Record<string, unknown>;
};

function storefrontApiBase() {
  return (
    process.env.ARTIST_PLATFORM_API_URL ??
    process.env.NEXT_PUBLIC_FRONTEND_URL ??
    process.env.ARTIST_PLATFORM_PUBLIC_URL ??
    "http://localhost:3000"
  ).replace(/\/+$/, "");
}

function storagePublicUrl(path?: string | null) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return publicPathToUrl(path);
}

export function mapVaultItemToStorefrontContent(item: VaultItemRecord): StorefrontVaultRow {
  const shelfUrl = item.shelfUrl ?? item.coverUrl ?? null;
  const contentUrl = item.contentUrl ?? storagePublicUrl(item.contentStoragePath ?? item.mediaStoragePath);
  const audioBadge = audioQualityBadgeFromMetadata(item.metadata);

  return {
    slug: item.slug,
    category: item.category,
    title: item.title,
    description: item.description,
    access_tier: item.accessTier,
    media_type: item.mediaType,
    atmosphere: item.atmosphere ?? null,
    behavior: item.behavior ?? null,
    cover_url: shelfUrl,
    thumbnail_url: shelfUrl,
    preview_url: storagePublicUrl(item.shelfStoragePath ?? item.previewStoragePath) ?? shelfUrl,
    content_url: contentUrl,
    preview_storage_path: item.shelfStoragePath ?? item.previewStoragePath ?? null,
    media_storage_path: item.contentStoragePath ?? item.mediaStoragePath ?? null,
    duration_seconds: item.durationSeconds ?? null,
    sort_order: item.sortOrder,
    featured: item.featured,
    visibility: item.visibility === "published" ? "published" : item.visibility,
    published_at: item.publishedAt ?? null,
    metadata: {
      ...item.metadata,
      control_vault_item_id: item.id,
      audioQualityBadge: audioBadge,
      isDropItem: item.isDropItem,
      dropType: item.dropType,
      expiresAt: item.expiresAt,
      tierVisibility: item.tierVisibility,
      glowEffect: item.glowEffect,
      promoCodeConfigured: Boolean(item.promoCode)
    }
  };
}

function mapCollectorCardToStorefrontProduct(card: CollectorCardRecord): StorefrontProductRow {
  const slug =
    (typeof card.metadata?.storefrontSlug === "string" && card.metadata.storefrontSlug) ||
    collectorCardProductSlug(card.slug);
  const productType =
    (typeof card.metadata?.storefrontProductType === "string" && card.metadata.storefrontProductType) || "vault";

  return {
    slug,
    title: card.title,
    product_type: productType,
    price_cents: card.priceInCents ?? 0,
    cover_url: card.coverUrl ?? null,
    gifting_enabled: card.giftingEnabled,
    active: card.active && card.visibility === "published",
    metadata: {
      ...card.metadata,
      content_type: "collector_card",
      content_id: card.id,
      description: card.description,
      edition_size: card.editionSize,
      edition_label: card.editionLabel,
      badge: card.editionLabel || "COLLECTOR",
      features: Array.isArray(card.metadata?.features) ? card.metadata.features : []
    }
  };
}

function mapVaultItemToStorefrontProduct(item: VaultItemRecord): StorefrontProductRow | null {
  if (item.priceInCents == null) return null;
  return {
    slug: vaultItemProductSlug(item.slug),
    title: item.title,
    product_type: "vault",
    price_cents: item.priceInCents,
    cover_url: item.shelfUrl ?? item.coverUrl ?? null,
    storage_path: item.contentStoragePath ?? item.mediaStoragePath ?? null,
    preview_path: item.shelfStoragePath ?? item.previewStoragePath ?? null,
    gifting_enabled: item.giftingEnabled,
    active: item.visibility === "published",
    metadata: {
      content_type: "vault_item",
      content_id: item.id,
      category: item.category
    }
  };
}

export async function pushCatalogSyncPayload(input: {
  vaultContent?: StorefrontVaultRow[];
  products?: StorefrontProductRow[];
  reason?: string;
}) {
  const secret = process.env.ADMIN_SEED_SECRET;
  if (!secret) {
    return { ok: false as const, message: "ADMIN_SEED_SECRET not configured for storefront sync." };
  }

  const response = await fetch(`${storefrontApiBase()}/api/admin/sync/catalog`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-seed-secret": secret
    },
    body: JSON.stringify({
      vaultContent: input.vaultContent ?? [],
      products: input.products ?? [],
      reason: input.reason ?? "control.catalog.sync"
    }),
    cache: "no-store"
  });

  const payload = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    vaultUpserted?: number;
    productUpserted?: number;
  };

  if (!response.ok) {
    return { ok: false as const, message: payload.error ?? `Storefront sync failed (${response.status})` };
  }

  return {
    ok: true as const,
    vaultUpserted: payload.vaultUpserted ?? input.vaultContent?.length ?? 0,
    productUpserted: payload.productUpserted ?? input.products?.length ?? 0
  };
}

async function runWithRetries<T>(fn: () => Promise<T>, attempts = 3) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 400));
      }
    }
  }
  throw lastError;
}

export async function syncPublishedCatalogToStorefront(input?: {
  vaultItemIds?: string[];
  collectorCardIds?: string[];
  reason?: string;
}) {
  const [vaultItems, cards] = await Promise.all([listVaultItems(), listCollectorCards()]);

  const vaultPublished = vaultItems.filter((item) => item.visibility === "published");
  const vaultTarget = input?.vaultItemIds?.length
    ? vaultPublished.filter((item) => input.vaultItemIds?.includes(item.id))
    : vaultPublished;

  const cardsPublished = cards.filter((card) => card.visibility === "published");
  const cardTarget = input?.collectorCardIds?.length
    ? cardsPublished.filter((card) => input.collectorCardIds?.includes(card.id))
    : cardsPublished;

  const vaultContent = vaultTarget.map(mapVaultItemToStorefrontContent);
  const products = [
    ...cardTarget.map(mapCollectorCardToStorefrontProduct),
    ...vaultTarget.map(mapVaultItemToStorefrontProduct).filter(Boolean)
  ] as StorefrontProductRow[];

  const result = await runWithRetries(() =>
    pushCatalogSyncPayload({ vaultContent, products, reason: input?.reason })
  );

  if (result.ok) {
    await upsertSyncState({
      key: "catalog",
      dirty: false,
      metadata: {
        lastStorefrontSyncAt: new Date().toISOString(),
        vaultUpserted: result.vaultUpserted,
        productUpserted: result.productUpserted,
        reason: input?.reason
      }
    });
    await persistSyncEvent({
      type: "vault.updated",
      entityId: "catalog",
      timestamp: Date.now(),
      data: { storefrontSync: true, ...result, reason: input?.reason }
    });
  }

  return result;
}

export function queueStorefrontCatalogSync(input?: {
  vaultItemIds?: string[];
  collectorCardIds?: string[];
  reason?: string;
}) {
  void runWithRetries(() => syncPublishedCatalogToStorefront(input), 3).catch((error) => {
    console.warn("[catalog-sync] storefront push failed after retries", error);
  });
}
