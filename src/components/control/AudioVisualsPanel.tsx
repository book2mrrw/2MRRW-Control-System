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

function youtubeEmbedUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const iframeMatch = /src=["']([^"']+)["']/.exec(trimmed);
  const source = iframeMatch?.[1] ?? trimmed;
  try {
    const url = new URL(source);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return `https://www.youtube.com/embed/${url.pathname.slice(1)}`;
    if (host.endsWith("youtube.com")) {
      if (url.pathname.startsWith("/embed/")) return source;
      if (url.pathname.startsWith("/shorts/")) return `https://www.youtube.com/embed/${url.pathname.split("/")[2] ?? ""}`;
      const id = url.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }
  } catch {
    return "";
  }
  return "";
}

export function AudioVisualsPanel() {
  const [visuals, setVisuals] = useState<AudioVisual[]>([]);
  const [status, setStatus] = useState("Paste a YouTube URL or embed link to prepare a visual.");
  const [form, setForm] = useState({
    title: "",
    youtubeUrl: "",
    releaseId: "",
    trackId: "",
    status: "draft"
  });
  const embedPreviewUrl = youtubeEmbedUrl(form.youtubeUrl);

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
    refresh().catch(() => setStatus("Audio Visuals are not available yet."));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Creating Audio Visual...");
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
      setStatus(payload?.error?.message || "Audio Visual could not be created.");
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
      <h3>YouTube embeds</h3>
      <p>
        Audio Visuals stay as YouTube embeds. Published visuals can sync to the frontend after they are saved.
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
          Release link
          <input value={form.releaseId} onChange={(event) => setForm((current) => ({ ...current, releaseId: event.target.value }))} placeholder="Optional release reference" />
        </label>
        <label>
          Track link
          <input value={form.trackId} onChange={(event) => setForm((current) => ({ ...current, trackId: event.target.value }))} placeholder="Optional track reference" />
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
      {embedPreviewUrl ? (
        <div className="audio-visual-embed-preview">
          <iframe title="Audio Visual embed preview" src={embedPreviewUrl} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        </div>
      ) : null}

      <div className="audio-visuals-list" aria-label="Audio Visual records">
        {visuals.length === 0 ? (
          <p>No visuals yet. Create your first Audio Visual when you are ready.</p>
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
