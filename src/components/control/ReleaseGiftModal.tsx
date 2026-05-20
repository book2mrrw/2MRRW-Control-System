"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Gift } from "lucide-react";

type ReleaseGiftModalProps = {
  releaseId: string;
  releaseTitle: string;
  giftingEnabled?: boolean;
  onClose: () => void;
};

function GiftOverlay({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        zIndex: 9000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16
      }}
    >
      <div role="dialog" onClick={(event) => event.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function ReleaseGiftModal({ releaseId, releaseTitle, giftingEnabled, onClose }: ReleaseGiftModalProps) {
  const [title, setTitle] = useState(`Gift — ${releaseTitle}`);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ url?: string } | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch("/api/admin/gifts", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin": "true" },
      body: JSON.stringify({ releaseId, title })
    });
    const payload = (await response.json().catch(() => ({}))) as {
      data?: { url?: string };
      error?: { message?: string };
    };
    setBusy(false);
    if (!response.ok) {
      setError(payload.error?.message ?? "Could not create gift link");
      return;
    }
    setResult(payload.data ?? null);
  }

  if (!giftingEnabled) {
    return (
      <GiftOverlay onClose={onClose}>
        <div className="card" style={{ padding: 24, maxWidth: 420, width: "100%" }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>Send as Gift</h3>
          <p style={{ fontSize: 13, color: "var(--tx3)", lineHeight: 1.6 }}>
            Enable purchase-to-gift on this release and set a storefront price before creating admin gift links.
          </p>
          <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 16 }} onClick={onClose}>
            Close
          </button>
        </div>
      </GiftOverlay>
    );
  }

  return (
    <GiftOverlay onClose={onClose}>
      <form className="card" style={{ padding: 24, maxWidth: 440, width: "100%" }} onSubmit={(event) => void submit(event)}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <Gift size={18} style={{ color: "var(--pri)" }} />
          <h3 style={{ fontSize: 16, fontWeight: 800 }}>Send as Gift</h3>
        </div>
        <label style={{ display: "block", marginBottom: 14 }}>
          <span style={{ fontSize: 12, color: "var(--tx3)", display: "block", marginBottom: 6 }}>Gift title</span>
          <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} required />
        </label>
        {result?.url ? (
          <div style={{ padding: 12, background: "var(--surf2)", borderRadius: 10, marginBottom: 14 }}>
            <p style={{ fontSize: 12, color: "var(--tx3)", marginBottom: 6 }}>Share this link with the recipient:</p>
            <a href={result.url} style={{ fontSize: 13, color: "var(--pri)", wordBreak: "break-all" }} target="_blank" rel="noreferrer">
              {result.url}
            </a>
          </div>
        ) : null}
        {error ? <p style={{ fontSize: 12, color: "var(--err)", marginBottom: 12 }}>{error}</p> : null}
        <div style={{ display: "flex", gap: 10 }}>
          <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
            {busy ? "Creating…" : "Create gift link"}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </form>
    </GiftOverlay>
  );
}
