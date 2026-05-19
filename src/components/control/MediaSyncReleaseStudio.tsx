"use client";

import { ChevronDown, ChevronUp, GripVertical, Headphones, Maximize2, MoreHorizontal, Pencil, Play, Plus, RefreshCw, Rocket, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { MediaUploadPanel } from "@/components/control/MediaUploadPanel";
import type { ControlUiRelease, DurableCatalogRelease, DurableCatalogTrack, ReleaseLiveStatus } from "@/services/catalog/controlCatalogClient";
import { ScheduledCountdown } from "@/components/control/ReleaseScheduleSection";
import { formatWhen } from "@/lib/formatWhen";
import { liveStatusBadgeLabel, liveStatusCssClass } from "@/services/catalog/releaseLiveStatusClient";
import {
  addReleaseTrack,
  createReleaseDraft,
  deleteReleaseTrack,
  loadReleaseLyricsSession,
  patchReleaseMetadata,
  patchReleaseTrack,
  reorderReleaseTracks,
  saveReleaseLyricsSession
} from "@/services/catalog/releaseStudioClient";
import { resolveMediaSyncRoute } from "@/services/sync/mediaSyncContract";
import { useMediaSync } from "@/hooks/sync/useMediaSync";
import { coverArtHints, detectMediaKind, pickCardVisual } from "@/lib/media/mediaVisual";

export type ReleaseStudioActions = {
  busyKey: string | null;
  publish: (releaseId: string) => void;
  unpublish: (releaseId: string) => void;
  archive: (releaseId: string) => void;
  recover: (releaseId: string) => void;
  duplicate: (releaseId: string) => void;
  sync: (releaseId: string) => void;
  isBusy: (releaseId: string, action: string) => boolean;
};

export type SyncStateRow = {
  key: string;
  dirty: boolean;
  last_event_at?: string | null;
  updated_at?: string | null;
  metadata?: Record<string, unknown>;
};

type WorkspaceTab = "cover" | "audio" | "tracklist" | "lyrics" | "metadata";
type StudioRow = { ui: ControlUiRelease; release: DurableCatalogRelease };

type VisualProps = {
  ui: ControlUiRelease;
  release?: DurableCatalogRelease;
  size?: "card" | "hero";
};

function releaseDraft(release: DurableCatalogRelease) {
  return {
    id: release.id,
    title: release.title,
    tracks: release.tracks.map((track) => ({ id: track.id, title: track.title, position: track.position }))
  };
}

function syncDirtyForRelease(rows: SyncStateRow[], releaseId: string) {
  return rows.some((row) => row.dirty && (row.key === `release:${releaseId}` || row.key === "catalog" || row.key.includes(releaseId)));
}

function StudioVisualCard({ ui, release, size = "card" }: VisualProps) {
  const visual = pickCardVisual({ coverUrl: release?.coverUrl ?? ui.coverUrl, loopUrl: release?.loopUrl ?? ui.loopUrl });
  const className = size === "hero" ? "media-sync-hero-visual" : "media-sync-card-visual";

  if (visual.url && (visual.kind === "video_loop" || visual.kind === "gif")) {
    return (
      <div className={className}>
        <video autoPlay loop muted playsInline preload="metadata" src={visual.url} />
      </div>
    );
  }
  if (visual.url && visual.kind === "image") {
    return (
      <div className={`${className} has-image`}>
        <img alt="" loading="lazy" src={visual.url} />
      </div>
    );
  }
  return (
    <div className={className} style={{ background: `linear-gradient(${ui.grad})` }}>
      <span>{ui.emoji}</span>
    </div>
  );
}

function resolveCardLiveStatus(release: DurableCatalogRelease): ReleaseLiveStatus {
  return release.liveStatus ?? (release.status === "published" ? "live" : release.status === "scheduled" ? "scheduled" : "draft");
}

function primaryTrack(release: DurableCatalogRelease) {
  return release.tracks[0] ?? null;
}

function AssetPanel({ title, status, ok, children, hint }: { title: string; status: string; ok: boolean; children: ReactNode; hint?: string }) {
  return (
    <div className={`media-sync-asset-panel${ok ? " ok" : " miss"}`}>
      <div className="media-sync-asset-label">
        <span>{title}</span>
        <span className={`media-sync-asset-status${ok ? " ok" : " miss"}`}>{status}</span>
      </div>
      {children}
      {hint ? <p className="media-sync-asset-hint">{hint}</p> : null}
    </div>
  );
}

function AudioMiniPlayer({ url, accent }: { url: string; accent?: "preview" | "full" }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className={`media-sync-audio-player${accent === "preview" ? " preview" : ""}`}>
      <button type="button" className="media-sync-play-btn" aria-label="Play" onClick={() => setPlaying((v) => !v)}>
        <Play size={11} />
      </button>
      <div className="media-sync-waveform" aria-hidden>
        {Array.from({ length: 12 }).map((_, index) => (
          <span key={index} style={{ height: `${40 + ((index * 17) % 55)}%` }} />
        ))}
      </div>
      {playing ? <audio autoPlay src={url} onEnded={() => setPlaying(false)} className="sr-only" /> : null}
    </div>
  );
}

function PreviewModal({ url, onClose }: { url: string; onClose: () => void }) {
  const kind = detectMediaKind(url);
  return (
    <div className="preview-modal" role="dialog" aria-modal="true">
      <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
      {kind === "audio" ? <audio controls autoPlay src={url} /> : kind === "video_loop" || kind === "gif" ? <video autoPlay controls loop src={url} /> : <img alt="" src={url} />}
    </div>
  );
}

function ReleaseOverflowMenu({
  releaseId,
  ui,
  onOpenRelease,
  onEdit,
  actions
}: {
  releaseId: string;
  ui: ControlUiRelease;
  onOpenRelease: (id: string) => void;
  onEdit: () => void;
  actions: ReleaseStudioActions;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const archived = ui.status === "Rejected";
  const canPublish = ui.status === "Draft" || ui.status === "Scheduled";
  const canUnpublish = ui.status === "Released";

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="media-sync-overflow">
      <button type="button" className="btn btn-ghost btn-sm" aria-label="More actions" onClick={() => setOpen((value) => !value)}>
        <MoreHorizontal size={14} />
      </button>
      {open ? (
        <div className="media-sync-overflow-menu card">
          <button type="button" className="nav-item" onClick={() => { setOpen(false); onEdit(); }}>Edit media</button>
          <button type="button" className="nav-item" onClick={() => { setOpen(false); onOpenRelease(releaseId); }}>Manage release</button>
          {archived ? (
            <button type="button" className="nav-item" disabled={actions.isBusy(releaseId, "recover")} onClick={() => { setOpen(false); actions.recover(releaseId); }}>Recover</button>
          ) : (
            <>
              {canPublish ? <button type="button" className="nav-item" disabled={actions.isBusy(releaseId, "publish")} onClick={() => { setOpen(false); actions.publish(releaseId); }}>Publish</button> : null}
              {canUnpublish ? <button type="button" className="nav-item" disabled={actions.isBusy(releaseId, "unpublish")} onClick={() => { setOpen(false); actions.unpublish(releaseId); }}>Unpublish</button> : null}
              <button type="button" className="nav-item" disabled={actions.isBusy(releaseId, "archive")} onClick={() => { setOpen(false); actions.archive(releaseId); }}>Archive</button>
            </>
          )}
          <button type="button" className="nav-item" disabled={actions.isBusy(releaseId, "duplicate")} onClick={() => { setOpen(false); actions.duplicate(releaseId); }}>Duplicate</button>
          <button type="button" className="nav-item" disabled={actions.isBusy(releaseId, "sync")} onClick={() => { setOpen(false); actions.sync(releaseId); }}>Sync frontend</button>
        </div>
      ) : null}
    </div>
  );
}

function TracklistEditor({
  release,
  tracks,
  onChanged
}: {
  release: DurableCatalogRelease;
  tracks: DurableCatalogTrack[];
  onChanged?: () => void;
}) {
  const [rows, setRows] = useState(tracks);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    setRows(tracks);
  }, [tracks]);

  const persistOrder = async (next: DurableCatalogTrack[]) => {
    setBusy(true);
    setStatus("Saving order…");
    const result = await reorderReleaseTracks(
      release.id,
      next.map((track) => track.id)
    );
    setBusy(false);
    if (!result.ok) {
      setStatus(result.error);
      return;
    }
    setRows(next);
    setStatus("Track order saved.");
    onChanged?.();
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item!);
    void persistOrder(next.map((track, position) => ({ ...track, position: position + 1 })));
  };

  const addTrack = async () => {
    setBusy(true);
    setStatus("Adding track…");
    const result = await addReleaseTrack(release.id);
    setBusy(false);
    if (!result.ok) {
      setStatus(result.error);
      return;
    }
    setStatus("Track added.");
    onChanged?.();
  };

  const removeTrack = async (trackId: string) => {
    setBusy(true);
    setStatus("Removing track…");
    const result = await deleteReleaseTrack(release.id, trackId);
    setBusy(false);
    if (!result.ok) {
      setStatus(result.error);
      return;
    }
    setStatus("Track removed.");
    onChanged?.();
  };

  const saveTitle = async (trackId: string, title: string) => {
    if (!title.trim()) return;
    const result = await patchReleaseTrack(release.id, trackId, { title: title.trim() });
    if (!result.ok) {
      setStatus(result.error);
      return;
    }
    setStatus("Track title saved.");
    onChanged?.();
  };

  return (
    <div className="media-sync-tracklist media-sync-ws-full">
      {rows.map((track, index) => (
        <div className="media-sync-tracklist-row" key={track.id}>
          <div className="row-between gap-8">
            <strong>{index + 1}.</strong>
            <input
              className="input"
              defaultValue={track.title}
              onBlur={(event) => void saveTitle(track.id, event.target.value)}
              placeholder="Track title"
            />
            <div className="row gap-4">
              <button type="button" className="btn btn-ghost btn-sm" disabled={busy || index === 0} onClick={() => move(index, -1)} aria-label="Move up"><ChevronUp size={12} /></button>
              <button type="button" className="btn btn-ghost btn-sm" disabled={busy || index === rows.length - 1} onClick={() => move(index, 1)} aria-label="Move down"><ChevronDown size={12} /></button>
              <GripVertical size={12} style={{ color: "var(--tx3)" }} />
              <button type="button" className="btn btn-ghost btn-sm" disabled={busy || rows.length <= 1} onClick={() => void removeTrack(track.id)} aria-label="Delete track"><Trash2 size={12} /></button>
            </div>
          </div>
          <span>{track.audioUrl ? "Full linked" : "Full missing"} · {track.previewUrl ? "Preview linked" : "Preview missing"}</span>
        </div>
      ))}
      <div className="row gap-8 mt-8">
        <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void addTrack()}><Plus size={12} /> Add track</button>
        {status ? <span className="form-status">{status}</span> : null}
      </div>
    </div>
  );
}

function LyricsEditor({
  release,
  track,
  onSaved
}: {
  release: DurableCatalogRelease;
  track: DurableCatalogTrack;
  onSaved?: () => void;
}) {
  const [lyrics, setLyrics] = useState("");
  const [status, setStatus] = useState("Loading lyrics…");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadReleaseLyricsSession(release.id).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setLyrics(result.data[track.id] ?? "");
        setStatus("Lyrics loaded from session.");
      } else {
        setStatus(result.error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [release.id, track.id]);

  const save = useCallback(async () => {
    setBusy(true);
    setStatus("Saving lyrics…");
    const existing = await loadReleaseLyricsSession(release.id);
    const map = existing.ok ? { ...existing.data, [track.id]: lyrics } : { [track.id]: lyrics };
    const result = await saveReleaseLyricsSession(release.id, map);
    setBusy(false);
    setStatus(result.ok ? "Lyrics saved to release session." : result.error);
    if (result.ok) onSaved?.();
  }, [lyrics, onSaved, release.id, track.id]);

  return (
    <div className="media-sync-lyrics-panel media-sync-ws-full">
      <label className="input-group span-2">
        <span className="input-label">Lyrics — {track.title}</span>
        <textarea className="input textarea" rows={14} value={lyrics} onChange={(event) => setLyrics(event.target.value)} placeholder="Paste or write lyrics…" />
      </label>
      <div className="row gap-8">
        <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => void save()}>Save lyrics</button>
        {status ? <span className="form-status">{status}</span> : null}
      </div>
      <MediaUploadPanel draft={releaseDraft(release)} fixedCategory="lyrics" compact onUploadComplete={onSaved} />
    </div>
  );
}

function MetadataEditor({
  release,
  ui,
  onSaved
}: {
  release: DurableCatalogRelease;
  ui: ControlUiRelease;
  onSaved?: () => void;
}) {
  const [title, setTitle] = useState(release.title);
  const [slug, setSlug] = useState(release.slug);
  const [releaseDate, setReleaseDate] = useState(release.releaseDate?.slice(0, 10) ?? ui.date);
  const [metadataNotes, setMetadataNotes] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    setStatus("Saving metadata…");
    const result = await patchReleaseMetadata(release.id, {
      title: title.trim(),
      slug: slug.trim(),
      originalReleaseDate: releaseDate || undefined,
      metadataNotes: metadataNotes.trim() || undefined
    });
    setBusy(false);
    setStatus(result.ok ? "Metadata saved." : result.error);
    if (result.ok) onSaved?.();
  };

  return (
    <form
      className="media-sync-meta-panel media-sync-meta-form"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <label className="input-group">
        <span className="input-label">Title</span>
        <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} required />
      </label>
      <label className="input-group">
        <span className="input-label">Slug</span>
        <input className="input" value={slug} onChange={(event) => setSlug(event.target.value)} required />
      </label>
      <label className="input-group">
        <span className="input-label">Release date</span>
        <input className="input" type="date" value={releaseDate} onChange={(event) => setReleaseDate(event.target.value)} />
      </label>
      <label className="input-group span-2">
        <span className="input-label">Metadata notes</span>
        <textarea className="input textarea" rows={4} value={metadataNotes} onChange={(event) => setMetadataNotes(event.target.value)} placeholder="Credits, publishing, internal notes…" />
      </label>
      <div className="mvrow"><strong>Type</strong><span>{ui.type}</span></div>
      <div className="mvrow"><strong>Status</strong><span>{ui.status}</span></div>
      <div className="mvrow"><strong>Tracks</strong><span>{release.tracks.length}</span></div>
      <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>Save metadata</button>
      {status ? <p className="form-status">{status}</p> : null}
    </form>
  );
}

function ReleaseInspectorRail({
  release,
  ui,
  syncRows,
  connected,
  onForceSync,
  syncing
}: {
  release: DurableCatalogRelease;
  ui: ControlUiRelease;
  syncRows: SyncStateRow[];
  connected: boolean;
  onForceSync: () => void;
  syncing: boolean;
}) {
  const route = resolveMediaSyncRoute({
    relatedReleaseId: release.id,
    releaseType: release.releaseType as "single" | "album" | "ep" | undefined,
    releaseSlug: release.slug
  });
  const track = primaryTrack(release);
  const dirty = syncDirtyForRelease(syncRows, release.id);
  const displayCoverUrl = release.coverUrl ?? release.loopUrl;
  const health = [
    { label: "Cover Art", ok: Boolean(displayCoverUrl), val: displayCoverUrl ? "OK" : "Missing" },
    { label: "Motion Cover", ok: Boolean(release.loopUrl), val: release.loopUrl ? "Loop" : "Missing" },
    { label: "Full Audio", ok: Boolean(track?.audioUrl), val: track?.audioUrl ? "Linked" : "Missing" },
    { label: "Preview Audio", ok: Boolean(track?.previewUrl), val: track?.previewUrl ? "Clip" : "Missing" },
    { label: "Lyrics", ok: false, val: "Missing" }
  ];

  return (
    <aside className="media-sync-inspector card">
      <div className={`media-sync-sync-pill${connected ? " live" : ""}`}>
        <span className="media-sync-sync-dot" />
        {connected ? "Realtime Sync Active" : "Sync idle"}
      </div>

      <p className="media-sync-inspector-sec">Asset Health</p>
      {health.map((row) => (
        <div className="media-sync-health-row" key={row.label}>
          <span className={`media-sync-health-dot${row.ok ? " ok" : " warn"}`} />
          <span className="media-sync-health-label">{row.label}</span>
          <span className={`media-sync-health-val${row.ok ? " ok" : " miss"}`}>{row.val}</span>
        </div>
      ))}

      <div className="media-sync-inspector-sep" />

      <p className="media-sync-inspector-sec">Access Logic</p>
      <div className="media-sync-access-box">
        <strong>Full Audio serves if:</strong>
        <span>Collector card holder</span>
        <span>Active subscriber</span>
        <span>Purchased unlock</span>
      </div>
      <div className="media-sync-access-box preview">
        <strong>Preview serves if:</strong>
        <span>No card, no sub, no purchase</span>
      </div>

      <div className="media-sync-inspector-sep" />

      <p className="media-sync-inspector-sec">Relationship Map</p>
      <div className="media-sync-relmap">
        <div><span>release:</span> <em>{ui.title}</em></div>
        <div><span>route:</span> <em>{route.frontendRoute}</em></div>
        <div><span>status:</span> <em>{liveStatusBadgeLabel(resolveCardLiveStatus(release))}</em></div>
        <div><span>dirty:</span> <em>{dirty ? "true" : "false"}</em></div>
      </div>

      <p className="media-sync-inspector-sec">Platforms</p>
      <div className="media-sync-platform-tags">
        {route.platformScope.map((platform) => (
          <span key={platform} className="media-sync-platform-tag on">{platform}</span>
        ))}
      </div>

      <p className="media-sync-inspector-sec">Sync Log</p>
      <div className="media-sync-slog">
        <div><time>—</time><span>Catalog <b>updated</b> {formatWhen(release.updatedAt ?? ui.updatedAt)}</span></div>
        {dirty ? <div><time>now</time><span><b>Dirty</b> — pending frontend sync</span></div> : null}
      </div>

      <button type="button" className="media-sync-force-btn" disabled={syncing} onClick={onForceSync}>
        <RefreshCw size={13} /> Force Sync
      </button>
    </aside>
  );
}

function ReleaseWorkspacePanel({
  release,
  ui,
  onEdit,
  onOpenRelease,
  onUploadComplete,
  actions
}: {
  release: DurableCatalogRelease;
  ui: ControlUiRelease;
  onEdit: () => void;
  onOpenRelease: (id: string) => void;
  onUploadComplete?: () => void;
  actions: ReleaseStudioActions;
}) {
  const [tab, setTab] = useState<WorkspaceTab>("cover");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const draft = releaseDraft(release);
  const track = primaryTrack(release);
  const isAlbumLike = ui.type === "Album" || ui.type === "EP" || ui.type === "Deluxe";
  const liveStatus = resolveCardLiveStatus(release);
  const syncing = actions.isBusy(release.id, "sync");
  const motionAccept = ".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm";
  const displayCoverUrl = release.coverUrl ?? release.loopUrl;
  const tabs: Array<{ id: WorkspaceTab; label: string }> = isAlbumLike
    ? [
        { id: "cover", label: "Cover Art" },
        { id: "audio", label: "Audio" },
        { id: "tracklist", label: "Tracklist" },
        { id: "lyrics", label: "Lyrics" },
        { id: "metadata", label: "Metadata" }
      ]
    : [
        { id: "cover", label: "Cover Art" },
        { id: "audio", label: "Audio" },
        { id: "lyrics", label: "Lyrics" },
        { id: "metadata", label: "Metadata" }
      ];

  return (
    <article className="media-sync-release-workspace card">
      <header className="media-sync-ws-head">
        <StudioVisualCard ui={ui} release={release} />
        <div>
          <h3>{ui.title}</h3>
          <div className="media-sync-ws-tags">
            <span className={`media-sync-ws-tag media-sync-live-badge ${liveStatusCssClass(liveStatus)}`}>
              {liveStatus === "live" ? "● Live" : liveStatusBadgeLabel(liveStatus)}
            </span>
            <span className="media-sync-ws-tag type">{ui.type}</span>
            <span className="media-sync-ws-date">{ui.date}</span>
          </div>
        </div>
        <div className="media-sync-ws-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onEdit}><Pencil size={12} /> Edit Meta</button>
          <button type="button" className="btn btn-primary btn-sm" disabled={syncing} onClick={() => actions.sync(release.id)}><Rocket size={12} /> Sync</button>
          <ReleaseOverflowMenu releaseId={release.id} ui={ui} onOpenRelease={onOpenRelease} onEdit={onEdit} actions={actions} />
        </div>
      </header>

      <nav className="media-sync-ws-tabs" aria-label="Release workspace tabs">
        {tabs.map((item) => (
          <button key={item.id} type="button" className={`media-sync-ws-tab${tab === item.id ? " on" : ""}`} onClick={() => setTab(item.id)}>{item.label}</button>
        ))}
      </nav>

      <div className="media-sync-ws-body">
        {tab === "cover" ? (
          <>
            <AssetPanel title="Cover Art" status={displayCoverUrl ? "Linked" : "Missing"} ok={Boolean(displayCoverUrl)} hint="Syncs → Singles · Release page · Carousel · Mobile">
              {displayCoverUrl ? (
                <div className={`media-sync-asset-preview art${detectMediaKind(displayCoverUrl) === "image" ? " has-image" : ""}`}>
                  {detectMediaKind(displayCoverUrl) === "image" ? <img alt="" src={displayCoverUrl} /> : <video autoPlay loop muted playsInline src={displayCoverUrl} />}
                </div>
              ) : <div className="media-sync-asset-preview empty">No cover yet</div>}
              <MediaUploadPanel draft={draft} mode="artwork" fixedCategory="release_cover" compact acceptOverride={isAlbumLike ? undefined : `${motionAccept},image/*`} onUploadComplete={onUploadComplete} />
            </AssetPanel>
            {isAlbumLike ? (
              <AssetPanel title="Motion Cover" status={release.loopUrl ? "Linked" : "Missing"} ok={Boolean(release.loopUrl)} hint="MP4 / MOV / WebM · up to 90s loop">
                {release.loopUrl ? (
                  <div className="media-sync-asset-preview art"><video autoPlay loop muted playsInline src={release.loopUrl} /></div>
                ) : <div className="media-sync-asset-preview empty">No motion loop</div>}
                <MediaUploadPanel draft={draft} mode="artwork" fixedCategory="release_cover" compact acceptOverride={motionAccept} onUploadComplete={onUploadComplete} />
              </AssetPanel>
            ) : null}
          </>
        ) : null}

        {tab === "tracklist" && isAlbumLike ? (
          <TracklistEditor release={release} tracks={release.tracks} onChanged={onUploadComplete} />
        ) : null}

        {tab === "audio" ? (
          isAlbumLike ? (
            <div className="media-sync-ws-full">
              <p className="input-hint">{coverArtHints}</p>
              <div className="media-track-nest">
                {release.tracks.map((t) => (
                  <details className="media-track-block" key={t.id} open={t.position === 1}>
                    <summary>{t.position}. {t.title}</summary>
                    <div className="media-sync-audio-teaser-grid">
                      <AssetPanel title="Full Audio" status={t.audioUrl ? "Linked" : "Missing"} ok={Boolean(t.audioUrl)}>
                        {t.audioUrl ? <AudioMiniPlayer url={t.audioUrl} /> : null}
                        <MediaUploadPanel draft={{ ...draft, tracks: [{ id: t.id, title: t.title, position: t.position }] }} fixedCategory="full_song_files" compact onUploadComplete={onUploadComplete} />
                      </AssetPanel>
                      <AssetPanel title="Preview Audio" status={t.previewUrl ? "Linked" : "Missing"} ok={Boolean(t.previewUrl)}>
                        {t.previewUrl ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPreviewUrl(t.previewUrl!)}><Maximize2 size={12} /> Play</button> : null}
                        <MediaUploadPanel draft={{ ...draft, tracks: [{ id: t.id, title: t.title, position: t.position }] }} fixedCategory="preview_snippets" compact onUploadComplete={onUploadComplete} />
                      </AssetPanel>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ) : track ? (
            <div className="media-sync-audio-teaser-grid">
              <AssetPanel title="Full Audio" status={track.audioUrl ? "Linked" : "Missing"} ok={Boolean(track.audioUrl)} hint="Master audio — gated on frontend">
                {track.audioUrl ? <AudioMiniPlayer url={track.audioUrl} accent="full" /> : null}
                <MediaUploadPanel draft={draft} fixedCategory="full_song_files" compact onUploadComplete={onUploadComplete} />
              </AssetPanel>
              <AssetPanel title="Preview Audio" status={track.previewUrl ? "Linked" : "Missing"} ok={Boolean(track.previewUrl)} hint="Public preview clip">
                {track.previewUrl ? <><AudioMiniPlayer url={track.previewUrl} accent="preview" /><button type="button" className="btn btn-ghost btn-sm" onClick={() => setPreviewUrl(track.previewUrl!)}><Maximize2 size={12} /> Expand</button></> : null}
                <MediaUploadPanel draft={draft} fixedCategory="preview_snippets" compact onUploadComplete={onUploadComplete} />
              </AssetPanel>
            </div>
          ) : <p className="empty-desc">Add a track before uploading audio.</p>
        ) : null}

        {tab === "lyrics" ? (
          track ? <LyricsEditor release={release} track={track} onSaved={onUploadComplete} /> : <p className="empty-desc">No track for lyrics.</p>
        ) : null}

        {tab === "metadata" ? (
          <MetadataEditor release={release} ui={ui} onSaved={onUploadComplete} />
        ) : null}
      </div>

      {previewUrl ? <PreviewModal url={previewUrl} onClose={() => setPreviewUrl(null)} /> : null}
    </article>
  );
}

export function ReleaseManagementSection({
  sectionTitle,
  catalog,
  releases,
  filter,
  syncRows,
  onEdit,
  onOpenRelease,
  onUploadComplete,
  actions
}: {
  sectionTitle: string;
  catalog: DurableCatalogRelease[];
  releases: ControlUiRelease[];
  filter: (release: DurableCatalogRelease) => boolean;
  syncRows: SyncStateRow[];
  onEdit: (id: string) => void;
  onOpenRelease: (id: string) => void;
  onUploadComplete?: () => void;
  actions: ReleaseStudioActions;
}) {
  const { connected } = useMediaSync(() => onUploadComplete?.());
  const rows = useMemo(() => {
    const byId = new Map(catalog.map((release) => [release.id, release]));
    return releases.map((ui) => { const release = byId.get(ui.id); return release && filter(release) ? { ui, release } : null; }).filter(Boolean) as StudioRow[];
  }, [catalog, releases, filter]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    if (!rows.length) { setSelectedId(null); return; }
    if (!selectedId || !rows.some((row) => row.release.id === selectedId)) setSelectedId(rows[0]!.release.id);
  }, [rows, selectedId]);

  const selected = rows.find((row) => row.release.id === selectedId) ?? null;
  const liveCount = rows.filter((row) => resolveCardLiveStatus(row.release) === "live").length;

  if (!rows.length) return <div className="empty-desc">No releases in this section yet.</div>;

  return (
    <section className="media-sync-release-management">
      <header className="media-sync-sec-bar">
        <div><h2>{sectionTitle}</h2><p>{rows.length} releases · {liveCount} live · {rows.length - liveCount} draft</p></div>
        <div className={`media-sync-sync-pill${connected ? " live" : ""}`}><span className="media-sync-sync-dot" />Realtime Sync {connected ? "Active" : "Idle"}</div>
      </header>
      <div className="media-sync-card-scroll-wrap">
        <p className="media-sync-card-scroll-label">All {sectionTitle} — click to manage</p>
        <div className="media-sync-card-scroll">
          {rows.map(({ ui, release }) => {
            const liveStatus = resolveCardLiveStatus(release);
            const statusTitle = release.liveStatusReasons?.length
              ? release.liveStatusReasons.join(" · ")
              : liveStatusBadgeLabel(liveStatus);
            return (
              <button key={release.id} type="button" className={`media-sync-rc${release.id === selectedId ? " on" : ""}`} onClick={() => setSelectedId(release.id)}>
                <div className="media-sync-rc-art"><StudioVisualCard ui={ui} release={release} /></div>
                <span className={`media-sync-live-badge ${liveStatusCssClass(liveStatus)}`} title={statusTitle}>
                  {liveStatusBadgeLabel(liveStatus)}
                </span>
                <div className="media-sync-rc-info">
                  <strong>{ui.title}</strong>
                  {liveStatus === "scheduled" ? <ScheduledCountdown scheduledPublishAt={release.scheduledPublishAt} /> : null}
                  <time className="media-sync-rc-updated" dateTime={release.updatedAt ?? undefined} suppressHydrationWarning>
                    {formatWhen(release.updatedAt ?? ui.updatedAt)}
                  </time>
                </div>
              </button>
            );
          })}
          <button
            type="button"
            className="media-sync-rc media-sync-rc-add"
            onClick={() => {
              const releaseType = sectionTitle.includes("Album") ? "album" : sectionTitle.includes("Feature") ? "feature" : "single";
              void createReleaseDraft(releaseType, releaseType === "single" || releaseType === "feature" ? 1 : 0).then((result) => {
                if (result.ok) {
                  onOpenRelease(result.data.id);
                  onUploadComplete?.();
                }
              });
            }}
          >
            <Plus size={20} /><span>New</span>
          </button>
        </div>
      </div>
      {selected ? (
        <div className="media-sync-release-layout">
          <ReleaseWorkspacePanel release={selected.release} ui={selected.ui} onEdit={() => onEdit(selected.release.id)} onOpenRelease={onOpenRelease} onUploadComplete={onUploadComplete} actions={actions} />
          <ReleaseInspectorRail release={selected.release} ui={selected.ui} syncRows={syncRows} connected={connected} syncing={actions.isBusy(selected.release.id, "sync")} onForceSync={() => actions.sync(selected.release.id)} />
        </div>
      ) : null}
    </section>
  );
}
