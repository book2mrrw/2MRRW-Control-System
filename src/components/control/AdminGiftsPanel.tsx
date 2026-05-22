"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type GiftRow = {
  id: string;
  created_at: string;
  claimed_at?: string | null;
  recipient_email: string;
  item_title?: string | null;
  item_type?: string | null;
  status: string;
  expires_at: string;
  gift_link_token: string;
};

type ClaimFeedRow = {
  id: string;
  created_at: string;
  metadata?: { message?: string };
};

const FILTERS = ["All", "Pending", "Claimed", "Expired", "Revoked"] as const;

function statusTone(status: string) {
  if (status === "claimed") return { bg: "rgba(34,197,94,0.15)", color: "#4ade80" };
  if (status === "pending") return { bg: "rgba(245,158,11,0.15)", color: "#fbbf24" };
  if (status === "revoked") return { bg: "rgba(239,68,68,0.15)", color: "#f87171" };
  return { bg: "rgba(148,163,184,0.12)", color: "#94a3b8" };
}

function daysRemaining(expiresAt: string) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export function AdminGiftsPanel() {
  const [gifts, setGifts] = useState<GiftRow[]>([]);
  const [claimFeed, setClaimFeed] = useState<ClaimFeedRow[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revokeTarget, setRevokeTarget] = useState<GiftRow | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/gifts/list", { cache: "no-store" });
      const payload = (await response.json()) as {
        data?: { gifts?: GiftRow[]; claimFeed?: ClaimFeedRow[] };
        error?: { message?: string };
      };
      if (!response.ok) throw new Error(payload.error?.message ?? "Failed to load gifts");
      setGifts(payload.data?.gifts ?? []);
      setClaimFeed(payload.data?.claimFeed ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    if (filter === "All") return gifts;
    return gifts.filter((gift) => gift.status === filter.toLowerCase());
  }, [gifts, filter]);

  const unseenClaims = claimFeed.length;

  async function confirmRevoke() {
    if (!revokeTarget) return;
    setBusy(true);
    try {
      const response = await fetch("/api/gifts/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gift_id: revokeTarget.id })
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "Revoke failed");
      setRevokeTarget(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revoke failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="content">
      <div className="mb-24">
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.5px", marginBottom: 4 }}>Gifts</h1>
        <p style={{ fontSize: 13, color: "var(--tx3)" }}>
          Admin gifting · send, track claims, revoke access
          {unseenClaims ? ` · ${unseenClaims} recent claims` : ""}
        </p>
      </div>

      {claimFeed.length ? (
        <div className="card mb-20" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, color: "var(--tx3)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Live claim feed</div>
          {claimFeed.slice(0, 6).map((row) => (
            <div key={row.id} style={{ fontSize: 13, color: "var(--tx2)", padding: "6px 0", borderBottom: "1px solid var(--bord)" }}>
              {row.metadata?.message || "Gift claimed"} · {new Date(row.created_at).toLocaleString()}
            </div>
          ))}
        </div>
      ) : null}

      <div className="tab-bar mb-20" style={{ width: "fit-content" }}>
        {FILTERS.map((tab) => (
          <button key={tab} className={`tab${filter === tab ? " active" : ""}`} type="button" onClick={() => setFilter(tab)}>
            {tab}
          </button>
        ))}
      </div>

      {loading ? <p style={{ fontSize: 13, color: "var(--tx3)" }}>Loading gifts…</p> : null}
      {error ? <p style={{ fontSize: 13, color: "var(--err)" }}>{error}</p> : null}

      <div className="card" style={{ padding: 8 }}>
        {filtered.length === 0 && !loading ? (
          <div className="empty-state">
            <div className="empty-title">No gifts in this view</div>
          </div>
        ) : (
          filtered.map((gift) => {
            const tone = statusTone(gift.status);
            return (
              <div key={gift.id} className="release-row" style={{ alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="release-title">{gift.item_title || "Untitled gift"}</div>
                  <div className="release-meta">
                    {gift.item_type || "item"} · {gift.recipient_email}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--tx3)", marginTop: 4 }}>
                    Sent {new Date(gift.created_at).toLocaleDateString()}
                    {gift.status === "pending" ? ` · ${daysRemaining(gift.expires_at)} days left` : ""}
                    {gift.status === "claimed" && gift.claimed_at ? ` · Claimed ${new Date(gift.claimed_at).toLocaleDateString()}` : ""}
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: tone.bg, color: tone.color, textTransform: "capitalize" }}>
                  {gift.status}
                </span>
                {(gift.status === "pending" || gift.status === "claimed") && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRevokeTarget(gift)}>
                    Revoke
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {revokeTarget ? (
        <div
          role="presentation"
          onClick={() => setRevokeTarget(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 9000, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 16 }}
        >
          <div role="dialog" className="card" style={{ padding: 20, width: "100%", maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>Are you sure?</h3>
            <p style={{ fontSize: 13, color: "var(--tx3)", lineHeight: 1.6, marginBottom: 16 }}>
              {revokeTarget.status === "pending"
                ? "This gift has not been claimed yet."
                : "This person will immediately lose access to this item."}
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => void confirmRevoke()}>
                {busy ? "Revoking…" : "Confirm Revoke"}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRevokeTarget(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
