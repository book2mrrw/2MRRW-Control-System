"use client";

import { useState } from "react";

type CircleEventType = "active" | "replied" | "live" | "highlighted_comment" | "reacted";

const circleActions: Array<{ type: CircleEventType; label: string; detail: string }> = [
  { type: "active", label: "2MRRW active", detail: "Broadcast presence into Circle activity." },
  { type: "replied", label: "2MRRW replied", detail: "Mark an artist reply on a post/comment." },
  { type: "live", label: "2MRRW is live", detail: "Prepare live community/realtime surfaces." },
  { type: "highlighted_comment", label: "2MRRW highlighted a comment", detail: "Promote a community comment event." },
  { type: "reacted", label: "2MRRW reacted", detail: "Record an artist reaction event." }
];

export function CircleActivityPanel() {
  const [status, setStatus] = useState("Circle events are server-triggered and ready for public read adapters.");

  async function trigger(type: CircleEventType) {
    setStatus("Creating Circle event...");
    const response = await fetch("/api/admin/circle/events", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin": "true" },
      body: JSON.stringify({
        type,
        audience: "public",
        payload: { source: "control-system-panel" }
      })
    });
    const payload = await response.json().catch(() => null);
    setStatus(response.ok ? `Created: ${payload?.data?.label || type}` : payload?.error?.message || "Circle event rejected.");
  }

  return (
    <section className="release-command-card circle-activity-card" id="circle-activity">
      <p className="meta-label">Circle Community Control</p>
      <h3>2MRRW activity triggers</h3>
      <p>
        Backend-owned Circle events centralize artist activity before they fan out to notifications,
        realtime state, inbox, and public community surfaces.
      </p>
      <div className="circle-action-grid">
        {circleActions.map((action) => (
          <button key={action.type} type="button" onClick={() => trigger(action.type)}>
            <strong>{action.label}</strong>
            <span>{action.detail}</span>
          </button>
        ))}
      </div>
      <p className="release-upload-status">{status}</p>
    </section>
  );
}
