"use client";

import { RefreshCw, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type PricedItem = {
  contentType: "release" | "collector_card" | "vault_item" | "vault_access";
  contentId: string;
  slug: string;
  label: string;
  priceCents: number | null;
  giftingEnabled: boolean;
  active: boolean;
  status?: string;
  category?: string;
};

type DraftRow = {
  price: string;
  giftingEnabled: boolean;
  active: boolean;
};

export function CommerceControlPanel() {
  const [items, setItems] = useState<PricedItem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftRow>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const rowKey = (item: PricedItem) => `${item.contentType}:${item.contentId}`;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/commerce/products", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error((payload as { error?: string }).error ?? "Failed to load commerce catalog");
      const nextItems = (payload as { data?: { items?: PricedItem[] } }).data?.items ?? [];
      setItems(nextItems);
      setDrafts(
        Object.fromEntries(
          nextItems.map((item) => [
            rowKey(item),
            {
              price: item.priceCents != null ? String(item.priceCents / 100) : "",
              giftingEnabled: item.giftingEnabled,
              active: item.active
            }
          ])
        )
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveRow = async (item: PricedItem) => {
    const key = rowKey(item);
    const draft = drafts[key];
    if (!draft) return;
    setSavingKey(key);
    setStatus(null);
    const priceCents = draft.price.trim() ? Math.round(Number.parseFloat(draft.price) * 100) : null;
    const response = await fetch("/api/admin/commerce/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contentType: item.contentType,
        contentId: item.contentId,
        priceCents: Number.isFinite(priceCents) ? priceCents : null,
        giftingEnabled: draft.giftingEnabled,
        active: draft.active
      })
    });
    const payload = await response.json();
    setSavingKey(null);
    if (!response.ok) {
      setStatus((payload as { error?: string }).error ?? "Save failed");
      return;
    }
    setStatus(`Saved ${item.label}`);
    await refresh();
  };

  return (
    <div className="media-control-room">
      <header className="media-control-room-header">
        <div>
          <h1>Commerce</h1>
          <p>Unified priced catalog — inline edit pushes to products and marks storefront sync dirty.</p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw size={13} /> Refresh
        </button>
      </header>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="meta-label">Priced items</p>
            <h2>{items.length} active catalog rows</h2>
          </div>
        </div>
        {status ? <p className="form-status">{status}</p> : null}
        <div className="commerce-price-table">
          <div className="commerce-price-row commerce-price-head">
            <span>Type</span>
            <span>Label</span>
            <span>Slug</span>
            <span>Price ($)</span>
            <span>Gift</span>
            <span>Active</span>
            <span />
          </div>
          {items.length ? (
            items.map((item) => {
              const key = rowKey(item);
              const draft = drafts[key];
              return (
                <div key={key} className="commerce-price-row">
                  <span className="meta-label">{item.contentType}</span>
                  <strong>{item.label}</strong>
                  <span>{item.slug}</span>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    step={0.01}
                    value={draft?.price ?? ""}
                    onChange={(e) =>
                      setDrafts((current) => ({
                        ...current,
                        [key]: { ...draft, price: e.target.value, giftingEnabled: draft?.giftingEnabled ?? false, active: draft?.active ?? true }
                      }))
                    }
                  />
                  <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={draft?.giftingEnabled ?? false}
                      onChange={(e) =>
                        setDrafts((current) => ({
                          ...current,
                          [key]: { ...draft, giftingEnabled: e.target.checked, price: draft?.price ?? "", active: draft?.active ?? true }
                        }))
                      }
                    />
                    gift
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={draft?.active ?? true}
                      onChange={(e) =>
                        setDrafts((current) => ({
                          ...current,
                          [key]: { ...draft, active: e.target.checked, price: draft?.price ?? "", giftingEnabled: draft?.giftingEnabled ?? false }
                        }))
                      }
                    />
                    on
                  </label>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={savingKey === key}
                    onClick={() => void saveRow(item)}
                  >
                    <Save size={12} /> {savingKey === key ? "…" : "Save"}
                  </button>
                </div>
              );
            })
          ) : (
            <p className="input-hint">No priced products yet. Publish a release, collector card, or priced vault item.</p>
          )}
        </div>
      </section>
    </div>
  );
}
