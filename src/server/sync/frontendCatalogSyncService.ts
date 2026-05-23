import "server-only";

import { listCollectorCards, type CollectorCardRecord } from "@/server/collector-cards/collectorCardService";
import { collectorCardProductSlug, vaultItemProductSlug } from "@/server/commerce/pricingTaxonomies";
import { audioQualityBadgeFromMetadata } from "@/lib/media/audioQualityBadge";
import { persistSyncEvent } from "@/server/events/syncEventPersistenceService";
import { listVaultItems, type VaultItemRecord } from "@/server/vault/vaultItemService";
import { upsertSyncState, markSyncDirty } from "@/server/sync/syncStateService";
import { normalizeStoragePathForStorefront } from "@/server/sync/normalizeStoragePath";
import {
  isStorefrontSyncPushReady,
  storefrontSyncBaseUrl,
  validateStorefrontSyncEnv
} from "@/server/sync/storefrontSyncConfig";
import { publicPathToUrl } from "@/server/media/catalogMediaUrl";
import { getServerSupabase } from "@/server/supabase/client";

const FULL_AUDIO_ROLES = ["full_audio", "master_audio", "audio", "audio_full_song", "track_audio"];

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
  content_type?: string | null;
  content_id?: string | null;
  gifting_enabled?: boolean;
  active: boolean;
  metadata: Record<string, unknown>;
};

function storefrontApiBase() {
  return storefrontSyncBaseUrl();
}

export { validateStorefrontSyncEnv, isStorefrontSyncPushReady };

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

function mapReleaseTypeToStorefrontProductType(releaseType: string | null | undefined) {
  if (releaseType === "feature") return "feature";
  if (releaseType === "album" || releaseType === "ep") return "album";
  return "single";
}

async function resolveReleasePrimaryStoragePath(
  supabase: NonNullable<ReturnType<typeof getServerSupabase>>,
  releaseId: string
) {
  const { data: tracks } = await supabase
    .from("tracks")
    .select("id")
    .eq("release_id", releaseId)
    .order("position", { ascending: true })
    .limit(1);

  const trackId = tracks?.[0]?.id as string | undefined;
  if (!trackId) return null;

  const { data: linked } = await supabase
    .from("release_media")
    .select("media_assets(storage_path)")
    .eq("track_id", trackId)
    .eq("is_active", true)
    .in("asset_role", FULL_AUDIO_ROLES)
    .order("is_primary", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nested = linked?.media_assets as { storage_path?: string } | { storage_path?: string }[] | null | undefined;
  const asset = Array.isArray(nested) ? nested[0] : nested;
  if (asset?.storage_path) return asset.storage_path;

  const { data: owned } = await supabase
    .from("media_assets")
    .select("storage_path")
    .eq("owner_type", "track")
    .eq("owner_id", trackId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (owned?.storage_path as string | undefined) ?? null;
}

export async function listReleaseProductsForStorefrontSync(releaseIds?: string[]) {
  const supabase = getServerSupabase();
  if (!supabase) return [];

  const { data: products, error: productError } = await supabase
    .from("products")
    .select("slug, name, label, content_id, content_type, price_cents, gifting_enabled, active")
    .eq("content_type", "release")
    .eq("active", true)
    .not("price_cents", "is", null);

  if (productError || !products?.length) return [];

  const contentIds = products.map((row) => row.content_id as string).filter(Boolean);
  if (!contentIds.length) return [];

  let releaseQuery = supabase
    .from("releases")
    .select("id, slug, title, release_type, status, cover_art_r2_key, cs_cover")
    .in("id", contentIds)
    .eq("status", "published");

  if (releaseIds?.length) {
    releaseQuery = releaseQuery.in("id", releaseIds);
  }

  const { data: releases, error: releaseError } = await releaseQuery;
  if (releaseError || !releases?.length) return [];

  const releaseById = new Map(releases.map((row) => [row.id as string, row]));
  const rows: StorefrontProductRow[] = [];

  for (const product of products) {
    const release = releaseById.get(product.content_id as string);
    if (!release) continue;

    const storagePath = await resolveReleasePrimaryStoragePath(supabase, release.id as string);
    const rawCover = (release.cs_cover as string | null) ?? (release.cover_art_r2_key as string | null);
    const coverUrl = rawCover
      ? /^https?:\/\//i.test(rawCover)
        ? rawCover
        : publicPathToUrl(rawCover)
      : null;

    const canonicalPath = normalizeStoragePathForStorefront(storagePath);
    rows.push({
      slug: product.slug as string,
      title: (product.label as string) ?? (product.name as string) ?? (release.title as string),
      product_type: mapReleaseTypeToStorefrontProductType(release.release_type as string),
      price_cents: product.price_cents as number,
      cover_url: coverUrl,
      storage_path: canonicalPath || null,
      preview_path: null,
      content_type: "release",
      content_id: release.id as string,
      gifting_enabled: Boolean(product.gifting_enabled),
      active: true,
      metadata: {
        content_type: "release",
        content_id: release.id,
        release_slug: release.slug,
        release_type: release.release_type,
        canonical_media_path: canonicalPath || null
      }
    });
  }

  return rows;
}

function mapVaultItemToStorefrontProduct(item: VaultItemRecord): StorefrontProductRow | null {
  if (item.priceInCents == null) return null;
  const canonicalPath = normalizeStoragePathForStorefront(
    item.contentStoragePath ?? item.mediaStoragePath ?? null
  );
  return {
    slug: vaultItemProductSlug(item.slug),
    title: item.title,
    product_type: "vault",
    price_cents: item.priceInCents,
    cover_url: item.shelfUrl ?? item.coverUrl ?? null,
    storage_path: canonicalPath || null,
    preview_path: normalizeStoragePathForStorefront(item.shelfStoragePath ?? item.previewStoragePath ?? null) || null,
    gifting_enabled: item.giftingEnabled,
    active: item.visibility === "published",
    metadata: {
      content_type: "vault_item",
      content_id: item.id,
      category: item.category,
      canonical_media_path: canonicalPath || null
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
    failed?: Array<{ slug?: string; error?: string }>;
  };

  if (!response.ok) {
    return { ok: false as const, message: payload.error ?? `Storefront sync failed (${response.status})` };
  }

  const failed = Array.isArray(payload.failed) ? payload.failed : [];

  return {
    ok: failed.length === 0,
    vaultUpserted: payload.vaultUpserted ?? input.vaultContent?.length ?? 0,
    productUpserted: payload.productUpserted ?? input.products?.length ?? 0,
    failed,
    partial: failed.length > 0
  };
}

async function runWithRetries<T>(fn: () => Promise<T>, attempts = 2) {
  validateStorefrontSyncEnv();
  if (!isStorefrontSyncPushReady()) {
    console.warn("[sync] storefront sync URL or ADMIN_SEED_SECRET not configured; skipping catalog sync");
    throw new Error("Storefront sync not configured");
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
  }
  throw lastError;
}

export async function syncPublishedCatalogToStorefront(input?: {
  vaultItemIds?: string[];
  collectorCardIds?: string[];
  releaseIds?: string[];
  reason?: string;
}) {
  if (process.env.DISABLE_CATALOG_SYNC === "1") {
    return { ok: false as const, message: "Catalog sync disabled (DISABLE_CATALOG_SYNC=1)" };
  }

  const [vaultItems, cards, releaseProducts] = await Promise.all([
    listVaultItems(),
    listCollectorCards(),
    listReleaseProductsForStorefrontSync(input?.releaseIds)
  ]);

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
    ...releaseProducts,
    ...cardTarget.map(mapCollectorCardToStorefrontProduct),
    ...vaultTarget.map(mapVaultItemToStorefrontProduct).filter(Boolean)
  ] as StorefrontProductRow[];

  const result = await runWithRetries(() =>
    pushCatalogSyncPayload({ vaultContent, products, reason: input?.reason })
  );

  const failedSlugs = "failed" in result && result.failed ? result.failed : [];

  if (result.ok && failedSlugs.length === 0) {
    await upsertSyncState({
      key: "catalog",
      dirty: false,
      metadata: {
        lastStorefrontSyncAt: new Date().toISOString(),
        vaultUpserted: result.vaultUpserted,
        productUpserted: result.productUpserted,
        failedSlugs: [],
        reason: input?.reason
      }
    });
    await persistSyncEvent({
      type: "vault.updated",
      entityId: "catalog",
      timestamp: Date.now(),
      data: { storefrontSync: true, ...result, reason: input?.reason }
    });
  } else {
    await markSyncDirty("catalog", {
      reason: input?.reason ?? "catalog.sync_partial_failure",
      failedSlugs,
      vaultUpserted: "vaultUpserted" in result ? result.vaultUpserted : 0,
      productUpserted: "productUpserted" in result ? result.productUpserted : 0,
      message: "message" in result ? result.message : "Partial catalog sync failure"
    });
    await persistSyncEvent({
      type: "vault.updated",
      entityId: "catalog",
      timestamp: Date.now(),
      data: { storefrontSync: false, failedSlugs, reason: input?.reason }
    });
  }

  return result;
}

export async function resolveReleasePrimaryStoragePathForPublish(releaseId: string) {
  const supabase = getServerSupabase();
  if (!supabase) return null;
  return resolveReleasePrimaryStoragePath(supabase, releaseId);
}

export async function assertPublishStorefrontReadiness(input: {
  releaseId: string;
  priceInCents: number | null | undefined;
}) {
  if (input.priceInCents == null) {
    return { ok: true as const };
  }

  if (!isStorefrontSyncPushReady()) {
    return {
      ok: false as const,
      message:
        "Paid releases require STOREFRONT_SYNC_URL and ADMIN_SEED_SECRET before publish so the storefront product can sync."
    };
  }

  const storagePath = await resolveReleasePrimaryStoragePathForPublish(input.releaseId);
  if (!storagePath) {
    return {
      ok: false as const,
      message: "Paid release is missing a primary audio storage path for storefront playback."
    };
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    return { ok: false as const, message: "Database is not configured for publish validation." };
  }

  const { data: product } = await supabase
    .from("products")
    .select("slug, active")
    .eq("content_type", "release")
    .eq("content_id", input.releaseId)
    .maybeSingle();

  if (!product?.slug) {
    return {
      ok: false as const,
      message: "Paid release must have an active control product row before publish."
    };
  }

  return { ok: true as const, storagePath: normalizeStoragePathForStorefront(storagePath) };
}

export function queueStorefrontCatalogSync(input?: {
  vaultItemIds?: string[];
  collectorCardIds?: string[];
  releaseIds?: string[];
  reason?: string;
}) {
  void runWithRetries(() => syncPublishedCatalogToStorefront(input), 2).catch((error) => {
    console.warn("[catalog-sync] storefront push failed after retries", error);
  });
}
