import "server-only";

import crypto from "node:crypto";
import { vaultItemProductSlug, type VaultCategory } from "@/server/commerce/pricingTaxonomies";
import { validateVaultCategory, validateVaultItemPriceInCents } from "@/server/commerce/pricingValidation";
import { upsertCatalogProduct } from "@/server/commerce/productCommerceService";
import { markSyncDirty } from "@/server/sync/syncStateService";
import { queueStorefrontCatalogSync } from "@/server/sync/frontendCatalogSyncService";
import { maybeSendDropNotification } from "@/server/sync/dropNotificationService";
import { getServerSupabase } from "@/server/supabase/client";

export type VaultItemVisibility = "draft" | "scheduled" | "published" | "archived";
export type VaultAccessTier = "public" | "inner_circle" | "vault_pass";
export type VaultMediaType =
  | "audio"
  | "video"
  | "image"
  | "text"
  | "mixed"
  | "schedule"
  | "archive"
  | "commentary";

export type VaultDropType = "surprise" | "promo" | "limited";

export type VaultItemRecord = {
  id: string;
  slug: string;
  category: VaultCategory;
  title: string;
  description: string;
  accessTier: VaultAccessTier;
  mediaType: VaultMediaType;
  atmosphere?: string | null;
  behavior?: string | null;
  coverUrl?: string | null;
  previewStoragePath?: string | null;
  mediaStoragePath?: string | null;
  shelfStoragePath?: string | null;
  shelfUrl?: string | null;
  contentStoragePath?: string | null;
  contentUrl?: string | null;
  priceInCents?: number | null;
  giftingEnabled: boolean;
  durationSeconds?: number | null;
  sortOrder: number;
  featured: boolean;
  visibility: VaultItemVisibility;
  publishedAt?: string | null;
  isDropItem: boolean;
  dropType?: VaultDropType | null;
  expiresAt?: string | null;
  tierVisibility: string[];
  claimLimit?: number | null;
  claimCount: number;
  notificationSent: boolean;
  glowEffect: boolean;
  promoCode?: string | null;
  promoCodeHash?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type VaultItemWriteInput = {
  category?: string;
  title?: string;
  slug?: string;
  description?: string;
  accessTier?: VaultAccessTier;
  mediaType?: VaultMediaType;
  atmosphere?: string | null;
  behavior?: string | null;
  coverUrl?: string | null;
  previewStoragePath?: string | null;
  mediaStoragePath?: string | null;
  shelfStoragePath?: string | null;
  shelfUrl?: string | null;
  contentStoragePath?: string | null;
  contentUrl?: string | null;
  priceInCents?: number | null;
  giftingEnabled?: boolean;
  durationSeconds?: number | null;
  sortOrder?: number;
  featured?: boolean;
  visibility?: VaultItemVisibility;
  isDropItem?: boolean;
  dropType?: VaultDropType | null;
  expiresAt?: string | null;
  tierVisibility?: string[];
  claimLimit?: number | null;
  glowEffect?: boolean;
  promoCode?: string | null;
  metadata?: Record<string, unknown>;
};

type VaultItemRow = {
  id: string;
  slug: string;
  category: string;
  title: string;
  description: string;
  access_tier: VaultAccessTier;
  media_type: VaultMediaType;
  atmosphere: string | null;
  behavior: string | null;
  cover_url: string | null;
  preview_storage_path: string | null;
  media_storage_path: string | null;
  price_in_cents: number | null;
  gifting_enabled: boolean;
  duration_seconds: number | null;
  sort_order: number;
  featured: boolean;
  visibility: VaultItemVisibility;
  published_at: string | null;
  shelf_storage_path?: string | null;
  shelf_url?: string | null;
  content_storage_path?: string | null;
  content_url?: string | null;
  is_drop_item?: boolean | null;
  drop_type?: VaultDropType | null;
  expires_at?: string | null;
  tier_visibility?: string[] | null;
  claim_limit?: number | null;
  claim_count?: number | null;
  notification_sent?: boolean | null;
  glow_effect?: boolean | null;
  promo_code?: string | null;
  promo_code_hash?: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

const memoryVaultItems = new Map<string, VaultItemRecord>();

function nowIso() {
  return new Date().toISOString();
}

function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `vault-${Date.now()}`;
}

function uniqueSlug(baseSlug: string, existingId?: string) {
  const base = slugify(baseSlug);
  let next = base;
  let index = 2;
  while ([...memoryVaultItems.values()].some((item) => item.slug === next && item.id !== existingId)) {
    next = `${base}-${index}`;
    index += 1;
  }
  return next;
}

function fromRow(row: VaultItemRow): VaultItemRecord {
  return {
    id: row.id,
    slug: row.slug,
    category: row.category as VaultCategory,
    title: row.title,
    description: row.description,
    accessTier: row.access_tier,
    mediaType: row.media_type,
    atmosphere: row.atmosphere,
    behavior: row.behavior,
    coverUrl: row.cover_url,
    previewStoragePath: row.preview_storage_path,
    mediaStoragePath: row.media_storage_path,
    priceInCents: row.price_in_cents,
    giftingEnabled: row.gifting_enabled,
    durationSeconds: row.duration_seconds,
    sortOrder: row.sort_order,
    featured: row.featured,
    visibility: row.visibility,
    publishedAt: row.published_at,
    shelfStoragePath: row.shelf_storage_path ?? null,
    shelfUrl: row.shelf_url ?? null,
    contentStoragePath: row.content_storage_path ?? null,
    contentUrl: row.content_url ?? null,
    isDropItem: Boolean(row.is_drop_item),
    dropType: row.drop_type ?? null,
    expiresAt: row.expires_at ?? null,
    tierVisibility: row.tier_visibility ?? [],
    claimLimit: row.claim_limit ?? null,
    claimCount: row.claim_count ?? 0,
    notificationSent: Boolean(row.notification_sent),
    glowEffect: Boolean(row.glow_effect),
    promoCode: row.promo_code ?? null,
    promoCodeHash: row.promo_code_hash ?? null,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toRow(item: VaultItemRecord): VaultItemRow {
  return {
    id: item.id,
    slug: item.slug,
    category: item.category,
    title: item.title,
    description: item.description,
    access_tier: item.accessTier,
    media_type: item.mediaType,
    atmosphere: item.atmosphere ?? null,
    behavior: item.behavior ?? null,
    cover_url: item.coverUrl ?? null,
    preview_storage_path: item.previewStoragePath ?? null,
    media_storage_path: item.mediaStoragePath ?? null,
    price_in_cents: item.priceInCents ?? null,
    gifting_enabled: item.giftingEnabled,
    duration_seconds: item.durationSeconds ?? null,
    sort_order: item.sortOrder,
    featured: item.featured,
    visibility: item.visibility,
    published_at: item.publishedAt ?? null,
    shelf_storage_path: item.shelfStoragePath ?? null,
    shelf_url: item.shelfUrl ?? null,
    content_storage_path: item.contentStoragePath ?? null,
    content_url: item.contentUrl ?? null,
    is_drop_item: item.isDropItem,
    drop_type: item.dropType ?? null,
    expires_at: item.expiresAt ?? null,
    tier_visibility: item.tierVisibility,
    claim_limit: item.claimLimit ?? null,
    claim_count: item.claimCount,
    notification_sent: item.notificationSent,
    glow_effect: item.glowEffect,
    promo_code: item.promoCode ?? null,
    promo_code_hash: item.promoCodeHash ?? null,
    metadata: item.metadata,
    created_at: item.createdAt,
    updated_at: item.updatedAt
  };
}

function hashPromoCode(value: string) {
  return crypto.createHash("sha256").update(value.trim().toUpperCase()).digest("hex");
}

export function generatePromoCode(prefix = "DROP") {
  const token = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `${prefix}-${token}`;
}

function buildRecord(input: VaultItemWriteInput, existing?: VaultItemRecord): VaultItemRecord {
  if (input.category && !validateVaultCategory(input.category) && !existing) {
    throw new Error(`Invalid vault category: ${input.category}`);
  }
  const category = (
    input.category && validateVaultCategory(input.category) ? input.category : existing?.category
  ) as VaultCategory;
  if (!category) throw new Error("Vault category is required.");

  const timestamp = nowIso();
  const visibility = input.visibility ?? existing?.visibility ?? "draft";
  const isDropItem = input.isDropItem ?? existing?.isDropItem ?? false;
  const promoCode =
    input.promoCode !== undefined
      ? input.promoCode
      : existing?.promoCode ?? (isDropItem && !existing ? generatePromoCode() : null);

  return {
    id: existing?.id ?? crypto.randomUUID(),
    slug: uniqueSlug(input.slug ?? input.title ?? existing?.title ?? "vault-item", existing?.id),
    category,
    title: (input.title ?? existing?.title ?? "").trim(),
    description: input.description?.trim() ?? existing?.description ?? "",
    accessTier: input.accessTier ?? existing?.accessTier ?? "inner_circle",
    mediaType: input.mediaType ?? existing?.mediaType ?? "text",
    atmosphere: input.atmosphere !== undefined ? input.atmosphere : existing?.atmosphere ?? null,
    behavior: input.behavior !== undefined ? input.behavior : existing?.behavior ?? null,
    coverUrl: input.coverUrl !== undefined ? input.coverUrl : existing?.coverUrl ?? null,
    previewStoragePath:
      input.previewStoragePath !== undefined ? input.previewStoragePath : existing?.previewStoragePath ?? null,
    mediaStoragePath:
      input.mediaStoragePath !== undefined ? input.mediaStoragePath : existing?.mediaStoragePath ?? null,
    priceInCents: input.priceInCents !== undefined ? input.priceInCents : existing?.priceInCents ?? null,
    giftingEnabled: input.giftingEnabled ?? existing?.giftingEnabled ?? false,
    durationSeconds:
      input.durationSeconds !== undefined ? input.durationSeconds : existing?.durationSeconds ?? null,
    sortOrder: input.sortOrder ?? existing?.sortOrder ?? 100,
    featured: input.featured ?? existing?.featured ?? false,
    visibility,
    publishedAt: visibility === "published" ? existing?.publishedAt ?? timestamp : existing?.publishedAt ?? null,
    shelfStoragePath:
      input.shelfStoragePath !== undefined ? input.shelfStoragePath : existing?.shelfStoragePath ?? null,
    shelfUrl: input.shelfUrl !== undefined ? input.shelfUrl : existing?.shelfUrl ?? null,
    contentStoragePath:
      input.contentStoragePath !== undefined ? input.contentStoragePath : existing?.contentStoragePath ?? null,
    contentUrl: input.contentUrl !== undefined ? input.contentUrl : existing?.contentUrl ?? null,
    isDropItem,
    dropType: input.dropType !== undefined ? input.dropType : existing?.dropType ?? null,
    expiresAt: input.expiresAt !== undefined ? input.expiresAt : existing?.expiresAt ?? null,
    tierVisibility: input.tierVisibility ?? existing?.tierVisibility ?? [],
    claimLimit: input.claimLimit !== undefined ? input.claimLimit : existing?.claimLimit ?? null,
    claimCount: existing?.claimCount ?? 0,
    notificationSent: existing?.notificationSent ?? false,
    glowEffect: input.glowEffect ?? existing?.glowEffect ?? false,
    promoCode,
    promoCodeHash: promoCode ? hashPromoCode(promoCode) : null,
    metadata: { ...(existing?.metadata ?? {}), ...(input.metadata ?? {}) },
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp
  };
}

async function readFromSupabase(category?: string): Promise<VaultItemRecord[] | null> {
  const supabase = getServerSupabase();
  if (!supabase) return null;
  let query = supabase.from("vault_items").select("*").order("sort_order", { ascending: true });
  if (category) query = query.eq("category", category);
  const { data, error } = await query;
  if (error) return null;
  return (data as VaultItemRow[]).map(fromRow);
}

async function persist(item: VaultItemRecord) {
  memoryVaultItems.set(item.id, item);
  const supabase = getServerSupabase();
  if (!supabase) return item;
  const { error } = await supabase.from("vault_items").upsert(toRow(item), { onConflict: "id" });
  if (error) return item;
  return item;
}

export async function listVaultItems(category?: string) {
  const persisted = await readFromSupabase(category);
  if (persisted) {
    persisted.forEach((item) => memoryVaultItems.set(item.id, item));
    return persisted;
  }
  const items = [...memoryVaultItems.values()];
  return category ? items.filter((item) => item.category === category) : items;
}

export async function getVaultItem(id: string) {
  const items = await listVaultItems();
  return items.find((item) => item.id === id || item.slug === id) ?? null;
}

export async function createVaultItem(input: VaultItemWriteInput) {
  if (!input.category || !validateVaultCategory(input.category)) {
    throw new Error("Invalid vault category.");
  }
  if (!input.title?.trim()) {
    throw new Error("Title is required.");
  }
  const priceCheck = validateVaultItemPriceInCents(input.priceInCents);
  if (!priceCheck.ok) throw new Error(priceCheck.message);
  return persist(buildRecord(input));
}

export async function updateVaultItem(id: string, input: VaultItemWriteInput) {
  const existing = await getVaultItem(id);
  if (!existing) return null;
  const merged = buildRecord({ ...input, title: input.title || existing.title, category: input.category || existing.category }, existing);
  const priceCheck = validateVaultItemPriceInCents(merged.priceInCents);
  if (!priceCheck.ok) throw new Error(priceCheck.message);
  return persist(merged);
}

export async function deleteVaultItem(id: string) {
  const existing = await getVaultItem(id);
  if (!existing) return false;
  memoryVaultItems.delete(existing.id);
  const supabase = getServerSupabase();
  if (supabase) {
    await supabase.from("vault_items").delete().eq("id", existing.id);
  }
  return true;
}

export async function publishVaultItem(id: string) {
  const existing = await getVaultItem(id);
  if (!existing) return { ok: false as const, message: "Vault item not found." };

  const priceCheck = validateVaultItemPriceInCents(existing.priceInCents);
  if (!priceCheck.ok) return priceCheck;

  const timestamp = nowIso();
  const published: VaultItemRecord = {
    ...existing,
    visibility: "published",
    publishedAt: timestamp,
    updatedAt: timestamp
  };
  await persist(published);

  if (published.priceInCents != null) {
    const productSlug = vaultItemProductSlug(published.slug);
    const product = await upsertCatalogProduct({
      slug: productSlug,
      label: published.title,
      contentType: "vault_item",
      contentId: published.id,
      priceCents: published.priceInCents,
      giftingEnabled: published.giftingEnabled,
      active: true,
      grants: [{ type: "vault_collection", collectionId: published.category }]
    });
    if (!product.ok) return product;
  }

  await markSyncDirty("vault", { vaultItemId: published.id, reason: "vault_item.published" });
  await markSyncDirty("catalog", { vaultItemId: published.id, reason: "vault_item.published" });

  queueStorefrontCatalogSync({ vaultItemIds: [published.id], reason: "vault_item.published" });
  void maybeSendDropNotification(published).catch((error) => {
    console.warn("[vault-drop] notification failed", error);
  });

  return { ok: true as const, item: published };
}

export async function listDropVaultItems() {
  const items = await listVaultItems();
  return items.filter((item) => item.isDropItem);
}
