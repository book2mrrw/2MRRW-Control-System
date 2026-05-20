"use client";

import { Plus, RefreshCw, Rocket, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { vaultCategories } from "@/lib/commerce/vaultCategories";
import { MediaUploadPanel } from "@/components/control/MediaUploadPanel";
import { audioQualityBadgeLabel } from "@/lib/media/audioQualityBadge";
import { formatWhen } from "@/lib/formatWhen";

type VaultItem = {
  id: string;
  slug: string;
  category: string;
  title: string;
  description: string;
  accessTier: "public" | "inner_circle" | "vault_pass";
  mediaType: string;
  coverUrl?: string | null;
  shelfUrl?: string | null;
  contentUrl?: string | null;
  priceInCents?: number | null;
  giftingEnabled: boolean;
  visibility: string;
  sortOrder: number;
  isDropItem?: boolean;
  dropType?: string | null;
  expiresAt?: string | null;
  glowEffect?: boolean;
  metadata?: Record<string, unknown>;
  updatedAt: string;
};

type Draft = {
  category: string;
  title: string;
  slug: string;
  description: string;
  coverUrl: string;
  shelfUrl: string;
  contentUrl: string;
  accessTier: VaultItem["accessTier"];
  mediaType: string;
  priceInCents: string;
  giftingEnabled: boolean;
  sortOrder: string;
  isDropItem: boolean;
  dropType: string;
  expiresAt: string;
  glowEffect: boolean;
};

const emptyDraft = (category: string): Draft => ({
  category,
  title: "",
  slug: "",
  description: "",
  coverUrl: "",
  shelfUrl: "",
  contentUrl: "",
  accessTier: "inner_circle",
  mediaType: "text",
  priceInCents: "",
  giftingEnabled: false,
  sortOrder: "100",
  isDropItem: false,
  dropType: "surprise",
  expiresAt: "",
  glowEffect: false
});

function parseItems(payload: unknown): VaultItem[] {
  return (payload as { data?: { items?: VaultItem[] } })?.data?.items ?? [];
}

export function VaultControlPanel() {
  const [activeCategory, setActiveCategory] = useState<string>(vaultCategories[0]);
  const [showDrops, setShowDrops] = useState(false);
  const [items, setItems] = useState<VaultItem[]>([]);
  const [draft, setDraft] = useState(emptyDraft(vaultCategories[0]));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const categoryItems = useMemo(
    () => items.filter((item) => item.category === activeCategory && !item.isDropItem),
    [items, activeCategory]
  );

  const dropItems = useMemo(() => items.filter((item) => item.isDropItem), [items]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/vault", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error((payload as { error?: string }).error ?? "Failed to load vault items");
      setItems(parseItems(payload));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectItem = (item: VaultItem) => {
    setSelectedId(item.id);
    setActiveCategory(item.category);
    setDraft({
      category: item.category,
      title: item.title,
      slug: item.slug,
      description: item.description,
      coverUrl: item.coverUrl ?? "",
      shelfUrl: item.shelfUrl ?? item.coverUrl ?? "",
      contentUrl: item.contentUrl ?? "",
      accessTier: item.accessTier,
      mediaType: item.mediaType,
      priceInCents: item.priceInCents != null ? String(item.priceInCents) : "",
      giftingEnabled: item.giftingEnabled,
      sortOrder: String(item.sortOrder),
      isDropItem: Boolean(item.isDropItem),
      dropType: item.dropType || "surprise",
      expiresAt: item.expiresAt ? item.expiresAt.slice(0, 16) : "",
      glowEffect: Boolean(item.glowEffect)
    });
  };

  const saveItem = async (event: FormEvent) => {
    event.preventDefault();
    setStatus(null);
    const body = {
      category: draft.category,
      title: draft.title.trim(),
      slug: draft.slug.trim() || undefined,
      description: draft.description.trim(),
      coverUrl: draft.coverUrl.trim() || draft.shelfUrl.trim() || null,
      shelfUrl: draft.shelfUrl.trim() || null,
      contentUrl: draft.contentUrl.trim() || null,
      accessTier: draft.accessTier,
      mediaType: draft.mediaType,
      priceInCents: draft.priceInCents ? Number.parseInt(draft.priceInCents, 10) : null,
      giftingEnabled: draft.giftingEnabled,
      sortOrder: Number.parseInt(draft.sortOrder, 10) || 100,
      isDropItem: draft.isDropItem,
      dropType: draft.isDropItem ? draft.dropType : null,
      expiresAt: draft.isDropItem && draft.expiresAt ? new Date(draft.expiresAt).toISOString() : null,
      glowEffect: draft.glowEffect
    };

    const response = await fetch(selectedId ? `/api/admin/vault/${selectedId}` : "/api/admin/vault", {
      method: selectedId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await response.json();
    if (!response.ok) {
      setStatus((payload as { error?: string }).error ?? "Save failed");
      return;
    }
    setStatus("Vault item saved.");
    await refresh();
    const saved = (payload as { data?: VaultItem }).data;
    if (saved?.id) selectItem(saved);
  };

  const publishItem = async () => {
    if (!selectedId) return;
    const response = await fetch(`/api/admin/vault/${selectedId}/publish`, { method: "POST" });
    const payload = await response.json();
    if (!response.ok) {
      setStatus((payload as { error?: string }).error ?? "Publish failed");
      return;
    }
    setStatus("Vault item published and sync marked dirty.");
    await refresh();
  };

  return (
    <div className="media-control-room">
      <header className="media-control-room-header">
        <div>
          <h1>Vault</h1>
          <p>Eight archive categories for the premium Vault room — separate from Collector&apos;s Cards and shop exclusives.</p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw size={13} /> Refresh
        </button>
      </header>

      <nav className="media-sync-sticky-tabs" aria-label="Vault categories">
        {vaultCategories.map((category) => (
          <button
            key={category}
            type="button"
            className={`media-sync-sticky-tab${activeCategory === category ? " active" : ""}`}
            onClick={() => {
              setActiveCategory(category);
              setSelectedId(null);
              setDraft(emptyDraft(category));
            }}
          >
            {category}
          </button>
        ))}
      </nav>

      <div className="commerce-studio-grid" style={{ marginTop: 20 }}>
        <section className="panel media-sync-section-panel">
          <div className="media-sync-section-head">
            <h2>{activeCategory}</h2>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setSelectedId(null);
                setDraft(emptyDraft(activeCategory));
              }}
            >
              <Plus size={13} /> New item
            </button>
          </div>
          <div className="media-sync-recent-list">
            {categoryItems.length ? (
              categoryItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`media-sync-recent-row${selectedId === item.id ? " active" : ""}`}
                  onClick={() => selectItem(item)}
                >
                  <div>
                    <strong>{item.title}</strong>
                    <span>
                      {item.visibility} · {item.accessTier}
                      {item.priceInCents != null ? ` · $${(item.priceInCents / 100).toFixed(2)}` : " · included"}
                    </span>
                  </div>
                  <span className="release-meta">{formatWhen(item.updatedAt)}</span>
                </button>
              ))
            ) : (
              <p className="input-hint">No items in {activeCategory} yet.</p>
            )}
          </div>
        </section>

        <section className="panel media-sync-section-panel">
          <h2>{selectedId ? "Edit vault item" : `New — ${activeCategory}`}</h2>
          <form className="media-sync-hero-form" onSubmit={(event) => void saveItem(event)}>
            <label className="input-group">
              <span className="input-label">Title</span>
              <input className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required />
            </label>
            <label className="input-group">
              <span className="input-label">Slug</span>
              <input className="input" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />
            </label>
            <label className="input-group">
              <span className="input-label">Description</span>
              <textarea className="input" rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </label>
            <label className="input-group">
              <span className="input-label">Shelf asset URL (jpg/png/mp4/mov/gif)</span>
              <input className="input" value={draft.shelfUrl} onChange={(e) => setDraft({ ...draft, shelfUrl: e.target.value, coverUrl: e.target.value })} />
            </label>
            <label className="input-group">
              <span className="input-label">Content payload URL (audio/video/text/promo)</span>
              <input className="input" value={draft.contentUrl} onChange={(e) => setDraft({ ...draft, contentUrl: e.target.value })} />
            </label>
            {selectedId && (() => {
              const item = items.find((row) => row.id === selectedId);
              const badge = item?.metadata?.audioQualityBadge as string | undefined;
              const label = badge ? audioQualityBadgeLabel(badge as "premium" | "standard" | "mp3") : null;
              return label ? <p className="input-hint">Audio quality: {label}</p> : null;
            })()}
            <label className="input-group">
              <span className="input-label">Access tier</span>
              <select className="input" value={draft.accessTier} onChange={(e) => setDraft({ ...draft, accessTier: e.target.value as Draft["accessTier"] })}>
                <option value="public">public</option>
                <option value="inner_circle">inner_circle</option>
                <option value="vault_pass">vault_pass</option>
              </select>
            </label>
            <label className="input-group">
              <span className="input-label">Media type</span>
              <select className="input" value={draft.mediaType} onChange={(e) => setDraft({ ...draft, mediaType: e.target.value })}>
                {["audio", "video", "image", "text", "mixed", "schedule", "archive", "commentary"].map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="input-group">
              <span className="input-label">Optional price (cents)</span>
              <input className="input" type="number" min={0} value={draft.priceInCents} onChange={(e) => setDraft({ ...draft, priceInCents: e.target.value })} />
            </label>
            <label className="input-group">
              <span className="input-label">Sort order</span>
              <input className="input" type="number" value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: e.target.value })} />
            </label>
            <label className="input-group" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <input type="checkbox" checked={draft.giftingEnabled} onChange={(e) => setDraft({ ...draft, giftingEnabled: e.target.checked })} />
              <span className="input-label" style={{ margin: 0 }}>Gifting enabled</span>
            </label>
            <div className="inline-action-row">
              <button type="submit" className="btn btn-primary btn-sm">
                <Save size={13} /> Save
              </button>
              {selectedId ? (
                <button type="button" className="btn btn-success btn-sm" onClick={() => void publishItem()}>
                  <Rocket size={13} /> Publish + sync
                </button>
              ) : null}
            </div>
            {status ? <p className="form-status">{status}</p> : null}
          </form>
          {selectedId ? (
            <div style={{ marginTop: 24 }}>
              <p className="meta-label">Vault media uploads</p>
              <MediaUploadPanel draft={{ id: selectedId, title: draft.title, tracks: [] }} mode="vault" compact />
            </div>
          ) : null}

          <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid var(--bord)" }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowDrops((value) => !value)}>
              {showDrops ? "Hide" : "Show"} surprise drops panel
            </button>
            {showDrops ? (
              <div style={{ marginTop: 16 }}>
                <p className="meta-label">Surprise drops</p>
                <div className="media-sync-recent-list">
                  {dropItems.map((item) => (
                    <button key={item.id} type="button" className="media-sync-recent-row" onClick={() => selectItem(item)}>
                      <strong>{item.title}</strong>
                      <span>{item.dropType || "surprise"} · glow {item.glowEffect ? "on" : "off"}</span>
                    </button>
                  ))}
                </div>
                <label className="input-group" style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 }}>
                  <input type="checkbox" checked={draft.isDropItem} onChange={(e) => setDraft({ ...draft, isDropItem: e.target.checked })} />
                  <span className="input-label" style={{ margin: 0 }}>Surprise drop item</span>
                </label>
                {draft.isDropItem ? (
                  <>
                    <label className="input-group">
                      <span className="input-label">Drop type</span>
                      <select className="input" value={draft.dropType} onChange={(e) => setDraft({ ...draft, dropType: e.target.value })}>
                        <option value="surprise">surprise</option>
                        <option value="promo">promo</option>
                        <option value="limited">limited</option>
                      </select>
                    </label>
                    <label className="input-group">
                      <span className="input-label">Expires at</span>
                      <input className="input" type="datetime-local" value={draft.expiresAt} onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value })} />
                    </label>
                    <label className="input-group" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <input type="checkbox" checked={draft.glowEffect} onChange={(e) => setDraft({ ...draft, glowEffect: e.target.checked })} />
                      <span className="input-label" style={{ margin: 0 }}>Glow on shelf</span>
                    </label>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
