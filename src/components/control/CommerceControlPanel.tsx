"use client";

import { RefreshCw } from "lucide-react";
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

export function CommerceControlPanel() {
  const [items, setItems] = useState<PricedItem[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/commerce/products", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error((payload as { error?: string }).error ?? "Failed to load commerce catalog");
      setItems((payload as { data?: { items?: PricedItem[] } }).data?.items ?? []);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="media-control-room">
      <header className="media-control-room-header">
        <div>
          <h1>Commerce</h1>
          <p>Unified priced catalog — releases, collector cards, and vault items backed by control-system products.</p>
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
            <span>Price</span>
            <span>Gift</span>
            <span>Status</span>
          </div>
          {items.length ? (
            items.map((item) => (
              <div key={`${item.contentType}-${item.contentId}`} className="commerce-price-row">
                <span className="meta-label">{item.contentType}</span>
                <strong>{item.label}</strong>
                <span>{item.slug}</span>
                <span>{item.priceCents != null ? `$${(item.priceCents / 100).toFixed(2)}` : "—"}</span>
                <span>{item.giftingEnabled ? "on" : "off"}</span>
                <span>
                  {item.status ?? (item.active ? "active" : "inactive")}
                  {item.category ? ` · ${item.category}` : ""}
                </span>
              </div>
            ))
          ) : (
            <p className="input-hint">No priced products yet. Publish a release, collector card, or priced vault item.</p>
          )}
        </div>
      </section>
    </div>
  );
}
