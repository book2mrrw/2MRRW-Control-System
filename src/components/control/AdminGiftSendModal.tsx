"use client";

import { Gift } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";

type AdminGiftSendModalProps = {
  itemType: "single" | "ep" | "album" | "deluxe" | "collector_card";
  itemId: string;
  itemTitle: string;
  coverUrl?: string | null;
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
        alignItems: "flex-end",
        justifyContent: "center",
        padding: 16
      }}
    >
      <div role="dialog" onClick={(event) => event.stopPropagation()} style={{ width: "100%", maxWidth: 480 }}>
        {children}
      </div>
    </div>
  );
}

function mapReleaseType(type: string): AdminGiftSendModalProps["itemType"] {
  const normalized = type.toLowerCase();
  if (normalized === "ep") return "ep";
  if (normalized === "album") return "album";
  if (normalized === "deluxe") return "deluxe";
  if (normalized === "collector_card" || normalized === "collector") return "collector_card";
  return "single";
}

export function AdminGiftSendModal({ itemType, itemId, itemTitle, coverUrl, onClose }: AdminGiftSendModalProps) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [duplicatePrompt, setDuplicatePrompt] = useState<string | null>(null);
  const [result, setResult] = useState<{ gift_link?: string; expires_at?: string } | null>(null);

  async function submit(forceDuplicate = false) {
    setBusy(true);
    setError("");
    const response = await fetch("/api/gifts/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item_type: itemType,
        item_id: itemId,
        item_title: itemTitle,
        recipient_email: email.trim(),
        recipient_phone: phone.trim() || null,
        message: message.trim() || null,
        force_duplicate: forceDuplicate
      })
    });
    const payload = (await response.json().catch(() => ({}))) as {
      data?: { gift_link?: string; expires_at?: string };
      error?: { message?: string; details?: { code?: string } };
    };
    setBusy(false);

    if (response.status === 409 && payload.error?.details?.code === "duplicate") {
      setDuplicatePrompt(payload.error?.message ?? "Duplicate gift");
      return;
    }

    if (!response.ok) {
      setError(payload.error?.message ?? "Could not send gift");
      return;
    }

    setDuplicatePrompt(null);
    setResult(payload.data ?? null);
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submit(false);
  };

  return (
    <GiftOverlay onClose={onClose}>
      <form className="card" style={{ padding: 24, width: "100%" }} onSubmit={onSubmit}>
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          {coverUrl ? (
            <img src={coverUrl} alt="" style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover" }} />
          ) : (
            <div style={{ width: 56, height: 56, borderRadius: 10, background: "var(--surf2)" }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Gift size={16} style={{ color: "var(--pri)" }} />
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Send Gift</h3>
            </div>
            <p style={{ fontSize: 13, color: "var(--tx3)", margin: 0 }}>{itemTitle}</p>
          </div>
        </div>

        <label style={{ display: "block", marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: "var(--tx3)", display: "block", marginBottom: 6 }}>Recipient email *</span>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label style={{ display: "block", marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: "var(--tx3)", display: "block", marginBottom: 6 }}>Recipient phone (optional)</span>
          <input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label style={{ display: "block", marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: "var(--tx3)", display: "block", marginBottom: 6 }}>Personal message (optional)</span>
          <textarea
            className="input"
            rows={3}
            maxLength={280}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            style={{ resize: "vertical" }}
          />
          <span style={{ fontSize: 11, color: "var(--tx3)" }}>{message.length}/280</span>
        </label>

        {duplicatePrompt ? (
          <div style={{ padding: 12, background: "var(--surf2)", borderRadius: 10, marginBottom: 12 }}>
            <p style={{ fontSize: 13, margin: "0 0 10px" }}>{duplicatePrompt}. Send again anyway?</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => void submit(true)}>
                Send Anyway
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDuplicatePrompt(null)}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {result?.gift_link ? (
          <div style={{ padding: 12, background: "var(--surf2)", borderRadius: 10, marginBottom: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 8px" }}>Gift sent to {email}</p>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => navigator.clipboard.writeText(result.gift_link || "")}
            >
              Copy gift link
            </button>
            {result.expires_at ? (
              <p style={{ fontSize: 12, color: "var(--tx3)", marginTop: 8 }}>
                Expires {new Date(result.expires_at).toLocaleDateString()}
              </p>
            ) : null}
          </div>
        ) : null}

        {error ? <p style={{ fontSize: 12, color: "var(--err)", marginBottom: 12 }}>{error}</p> : null}

        <div style={{ display: "flex", gap: 10 }}>
          <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
            {busy ? "Sending…" : "Send Gift"}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </form>
    </GiftOverlay>
  );
}

export { mapReleaseType };
