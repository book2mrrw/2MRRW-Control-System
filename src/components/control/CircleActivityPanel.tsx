"use client";

import { useState } from "react";

type CircleEventType = "active" | "replied" | "live" | "highlighted_comment" | "reacted";

const circleActions: Array<{ type: CircleEventType; label: string; detail: string }> = [
  { type: "active", label: "2MRRW active", detail: "Share presence with Circle." },
  { type: "replied", label: "2MRRW replied", detail: "Mark an artist reply on a post/comment." },
  { type: "live", label: "2MRRW is live", detail: "Prepare a live community moment." },
  { type: "highlighted_comment", label: "2MRRW highlighted a comment", detail: "Promote a community comment event." },
  { type: "reacted", label: "2MRRW reacted", detail: "Save an artist reaction moment." }
];

export function CircleActivityPanel() {
  const [status, setStatus] = useState("Circle moments can sync to the frontend after they are created.");

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
      <p className="meta-label">Circle</p>
      <h3>Community moments</h3>
      <p>
        Create artist activity that can appear across notifications, inbox, and public community surfaces.
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
