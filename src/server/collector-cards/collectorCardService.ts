import "server-only";

import crypto from "node:crypto";
import { collectorCardProductSlug } from "@/server/commerce/pricingTaxonomies";
import { validateCollectorCardPriceInCents } from "@/server/commerce/pricingValidation";
import { upsertCatalogProduct } from "@/server/commerce/productCommerceService";
import { markSyncDirty } from "@/server/sync/syncStateService";
import { getServerSupabase } from "@/server/supabase/client";

export type CollectorCardVisibility = "draft" | "published" | "archived";

export type CollectorCardRecord = {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverUrl?: string | null;
  priceInCents?: number | null;
  editionSize?: number | null;
  editionLabel?: string | null;
  giftingEnabled: boolean;
  active: boolean;
  visibility: CollectorCardVisibility;
  publishedAt?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type CollectorCardWriteInput = {
  title?: string;
  slug?: string;
  description?: string;
  coverUrl?: string | null;
  priceInCents?: number | null;
  editionSize?: number | null;
  editionLabel?: string | null;
  giftingEnabled?: boolean;
  active?: boolean;
  visibility?: CollectorCardVisibility;
  metadata?: Record<string, unknown>;
};

type CollectorCardRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  cover_url: string | null;
  price_in_cents: number | null;
  edition_size: number | null;
  edition_label: string | null;
  gifting_enabled: boolean;
  active: boolean;
  visibility: CollectorCardVisibility;
  published_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

const memoryCards = new Map<string, CollectorCardRecord>();

function nowIso() {
  return new Date().toISOString();
}

function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `card-${Date.now()}`;
}

function uniqueSlug(baseSlug: string, existingId?: string) {
  const base = slugify(baseSlug);
  let next = base;
  let index = 2;
  while ([...memoryCards.values()].some((card) => card.slug === next && card.id !== existingId)) {
    next = `${base}-${index}`;
    index += 1;
  }
  return next;
}

function fromRow(row: CollectorCardRow): CollectorCardRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    coverUrl: row.cover_url,
    priceInCents: row.price_in_cents,
    editionSize: row.edition_size,
    editionLabel: row.edition_label,
    giftingEnabled: row.gifting_enabled,
    active: row.active,
    visibility: row.visibility,
    publishedAt: row.published_at,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toRow(card: CollectorCardRecord): CollectorCardRow {
  return {
    id: card.id,
    slug: card.slug,
    title: card.title,
    description: card.description,
    cover_url: card.coverUrl ?? null,
    price_in_cents: card.priceInCents ?? null,
    edition_size: card.editionSize ?? null,
    edition_label: card.editionLabel ?? null,
    gifting_enabled: card.giftingEnabled,
    active: card.active,
    visibility: card.visibility,
    published_at: card.publishedAt ?? null,
    metadata: card.metadata,
    created_at: card.createdAt,
    updated_at: card.updatedAt
  };
}

function buildRecord(input: CollectorCardWriteInput, existing?: CollectorCardRecord): CollectorCardRecord {
  const timestamp = nowIso();
  const visibility = input.visibility ?? existing?.visibility ?? "draft";
  return {
    id: existing?.id ?? crypto.randomUUID(),
    slug: uniqueSlug(input.slug ?? input.title ?? existing?.title ?? "card", existing?.id),
    title: (input.title ?? existing?.title ?? "").trim(),
    description: input.description?.trim() ?? existing?.description ?? "",
    coverUrl: input.coverUrl !== undefined ? input.coverUrl : existing?.coverUrl ?? null,
    priceInCents: input.priceInCents !== undefined ? input.priceInCents : existing?.priceInCents ?? null,
    editionSize: input.editionSize !== undefined ? input.editionSize : existing?.editionSize ?? null,
    editionLabel: input.editionLabel !== undefined ? input.editionLabel : existing?.editionLabel ?? null,
    giftingEnabled: input.giftingEnabled ?? existing?.giftingEnabled ?? false,
    active: input.active ?? existing?.active ?? true,
    visibility,
    publishedAt: visibility === "published" ? existing?.publishedAt ?? timestamp : existing?.publishedAt ?? null,
    metadata: { ...(existing?.metadata ?? {}), ...(input.metadata ?? {}) },
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp
  };
}

async function readFromSupabase(): Promise<CollectorCardRecord[] | null> {
  const supabase = getServerSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("collector_cards")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) return null;
  return (data as CollectorCardRow[]).map(fromRow);
}

async function persist(card: CollectorCardRecord) {
  const supabase = getServerSupabase();
  memoryCards.set(card.id, card);
  if (!supabase) return card;
  const { error } = await supabase.from("collector_cards").upsert(toRow(card), { onConflict: "id" });
  if (error) return card;
  return card;
}

export async function listCollectorCards() {
  const persisted = await readFromSupabase();
  if (persisted) {
    persisted.forEach((card) => memoryCards.set(card.id, card));
    return persisted;
  }
  return [...memoryCards.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getCollectorCard(id: string) {
  const cards = await listCollectorCards();
  return cards.find((card) => card.id === id || card.slug === id) ?? null;
}

export async function createCollectorCard(input: CollectorCardWriteInput) {
  if (!input.title?.trim()) throw new Error("Title is required.");
  const priceCheck = validateCollectorCardPriceInCents(input.priceInCents);
  if (!priceCheck.ok) throw new Error(priceCheck.message);
  if (input.giftingEnabled && input.priceInCents == null) {
    throw new Error("Gifting requires a valid storefront price.");
  }
  return persist(buildRecord(input));
}

export async function updateCollectorCard(id: string, input: CollectorCardWriteInput) {
  const existing = await getCollectorCard(id);
  if (!existing) return null;
  const merged = buildRecord({ ...input, title: input.title || existing.title }, existing);
  const priceCheck = validateCollectorCardPriceInCents(merged.priceInCents);
  if (!priceCheck.ok) throw new Error(priceCheck.message);
  if (merged.giftingEnabled && merged.priceInCents == null) {
    throw new Error("Gifting requires a valid storefront price.");
  }
  return persist(merged);
}

export async function deleteCollectorCard(id: string) {
  const existing = await getCollectorCard(id);
  if (!existing) return false;
  memoryCards.delete(existing.id);
  const supabase = getServerSupabase();
  if (supabase) {
    await supabase.from("collector_cards").delete().eq("id", existing.id);
  }
  return true;
}

export async function publishCollectorCard(id: string) {
  const existing = await getCollectorCard(id);
  if (!existing) return { ok: false as const, message: "Collector card not found." };

  const priceCheck = validateCollectorCardPriceInCents(existing.priceInCents);
  if (!priceCheck.ok) return priceCheck;
  if (existing.giftingEnabled && existing.priceInCents == null) {
    return { ok: false as const, message: "Gifting requires a valid storefront price." };
  }

  const timestamp = nowIso();
  const published: CollectorCardRecord = {
    ...existing,
    visibility: "published",
    active: true,
    publishedAt: timestamp,
    updatedAt: timestamp
  };
  await persist(published);

  const productSlug = collectorCardProductSlug(published.slug);
  const product = await upsertCatalogProduct({
    slug: productSlug,
    label: published.title,
    contentType: "collector_card",
    contentId: published.id,
    priceCents: published.priceInCents ?? null,
    giftingEnabled: published.giftingEnabled,
    active: published.active,
    grants: [{ type: "membership", tier: "collector" }]
  });

  if (!product.ok) {
    return product;
  }

  await markSyncDirty("catalog", { collectorCardId: published.id, reason: "collector_card.published" });
  await markSyncDirty(`collector_card:${published.id}`, { collectorCardId: published.id, reason: "collector_card.published" });

  return { ok: true as const, card: published, productSlug };
}
