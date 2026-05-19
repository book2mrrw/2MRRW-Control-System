"use client";

import { ExternalLink, Eye, RefreshCw, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { MediaUploadPanel } from "@/components/control/MediaUploadPanel";
import { controlToneStyle } from "@/design/tokens";
import { detectMediaKind } from "@/lib/media/mediaVisual";

type AudioVisual = {
  id: string;
  title: string;
  slug: string;
  youtubeVideoId: string;
  youtubeUrl: string;
  embedUrl: string;
  thumbnailUrl: string;
  status: "draft" | "scheduled" | "published" | "archived";
  releaseId?: string | null;
  trackId?: string | null;
  sortOrder?: number;
  metadata?: Record<string, unknown>;
  updatedAt?: string;
  publishedAt?: string | null;
};

function parseVisualsPayload(payload: unknown): AudioVisual[] {
  const data = (payload as { data?: unknown })?.data;
  if (Array.isArray(data)) return data as AudioVisual[];
  if (data && typeof data === "object" && Array.isArray((data as { visuals?: unknown }).visuals)) {
    return (data as { visuals: AudioVisual[] }).visuals;
  }
  return [];
}

function youtubeEmbedUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const iframeMatch = /src=["']([^"']+)["']/.exec(trimmed);
  const source = iframeMatch?.[1] ?? trimmed;
  try {
    const url = new URL(source.startsWith("http") ? source : `https://${source}`);
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
  return source;
}

function mediaTypeLabel(visual: AudioVisual) {
  const meta = visual.metadata ?? {};
  const mediaType = typeof meta.mediaType === "string" ? meta.mediaType : detectMediaKind(visual.embedUrl);
  if (mediaType === "embed" || mediaType === "youtube") return "YouTube";
  if (mediaType === "video_loop" || ["mp4", "mov", "webm"].includes(String(mediaType))) {
    return String(mediaType).toUpperCase();
  }
  return "YouTube";
}

function embedSourceLabel(visual: AudioVisual) {
  const meta = visual.metadata ?? {};
  if (typeof meta.embedSource === "string") return meta.embedSource;
  if (typeof meta.source === "string") return meta.source;
  return visual.youtubeVideoId ? "youtube" : "file";
}

function formatWhen(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function syncStatusLabel(visual: AudioVisual) {
  if (visual.status === "published") return "Synced";
  if (visual.metadata?.source === "frontend_import") return "Imported";
  return "Pending";
}

type AudioVisualsPanelProps = {
  embedded?: boolean;
  onUploadComplete?: () => void;
};

export function AudioVisualsPanel({ embedded = false, onUploadComplete }: AudioVisualsPanelProps) {
  const [visuals, setVisuals] = useState<AudioVisual[]>([]);
  const [status, setStatus] = useState("Loading audio visuals from Supabase…");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: "",
    youtubeUrl: "",
    releaseId: "",
    trackId: "",
    status: "draft"
  });
  const embedPreviewUrl = youtubeEmbedUrl(form.youtubeUrl);

  const refresh = useCallback(async (forceSync = false) => {
    setStatus(forceSync ? "Syncing from artist-platform musicVideos…" : "Refreshing audio visuals…");
    const response = await fetch(`/api/admin/audio-visuals${forceSync ? "?sync=1" : ""}`, {
      headers: { "x-admin": "true" },
      cache: "no-store"
    });
    const payload = await response.json().catch(() => null);
    if (response.ok) {
      setVisuals(parseVisualsPayload(payload));
      const syncMsg = (payload as { data?: { sync?: { message?: string } } })?.data?.sync?.message;
      setStatus(syncMsg ?? `Loaded ${parseVisualsPayload(payload).length} audio visual(s).`);
    } else {
      setStatus((payload as { error?: { message?: string } })?.error?.message ?? "Audio visuals unavailable.");
    }
  }, []);

  useEffect(() => {
    refresh(true).catch(() => setStatus("Audio visuals could not be loaded."));
  }, [refresh]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Creating audio visual…");
    const response = await fetch("/api/admin/audio-visuals", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin": "true" },
      body: JSON.stringify({
        title: form.title,
        youtubeUrl: form.youtubeUrl,
        releaseId: form.releaseId || null,
        trackId: form.trackId || null,
        status: form.status,
        metadata: { source: "control-system-panel", mediaType: "youtube" }
      })
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setStatus((payload as { error?: { message?: string } })?.error?.message ?? "Create failed.");
      return;
    }
    setStatus(`Created: ${(payload as { data?: { title?: string } })?.data?.title ?? form.title}`);
    setForm({ title: "", youtubeUrl: "", releaseId: "", trackId: "", status: "draft" });
    await refresh();
    onUploadComplete?.();
  }

  async function patchVisual(id: string, body: Record<string, unknown>) {
    setBusyId(id);
    const response = await fetch(`/api/admin/audio-visuals/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin": "true" },
      body: JSON.stringify(body)
    });
    setBusyId(null);
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setStatus((payload as { error?: { message?: string } })?.error?.message ?? "Update failed.");
      return false;
    }
    await refresh();
    onUploadComplete?.();
    return true;
  }

  async function publish(id: string) {
    setBusyId(id);
    setStatus("Publishing…");
    const response = await fetch(`/api/admin/audio-visuals/${encodeURIComponent(id)}/publish`, {
      method: "POST",
      headers: { "x-admin": "true" }
    });
    setBusyId(null);
    const payload = await response.json().catch(() => null);
    setStatus(response.ok ? `Published: ${(payload as { data?: { title?: string } })?.data?.title ?? "visual"}` : (payload as { error?: { message?: string } })?.error?.message ?? "Publish failed.");
    if (response.ok) {
      await refresh();
      onUploadComplete?.();
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Remove this audio visual from the catalog?")) return;
    setBusyId(id);
    const response = await fetch(`/api/admin/audio-visuals/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { "x-admin": "true" }
    });
    setBusyId(null);
    if (response.ok) {
      setStatus("Audio visual removed.");
      await refresh();
      onUploadComplete?.();
    }
  }

  function extensionFromPath(path: string) {
    const parts = path.split(".");
    return (parts[parts.length - 1] ?? "mp4").toLowerCase();
  }

  async function replaceEmbedUrl(visual: AudioVisual) {
    const next = window.prompt("New YouTube URL or MP4/MOV/WEBM URL", visual.youtubeUrl || visual.embedUrl);
    if (!next?.trim()) return;
    const isFile = /\.(mp4|mov|webm)(\?|$)/i.test(next);
    await patchVisual(visual.id, isFile ? { videoUrl: next, mediaType: extensionFromPath(next) } : { youtubeUrl: next });
  }

  function openPreview(visual: AudioVisual) {
    const kind = detectMediaKind(visual.embedUrl || visual.youtubeUrl);
    if (kind === "embed" || visual.youtubeVideoId) {
      setPreviewUrl(youtubeEmbedUrl(visual.embedUrl) || `https://www.youtube.com/embed/${visual.youtubeVideoId}`);
    } else {
      setPreviewUrl(visual.embedUrl || visual.youtubeUrl);
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) fileInputRef.current && (fileInputRef.current.files = event.dataTransfer.files);
  }

  const shellClass = embedded ? "media-sync-section-panel audio-visuals-embedded" : "release-command-card audio-visuals-card";

  return (
    <section className={shellClass} id="audio-visuals" style={embedded ? undefined : controlToneStyle("signal")}>
      {!embedded ? (
        <>
          <p className="meta-label">Audio Visuals</p>
          <h3>Music videos &amp; embeds</h3>
          <p>Auto-syncs from Supabase and artist-platform <code>musicVideos</code> when the catalog is incomplete.</p>
        </>
      ) : (
        <>
          <h2>Audiovisuals</h2>
          <p className="input-hint">YouTube, MP4, MOV, WEBM — routes to audio_visuals + youtube_embeds surfaces.</p>
        </>
      )}

      <div className="audio-visuals-toolbar">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => refresh(true)} disabled={busyId === "sync"}>
          <RefreshCw size={14} /> Sync frontend
        </button>
        <span className="audio-visuals-count">{visuals.length} active</span>
      </div>

      <form className="release-form audio-visuals-form" onSubmit={submit}>
        <label>
          Title
          <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Official visual title" required />
        </label>
        <label>
          YouTube URL / embed / MP4 URL
          <input value={form.youtubeUrl} onChange={(event) => setForm((current) => ({ ...current, youtubeUrl: event.target.value }))} placeholder="https://www.youtube.com/watch?v=…" required />
        </label>
        <label>
          Release link
          <input value={form.releaseId} onChange={(event) => setForm((current) => ({ ...current, releaseId: event.target.value }))} placeholder="Optional release UUID" />
        </label>
        <label>
          Track link
          <input value={form.trackId} onChange={(event) => setForm((current) => ({ ...current, trackId: event.target.value }))} placeholder="Optional track UUID" />
        </label>
        <button className="release-upload-button" type="submit">Add embed</button>
      </form>

      {embedPreviewUrl ? (
        <div className="audio-visual-embed-preview">
          <iframe title="Embed preview" src={embedPreviewUrl} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        </div>
      ) : null}

      <div
        className={`audio-visuals-dropzone${dragActive ? " active" : ""}`}
        onDragOver={(event) => { event.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => { if (event.key === "Enter") fileInputRef.current?.click(); }}
      >
        <Upload size={20} />
        <strong>Drop MP4 / MOV / WEBM</strong>
        <span>or click to choose — uploads via Media Sync routing</span>
        <input ref={fileInputRef} type="file" accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm" hidden />
      </div>

      <MediaUploadPanel draft={{ id: "global-audiovisuals", title: "Audiovisuals", tracks: [] }} mode="videos" onUploadComplete={() => { refresh(); onUploadComplete?.(); }} />

      <div className="audio-visuals-grid" aria-label="Audio visual records">
        {visuals.length === 0 ? (
          <p className="empty-desc">No visuals yet. Run Sync frontend or add an embed above.</p>
        ) : (
          visuals.map((visual) => (
            <article key={visual.id} className="audio-visuals-grid-card">
              <div className="audio-visuals-grid-thumb">
                {visual.thumbnailUrl ? (
                  <img src={visual.thumbnailUrl} alt="" loading="lazy" />
                ) : (
                  <span>{mediaTypeLabel(visual)}</span>
                )}
              </div>
              <div className="audio-visuals-grid-body">
                <strong>{visual.title}</strong>
                <span className="audio-visuals-meta">{visual.status.toUpperCase()} · {mediaTypeLabel(visual)} · {embedSourceLabel(visual)}</span>
                <span className="audio-visuals-meta">Sync: {syncStatusLabel(visual)} · Updated {formatWhen(visual.updatedAt)}</span>
                <span className="audio-visuals-meta">
                  Release: {visual.releaseId ? visual.releaseId.slice(0, 8) : "—"} · Track: {visual.trackId ? visual.trackId.slice(0, 8) : "—"}
                </span>
                <span className="audio-visuals-meta">Frontend: {visual.status === "published" ? "visible" : "hidden"}</span>
              </div>
              <div className="audio-visuals-grid-actions">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => openPreview(visual)} title="Preview">
                  <Eye size={14} />
                </button>
                <button type="button" className="btn btn-ghost btn-sm" disabled={busyId === visual.id} onClick={() => replaceEmbedUrl(visual)} title="Replace URL">
                  Replace
                </button>
                {visual.releaseId ? (
                  <Link href={`/releases/${visual.releaseId}`} className="btn btn-ghost btn-sm" title="Open release">
                    <ExternalLink size={14} />
                  </Link>
                ) : null}
                {visual.status !== "published" ? (
                  <button type="button" className="btn btn-primary btn-sm" disabled={busyId === visual.id} onClick={() => publish(visual.id)}>
                    Publish
                  </button>
                ) : null}
                <button type="button" className="btn btn-ghost btn-sm" disabled={busyId === visual.id} onClick={() => remove(visual.id)} title="Remove">
                  <Trash2 size={14} />
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      {previewUrl ? (
        <div className="audio-visuals-preview-modal" role="dialog" aria-modal="true">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPreviewUrl(null)}>Close</button>
          {previewUrl.includes("youtube.com/embed") ? (
            <iframe title="Audio visual preview" src={previewUrl} allowFullScreen />
          ) : (
            <video controls autoPlay src={previewUrl} />
          )}
        </div>
      ) : null}

      <p className="release-upload-status">{status}</p>
    </section>
  );
}
