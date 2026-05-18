"use client";

import { useEffect, useState, type FormEvent } from "react";
import { controlToneStyle } from "@/design/tokens";

type AudioVisual = {
  id: string;
  title: string;
  slug: string;
  youtubeVideoId: string;
  thumbnailUrl: string;
  status: "draft" | "scheduled" | "published" | "archived";
  releaseId?: string | null;
  trackId?: string | null;
};

export function AudioVisualsPanel() {
  const [visuals, setVisuals] = useState<AudioVisual[]>([]);
  const [status, setStatus] = useState("Paste a YouTube URL or embed link to stage a backend-managed visual.");
  const [form, setForm] = useState({
    title: "",
    youtubeUrl: "",
    releaseId: "",
    trackId: "",
    status: "draft"
  });

  async function refresh() {
    const response = await fetch("/api/admin/audio-visuals", {
      headers: { "x-admin": "true" },
      cache: "no-store"
    });
    const payload = await response.json().catch(() => null);
    if (response.ok && Array.isArray(payload?.data)) {
      setVisuals(payload.data);
    }
  }

  useEffect(() => {
    refresh().catch(() => setStatus("Audio Visuals API unavailable."));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Creating Audio Visual record...");
    const response = await fetch("/api/admin/audio-visuals", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin": "true" },
      body: JSON.stringify({
        title: form.title,
        youtubeUrl: form.youtubeUrl,
        releaseId: form.releaseId || null,
        trackId: form.trackId || null,
        status: form.status,
        metadata: { source: "control-system-panel" }
      })
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setStatus(payload?.error?.message || "Audio Visual record rejected.");
      return;
    }

    setStatus(`Created: ${payload?.data?.title || form.title}`);
    setForm({ title: "", youtubeUrl: "", releaseId: "", trackId: "", status: "draft" });
    await refresh();
  }

  async function publish(id: string) {
    setStatus("Publishing Audio Visual...");
    const response = await fetch(`/api/admin/audio-visuals/${encodeURIComponent(id)}/publish`, {
      method: "POST",
      headers: { "x-admin": "true" }
    });
    const payload = await response.json().catch(() => null);
    setStatus(response.ok ? `Published: ${payload?.data?.title || "Audio Visual"}` : payload?.error?.message || "Publish failed.");
    await refresh();
  }

  return (
    <section className="release-command-card audio-visuals-card" id="audio-visuals" style={controlToneStyle("signal")}>
      <p className="meta-label">Audio Visuals</p>
      <h3>YouTube embed control lane</h3>
      <p>
        Audio Visuals stay as YouTube embeds. The backend stores normalized video IDs, embed URLs, thumbnails,
        optional release/track links, and publishing state for the public frontend to read.
      </p>

      <form className="release-form audio-visuals-form" onSubmit={submit}>
        <label>
          Title
          <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Official visual title" required />
        </label>
        <label>
          YouTube URL / embed link
          <input value={form.youtubeUrl} onChange={(event) => setForm((current) => ({ ...current, youtubeUrl: event.target.value }))} placeholder="https://www.youtube.com/watch?v=..." required />
        </label>
        <label>
          Release ID optional
          <input value={form.releaseId} onChange={(event) => setForm((current) => ({ ...current, releaseId: event.target.value }))} placeholder="rel_..." />
        </label>
        <label>
          Track ID optional
          <input value={form.trackId} onChange={(event) => setForm((current) => ({ ...current, trackId: event.target.value }))} placeholder="trk_..." />
        </label>
        <label>
          Status
          <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <button className="release-upload-button" type="submit">Create Audio Visual</button>
      </form>

      <div className="audio-visuals-list" aria-label="Audio Visual records">
        {visuals.length === 0 ? (
          <p>No backend visuals yet. Public frontend fallback visuals remain active.</p>
        ) : (
          visuals.slice(0, 6).map((visual) => (
            <article key={visual.id}>
              <img src={visual.thumbnailUrl} alt="" />
              <div>
                <strong>{visual.title}</strong>
                <span>{visual.status.toUpperCase()} / {visual.youtubeVideoId}</span>
              </div>
              {visual.status !== "published" ? <button type="button" onClick={() => publish(visual.id)}>Publish</button> : null}
            </article>
          ))
        )}
      </div>
      <p className="release-upload-status">{status}</p>
    </section>
  );
}
