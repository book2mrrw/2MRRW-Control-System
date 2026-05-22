"use client";

import { Gift, Plus, RefreshCw, Rocket, Save } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AdminGiftSendModal } from "@/components/control/AdminGiftSendModal";
import { MediaUploadPanel } from "@/components/control/MediaUploadPanel";
import { formatWhen } from "@/lib/formatWhen";

type CollectorCard = {
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
  visibility: "draft" | "published" | "archived";
  updatedAt: string;
};

type Draft = {
  title: string;
  slug: string;
  description: string;
  coverUrl: string;
  priceInCents: string;
  editionSize: string;
  editionLabel: string;
  giftingEnabled: boolean;
  active: boolean;
};

const emptyDraft = (): Draft => ({
  title: "",
  slug: "",
  description: "",
  coverUrl: "",
  priceInCents: "",
  editionSize: "",
  editionLabel: "",
  giftingEnabled: false,
  active: true
});

function parseCards(payload: unknown): CollectorCard[] {
  const data = (payload as { data?: { cards?: CollectorCard[] } })?.data;
  return data?.cards ?? [];
}

export function CollectorsCardsPanel() {
  const [cards, setCards] = useState<CollectorCard[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [giftCard, setGiftCard] = useState<CollectorCard | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/collector-cards", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error((payload as { error?: string }).error ?? "Failed to load collector cards");
      setCards(parseCards(payload));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectCard = (card: CollectorCard) => {
    setSelectedId(card.id);
    setDraft({
      title: card.title,
      slug: card.slug,
      description: card.description,
      coverUrl: card.coverUrl ?? "",
      priceInCents: card.priceInCents != null ? String(card.priceInCents) : "",
      editionSize: card.editionSize != null ? String(card.editionSize) : "",
      editionLabel: card.editionLabel ?? "",
      giftingEnabled: card.giftingEnabled,
      active: card.active
    });
  };

  const saveCard = async (event: FormEvent) => {
    event.preventDefault();
    setStatus(null);
    const body = {
      title: draft.title.trim(),
      slug: draft.slug.trim() || undefined,
      description: draft.description.trim(),
      coverUrl: draft.coverUrl.trim() || null,
      priceInCents: Number.parseInt(draft.priceInCents, 10),
      editionSize: draft.editionSize ? Number.parseInt(draft.editionSize, 10) : null,
      editionLabel: draft.editionLabel.trim() || null,
      giftingEnabled: draft.giftingEnabled,
      active: draft.active
    };

    const response = await fetch(
      selectedId ? `/api/admin/collector-cards/${selectedId}` : "/api/admin/collector-cards",
      {
        method: selectedId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      }
    );
    const payload = await response.json();
    if (!response.ok) {
      setStatus((payload as { error?: string }).error ?? "Save failed");
      return;
    }
    setStatus("Collector card saved.");
    await refresh();
    const saved = (payload as { data?: CollectorCard }).data;
    if (saved?.id) selectCard(saved);
  };

  const publishCard = async () => {
    if (!selectedId) return;
    setStatus(null);
    const response = await fetch(`/api/admin/collector-cards/${selectedId}/publish`, { method: "POST" });
    const payload = await response.json();
    if (!response.ok) {
      setStatus((payload as { error?: string }).error ?? "Publish failed");
      return;
    }
    setStatus("Published — product upserted and catalog sync marked dirty.");
    await refresh();
  };

  return (
    <div className="media-control-room">
      <header className="media-control-room-header">
        <div>
          <h1>Collector&apos;s Cards</h1>
          <p>Physical ownership drops — priced separately from Vault archive content. Storefront collector section stays unchanged visually.</p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw size={13} /> Refresh
        </button>
      </header>

      <div className="commerce-studio-grid">
        <section className="panel media-sync-section-panel">
          <div className="media-sync-section-head">
            <h2>Catalog</h2>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setSelectedId(null);
                setDraft(emptyDraft());
              }}
            >
              <Plus size={13} /> New card
            </button>
          </div>
          <div className="media-sync-recent-list">
            {cards.length ? (
              cards.map((card) => (
                <div key={card.id} className={`media-sync-recent-row${selectedId === card.id ? " active" : ""}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button type="button" style={{ flex: 1, background: "none", border: "none", color: "inherit", textAlign: "left", cursor: "pointer", padding: 0 }} onClick={() => selectCard(card)}>
                    <div>
                      <strong>{card.title}</strong>
                      <span>
                        {card.visibility} · ${((card.priceInCents ?? 0) / 100).toFixed(2)}
                        {card.editionLabel ? ` · ${card.editionLabel}` : ""}
                      </span>
                    </div>
                    <span className="release-meta">{formatWhen(card.updatedAt)}</span>
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setGiftCard(card)}>
                    <Gift size={12} /> Gift
                  </button>
                </div>
              ))
            ) : (
              <p className="input-hint">No collector cards yet. Create the first drop.</p>
            )}
          </div>
        </section>

        <section className="panel media-sync-section-panel">
          <h2>{selectedId ? "Edit card" : "New collector card"}</h2>
          <form className="media-sync-hero-form" onSubmit={(event) => void saveCard(event)}>
            <label className="input-group">
              <span className="input-label">Title</span>
              <input className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required />
            </label>
            <label className="input-group">
              <span className="input-label">Slug</span>
              <input className="input" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} placeholder="exc-card-tbh" />
            </label>
            <label className="input-group">
              <span className="input-label">Description</span>
              <textarea className="input" rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </label>
            <label className="input-group">
              <span className="input-label">Cover URL</span>
              <input className="input" value={draft.coverUrl} onChange={(e) => setDraft({ ...draft, coverUrl: e.target.value })} placeholder="/images/albums/tbh.jpg" />
            </label>
            <label className="input-group">
              <span className="input-label">Price (cents)</span>
              <input className="input" type="number" min={0} value={draft.priceInCents} onChange={(e) => setDraft({ ...draft, priceInCents: e.target.value })} required />
            </label>
            <label className="input-group">
              <span className="input-label">Edition size</span>
              <input className="input" type="number" min={1} value={draft.editionSize} onChange={(e) => setDraft({ ...draft, editionSize: e.target.value })} />
            </label>
            <label className="input-group">
              <span className="input-label">Edition label</span>
              <input className="input" value={draft.editionLabel} onChange={(e) => setDraft({ ...draft, editionLabel: e.target.value })} placeholder="First Edition · #/100" />
            </label>
            <label className="input-group" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <input type="checkbox" checked={draft.giftingEnabled} onChange={(e) => setDraft({ ...draft, giftingEnabled: e.target.checked })} />
              <span className="input-label" style={{ margin: 0 }}>Purchase-to-gift enabled</span>
            </label>
            <label className="input-group" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
              <span className="input-label" style={{ margin: 0 }}>Active in catalog</span>
            </label>
            <div className="inline-action-row">
              <button type="submit" className="btn btn-primary btn-sm">
                <Save size={13} /> Save
              </button>
              {selectedId ? (
                <button type="button" className="btn btn-success btn-sm" onClick={() => void publishCard()}>
                  <Rocket size={13} /> Publish + sync
                </button>
              ) : null}
            </div>
            {status ? <p className="form-status">{status}</p> : null}
          </form>

          {selectedId ? (
            <div style={{ marginTop: 24 }}>
              <p className="meta-label">Card media</p>
              <MediaUploadPanel draft={{ id: selectedId, title: draft.title, tracks: [] }} mode="artwork" compact />
            </div>
          ) : null}
        </section>
      </div>
      {giftCard ? (
        <AdminGiftSendModal
          itemType="collector_card"
          itemId={giftCard.id}
          itemTitle={giftCard.title}
          coverUrl={giftCard.coverUrl}
          onClose={() => setGiftCard(null)}
        />
      ) : null}
    </div>
  );
}
