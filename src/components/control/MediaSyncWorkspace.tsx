"use client";

import { ChevronDown, ChevronRight, Headphones, Maximize2, Pencil, Play, Plus, Radio, RefreshCw, Rocket, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AudioVisualsPanel } from "@/components/control/AudioVisualsPanel";
import { MediaUploadPanel } from "@/components/control/MediaUploadPanel";
import type { ControlUiRelease, DurableCatalogRelease, DurableCatalogReleaseMedia } from "@/services/catalog/controlCatalogClient";
import { categoryTabForRelease } from "@/services/sync/mediaSyncContract";
import {
  controlRoomRootSections,
  isFeatureRelease,
  mediaSectionLabel,
  mediaSectionPurpose,
  releaseMediaWorkspaceSections,
  resolveMediaSyncRoute,
  sectionForAssetRole,
  type ControlRoomSectionId,
  type MediaSectionId
} from "@/services/sync/mediaSyncContract";
import { useMediaSync } from "@/hooks/sync/useMediaSync";
import { useUploadQueue } from "@/hooks/sync/useUploadQueue";
import { coverArtHints, detectMediaKind } from "@/lib/media/mediaVisual";
import { ReleaseMediaCard } from "@/components/media/ReleaseMediaCard";
import { formatWhen } from "@/lib/formatWhen";
import { ReleaseManagementSection } from "@/components/control/MediaSyncReleaseStudio";

type DraftTrack = { id: string; title: string; position: number };
type StudioDraft = { id: string; title: string; tracks: DraftTrack[] };

type ReleaseStudioActions = {
  busyKey: string | null;
  publish: (releaseId: string) => void;
  unpublish: (releaseId: string) => void;
  archive: (releaseId: string) => void;
  recover: (releaseId: string) => void;
  duplicate: (releaseId: string) => void;
  sync: (releaseId: string) => void;
  isBusy: (releaseId: string, action: string) => boolean;
};

type SyncStateRow = {
  key: string;
  dirty: boolean;
  last_event_at?: string | null;
  updated_at?: string | null;
  metadata?: Record<string, unknown>;
};

type HeroPayload = {
  title?: string | null;
  subtitle?: string | null;
  cta_label?: string | null;
  background_media_url?: string | null;
  background_media_type?: string | null;
  updated_at?: string | null;
};

function releaseDraft(release: DurableCatalogRelease): StudioDraft {
  return {
    id: release.id,
    title: release.title,
    tracks: release.tracks.map((track) => ({ id: track.id, title: track.title, position: track.position }))
  };
}

function globalDraft(label: string): StudioDraft {
  return { id: `global-${label}`, title: label, tracks: [] };
}

function singlesFilter(release: DurableCatalogRelease) {
  return categoryTabForRelease(release.releaseType, release.tracks.length, release.releaseCategory) === "Singles" && !isFeatureRelease(release);
}

function albumsFilter(release: DurableCatalogRelease) {
  return categoryTabForRelease(release.releaseType, release.tracks.length, release.releaseCategory) === "Albums & EPs" && !isFeatureRelease(release);
}

function featuresFilter(release: DurableCatalogRelease) {
  return isFeatureRelease(release);
}

function syncDirtyForRelease(rows: SyncStateRow[], releaseId: string) {
  return rows.some((row) => row.dirty && (row.key === `release:${releaseId}` || row.key === "catalog" || row.key.includes(releaseId)));
}

function MediaVisualCard({
  ui,
  release,
  size = "card"
}: {
  ui: ControlUiRelease;
  release?: DurableCatalogRelease;
  size?: "card" | "hero";
}) {
  const className = size === "hero" ? "media-sync-hero-visual" : "media-sync-card-visual";
  return (
    <ReleaseMediaCard
      alt={ui.title}
      className={className}
      coverUrl={release?.posterUrl ?? release?.coverUrl ?? ui.posterUrl ?? ui.coverUrl}
      emoji={ui.emoji}
      grad={ui.grad}
      lazy
      loopUrl={release?.motionUrl ?? release?.loopUrl ?? ui.motionUrl ?? ui.loopUrl}
      motionUrl={release?.motionUrl ?? release?.loopUrl ?? ui.motionUrl ?? ui.loopUrl}
      posterUrl={release?.posterUrl ?? ui.posterUrl}
      primaryAsset={release?.primaryAsset ?? ui.primaryAsset}
      slug={release?.slug ?? ui.slug}
    />
  );
}

function SyncStatusBadge({ dirty, syncing }: { dirty?: boolean; syncing?: boolean }) {
  if (syncing) return <span className="media-sync-badge media-sync-badge-syncing">Syncing</span>;
  if (dirty) return <span className="media-sync-badge media-sync-badge-dirty">Dirty</span>;
  return <span className="media-sync-badge media-sync-badge-clean">Synced</span>;
}

function MediaPreviewModal({ url, kind, onClose }: { url: string; kind: ReturnType<typeof detectMediaKind>; onClose: () => void }) {
  return (
    <div className="preview-modal" role="dialog" aria-modal="true">
      <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
        Close
      </button>
      {kind === "audio" ? <audio controls autoPlay src={url} /> : kind === "video_loop" || kind === "gif" ? <video autoPlay controls loop src={url} /> : <img alt="" src={url} />}
    </div>
  );
}

function ExpandableBlock({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details className="media-sync-expand" open={open} onToggle={(event) => setOpen((event.target as HTMLDetailsElement).open)}>
      <summary>{title}</summary>
      <div className="media-sync-expand-body">{children}</div>
    </details>
  );
}

function ReleaseControlCard({
  release,
  ui,
  syncRows,
  onEdit,
  onOpenRelease,
  onUploadComplete,
  actions
}: {
  release: DurableCatalogRelease;
  ui: ControlUiRelease;
  syncRows: SyncStateRow[];
  onEdit: () => void;
  onOpenRelease: (id: string) => void;
  onUploadComplete?: () => void;
  actions: ReleaseStudioActions;
}) {
  const [open, setOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const draft = releaseDraft(release);
  const dirty = syncDirtyForRelease(syncRows, release.id);
  const syncing = actions.isBusy(release.id, "sync");
  const isAlbumLike = ui.type === "Album" || ui.type === "EP" || ui.type === "Deluxe";
  const route = resolveMediaSyncRoute({
    relatedReleaseId: release.id,
    releaseType: release.releaseType as "single" | "album" | "ep" | undefined,
    releaseSlug: release.slug
  });

  return (
    <article className={`media-sync-release-card${open ? " open" : ""}`}>
      <header
        className="media-sync-release-head"
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen((value) => !value);
          }
        }}
        role="button"
        tabIndex={0}
      >
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <MediaVisualCard ui={ui} release={release} />
        <div className="media-sync-release-meta">
          <div className="release-title">{ui.title}</div>
          <div className="release-meta">
            {ui.type} · {ui.tracks} tracks · {formatWhen(release.updatedAt ?? ui.updatedAt)}
          </div>
          <div className="media-sync-release-badges">
            <SyncStatusBadge dirty={dirty} syncing={syncing} />
            <span className="media-sync-badge media-sync-badge-muted">{route.frontendRoute}</span>
          </div>
        </div>
        <div className="media-sync-release-actions" onClick={(event) => event.stopPropagation()}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onEdit}>
            <Pencil size={13} /> Edit
          </button>
        </div>
      </header>
      {open ? (
        <div className="media-sync-release-body">
          <p className="input-hint">{coverArtHints}</p>
          <ExpandableBlock title="Cover Art" defaultOpen>
            <MediaUploadPanel draft={draft} mode="artwork" onUploadComplete={onUploadComplete} />
          </ExpandableBlock>
          {!isAlbumLike ? (
            <>
              <ExpandableBlock title="Full Song">
                <MediaUploadPanel draft={draft} fixedCategory="full_song_files" onUploadComplete={onUploadComplete} />
              </ExpandableBlock>
              <ExpandableBlock title="Preview Snippet">
                <MediaUploadPanel draft={draft} fixedCategory="preview_snippets" onUploadComplete={onUploadComplete} />
              </ExpandableBlock>
            </>
          ) : (
            <ExpandableBlock title="Tracklist" defaultOpen>
              <div className="media-track-nest">
                {release.tracks.map((track) => (
                  <details className="media-track-block" key={track.id} open={track.position === 1}>
                    <summary>
                      {track.position}. {track.title}
                      <span className="media-sync-track-pills">
                        <span className={track.previewUrl ? "ok" : ""}>Preview</span>
                        <span className={track.audioUrl ? "ok" : ""}>Full</span>
                      </span>
                    </summary>
                    {track.previewUrl ? (
                      <div className="mvrow">
                        <span>Preview waveform</span>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPreviewUrl(track.previewUrl!)}>
                          <Maximize2 size={12} /> Play
                        </button>
                      </div>
                    ) : null}
                    <MediaUploadPanel
                      draft={{ ...draft, tracks: [{ id: track.id, title: track.title, position: track.position }] }}
                      mode="audio"
                      onUploadComplete={onUploadComplete}
                    />
                  </details>
                ))}
              </div>
            </ExpandableBlock>
          )}
          <div className="row gap-8 mt-12">
            <button type="button" className="btn btn-ghost btn-sm" disabled={syncing} onClick={() => actions.sync(release.id)}>
              Sync frontend
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onOpenRelease(release.id)}>
              Manage release
            </button>
          </div>
        </div>
      ) : null}
      {previewUrl ? <MediaPreviewModal url={previewUrl} kind={detectMediaKind(previewUrl)} onClose={() => setPreviewUrl(null)} /> : null}
    </article>
  );
}

function ReleaseGrid({
  catalog,
  releases,
  filter,
  syncRows,
  onEdit,
  onOpenRelease,
  onUploadComplete,
  actions
}: {
  catalog: DurableCatalogRelease[];
  releases: ControlUiRelease[];
  filter: (release: DurableCatalogRelease) => boolean;
  syncRows: SyncStateRow[];
  onEdit: (id: string) => void;
  onOpenRelease: (id: string) => void;
  onUploadComplete?: () => void;
  actions: ReleaseStudioActions;
}) {
  const byId = useMemo(() => new Map(catalog.map((release) => [release.id, release])), [catalog]);
  const rows = releases
    .map((ui) => {
      const release = byId.get(ui.id);
      return release && filter(release) ? { ui, release } : null;
    })
    .filter(Boolean) as Array<{ ui: ControlUiRelease; release: DurableCatalogRelease }>;

  if (!rows.length) {
    return <div className="empty-desc">No releases in this section yet.</div>;
  }

  return (
    <div className="media-sync-release-grid">
      {rows.map(({ ui, release }) => (
        <ReleaseControlCard
          key={release.id}
          release={release}
          ui={ui}
          syncRows={syncRows}
          onEdit={() => onEdit(release.id)}
          onOpenRelease={onOpenRelease}
          onUploadComplete={onUploadComplete}
          actions={actions}
        />
      ))}
    </div>
  );
}

function HeroControlSection({ onUploadComplete }: { onUploadComplete?: () => void }) {
  const [hero, setHero] = useState<HeroPayload | null>(null);
  const [title, setTitle] = useState("2MRRW");
  const [subtitle, setSubtitle] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaHref, setCtaHref] = useState("");
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("");

  const loadHero = useCallback(() => {
    setLoading(true);
    void fetch("/api/public/hero", { cache: "no-store" })
      .then((response) => response.json())
      .then((publicPayload) => {
        const publicHero = (publicPayload as { data?: { hero?: HeroPayload } })?.data?.hero;
        if (publicHero?.background_media_url) {
          setHero(publicHero);
          setTitle(publicHero.title ?? "2MRRW");
          setSubtitle(publicHero.subtitle ?? "");
          setCtaLabel((publicHero as { cta_label?: string }).cta_label ?? "");
          setCtaHref((publicHero as { cta_href?: string }).cta_href ?? "");
        }
      })
      .catch(() => undefined);
    void fetch("/api/admin/hero-config", { headers: { "x-admin": "true" }, cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        const row = (payload as { data?: { data?: HeroPayload & { cta_label?: string | null; cta_href?: string | null } } }).data?.data;
        if (row) {
          setHero(row);
          setTitle(row.title ?? "2MRRW");
          setSubtitle(row.subtitle ?? "");
          setCtaLabel(row.cta_label ?? "");
          setCtaHref(row.cta_href ?? "");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadHero();
  }, [loadHero]);

  const saveCopy = async () => {
    setSaveStatus("Saving hero copy…");
    const response = await fetch("/api/admin/hero-config", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin": "true" },
      body: JSON.stringify({
        title,
        subtitle,
        ctaLabel,
        ctaHref,
        backgroundMediaUrl: hero?.background_media_url ?? undefined,
        backgroundMediaType: hero?.background_media_type === "mp4" ? "mp4" : "image"
      })
    });
    const payload = await response.json().catch(() => null);
    setSaveStatus(response.ok ? "Hero copy saved." : payload?.error?.message ?? "Hero save failed.");
    if (response.ok) {
      loadHero();
      onUploadComplete?.();
    }
  };

  const heroUrl = hero?.background_media_url ?? null;
  const heroKind = detectMediaKind(heroUrl);

  return (
    <section className="media-sync-section-panel">
      <div className="media-sync-section-head">
        <div>
          <h2>Hero Section</h2>
          <p className="input-hint">Homepage hero — edit title, subtitle, CTA, then upload media through hero_config + hero_media routing.</p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={loadHero}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>
      <div className="media-sync-hero-stage card">
        {loading ? (
          <div className="empty-desc">Loading hero preview…</div>
        ) : heroUrl ? (
          <div className="media-sync-hero-visual media-sync-hero-visual-lg">
            {heroKind === "video_loop" || heroKind === "gif" ? (
              <video autoPlay loop muted playsInline src={heroUrl} />
            ) : (
              <img alt="" src={heroUrl} />
            )}
          </div>
        ) : (
          <div className="empty-desc">No hero media saved yet.</div>
        )}
        <form className="media-sync-hero-form" onSubmit={(event) => { event.preventDefault(); void saveCopy(); }}>
          <label className="input-group">
            <span className="input-label">Hero title</span>
            <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="input-group">
            <span className="input-label">Subtitle</span>
            <input className="input" value={subtitle} onChange={(event) => setSubtitle(event.target.value)} placeholder="Tagline under the hero title" />
          </label>
          <label className="input-group">
            <span className="input-label">CTA label</span>
            <input className="input" value={ctaLabel} onChange={(event) => setCtaLabel(event.target.value)} placeholder="Enter The Vault" />
          </label>
          <label className="input-group">
            <span className="input-label">CTA href</span>
            <input className="input" value={ctaHref} onChange={(event) => setCtaHref(event.target.value)} placeholder="/vault" />
          </label>
          <button type="submit" className="btn btn-primary btn-sm">Save hero copy</button>
          {saveStatus ? <p className="form-status">{saveStatus}</p> : null}
          <span className="release-meta">Updated {formatWhen(hero?.updated_at)}</span>
        </form>
      </div>
      <MediaUploadPanel draft={globalDraft("hero")} mode="hero" onUploadComplete={() => { loadHero(); onUploadComplete?.(); }} />
    </section>
  );
}


function VaultControlSection({ onUploadComplete }: { onUploadComplete?: () => void }) {
  return (
    <section className="media-sync-section-panel media-sync-vault-panel">
      <h2>Enter The Vault</h2>
      <p className="input-hint">Gated vault media — vault_media uploads sync to vault surfaces with entitlement routing.</p>
      <div className="media-sync-vault-gate card">
        <Radio size={18} />
        <div>
          <strong>Vault-exclusive delivery</strong>
          <span>Upload cinematic vault loops and visuals. Frontend vault gallery uses vault_media + vault routing.</span>
        </div>
      </div>
      <MediaUploadPanel draft={globalDraft("vault")} mode="vault" onUploadComplete={onUploadComplete} />
    </section>
  );
}

function RecentlyUpdatedSection({
  catalog,
  releases,
  onOpenRelease
}: {
  catalog: DurableCatalogRelease[];
  releases: ControlUiRelease[];
  onOpenRelease: (id: string) => void;
}) {
  const sorted = useMemo(() => {
    const byId = new Map(catalog.map((release) => [release.id, release]));
    return [...releases]
      .map((ui) => ({ ui, release: byId.get(ui.id) }))
      .filter((row): row is { ui: ControlUiRelease; release: DurableCatalogRelease } => !!row.release)
      .sort((a, b) => {
        const aTime = new Date(a.release.updatedAt ?? a.ui.updatedAt ?? 0).getTime();
        const bTime = new Date(b.release.updatedAt ?? b.ui.updatedAt ?? 0).getTime();
        return bTime - aTime;
      });
  }, [catalog, releases]);

  return (
    <section className="media-sync-section-panel">
      <h2>Recently Updated</h2>
      <p className="input-hint">Sorted by catalog updated_at — newest media activity first.</p>
      <div className="media-sync-recent-list">
        {sorted.map(({ ui, release }) => (
          <button key={release.id} type="button" className="media-sync-recent-row" onClick={() => onOpenRelease(release.id)}>
            <MediaVisualCard ui={ui} release={release} size="card" />
            <div>
              <strong>{ui.title}</strong>
              <span>{ui.type} · {formatWhen(release.updatedAt ?? ui.updatedAt)}</span>
            </div>
            <ChevronRight size={14} />
          </button>
        ))}
      </div>
    </section>
  );
}

function SyncStatusSection({ rows, onRefresh }: { rows: SyncStateRow[]; onRefresh: () => void }) {
  return (
    <section className="media-sync-section-panel">
      <div className="media-sync-section-head">
        <div>
          <h2>Sync Status</h2>
          <p className="input-hint">Live sync_state dirty flags from Supabase (migration 0013).</p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onRefresh}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>
      <div className="media-sync-sync-table card">
        {rows.length ? (
          rows.map((row) => (
            <div className="mvrow" key={row.key}>
              <strong>{row.key}</strong>
              <SyncStatusBadge dirty={row.dirty} />
              <span style={{ color: "var(--tx3)" }}>{formatWhen(row.updated_at ?? row.last_event_at)}</span>
            </div>
          ))
        ) : (
          <div className="empty-desc">No sync_state rows yet.</div>
        )}
      </div>
    </section>
  );
}

function UploadQueueSection() {
  const { items, clearCompleted } = useUploadQueue();
  return (
    <section className="media-sync-section-panel">
      <div className="media-sync-section-head">
        <div>
          <h2>Upload Queue</h2>
          <p className="input-hint">In-session uploads from the media control room (intent → complete).</p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={clearCompleted}>
          Clear completed
        </button>
      </div>
      <div className="media-sync-queue card">
        {items.length ? (
          items.map((item) => (
            <div className="mvrow" key={item.id}>
              <Upload size={14} />
              <strong>{item.label}</strong>
              <span className={`media-sync-queue-status media-sync-queue-${item.status}`}>{item.status}</span>
              <span style={{ color: "var(--tx3)" }}>{formatWhen(new Date(item.updatedAt).toISOString())}</span>
            </div>
          ))
        ) : (
          <div className="empty-desc">Queue is empty — uploads appear here while processing.</div>
        )}
      </div>
    </section>
  );
}

export function MediaSyncSidebar({
  release,
  activeSection
}: {
  release: DurableCatalogRelease;
  activeSection: MediaSectionId;
}) {
  const route = resolveMediaSyncRoute({
    relatedReleaseId: release.id,
    releaseType: release.releaseType as "single" | "album" | "ep" | undefined,
    releaseSlug: release.slug,
    mediaSection: activeSection
  });

  return (
    <aside className="media-sync-sidebar card">
      <h3>Sync Routing</h3>
      <div className="media-sync-kv">
        <span>Section</span>
        <strong>{mediaSectionLabel(activeSection)}</strong>
      </div>
      <div className="media-sync-kv">
        <span>Route</span>
        <strong>{route.frontendRoute}</strong>
      </div>
      <div className="media-sync-kv">
        <span>Targets</span>
        <ul>
          {route.frontendDestinations.map((destination) => (
            <li key={destination}>{destination}</li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

export function ReleaseMediaSyncWorkspace({
  release,
  ui,
  onClose,
  onUploadComplete,
  actions
}: {
  release: DurableCatalogRelease;
  ui: ControlUiRelease;
  onClose: () => void;
  onUploadComplete?: () => void;
  actions: ReleaseStudioActions;
}) {
  const [activeSection, setActiveSection] = useState<MediaSectionId>("cover");

  return (
    <div className="media-sync-workspace">
      <div className="row-between mb-16">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
          ← Back
        </button>
        <button type="button" className="btn btn-ghost btn-sm" disabled={actions.isBusy(release.id, "sync")} onClick={() => actions.sync(release.id)}>
          Sync frontend
        </button>
      </div>
      <div className="media-sync-layout">
        <nav className="media-sync-nav card">
          {releaseMediaWorkspaceSections.map((section) => (
            <button key={section} type="button" className={`nav-item${activeSection === section ? " active" : ""}`} onClick={() => setActiveSection(section)}>
              {mediaSectionLabel(section)}
            </button>
          ))}
        </nav>
        <main className="media-sync-main card">
          <h2 style={{ fontSize: 16, fontWeight: 800 }}>{ui.title}</h2>
          <p className="input-hint mb-16">{mediaSectionPurpose(activeSection)}</p>
          <MediaUploadPanel draft={releaseDraft(release)} mode={activeSection === "audio" || activeSection === "previews" ? "audio" : activeSection === "loops" || activeSection === "videos" ? "visual" : "artwork"} onUploadComplete={onUploadComplete} />
        </main>
        <MediaSyncSidebar release={release} activeSection={activeSection} />
      </div>
    </div>
  );
}

export function ReleaseWorkspaceSections(props: {
  release: DurableCatalogRelease;
  ui: ControlUiRelease;
  onOpenRelease: (releaseId: string) => void;
  actions: ReleaseStudioActions;
  onUploadComplete?: () => void;
  onEditMedia?: (releaseId: string) => void;
}) {
  return (
    <ReleaseControlCard
      release={props.release}
      ui={props.ui}
      syncRows={[]}
      onEdit={() => props.onEditMedia?.(props.release.id)}
      onOpenRelease={props.onOpenRelease}
      onUploadComplete={props.onUploadComplete}
      actions={props.actions}
    />
  );
}

export function MediaLibrary({
  catalog,
  releases,
  onOpenRelease,
  actions,
  onUploadComplete
}: {
  catalog: DurableCatalogRelease[];
  releases: ControlUiRelease[];
  onOpenRelease: (releaseId: string) => void;
  actions: ReleaseStudioActions;
  onUploadComplete: () => void;
}) {
  const [activeSection, setActiveSection] = useState<ControlRoomSectionId>("singles");
  const [editReleaseId, setEditReleaseId] = useState<string | null>(null);
  const [syncRows, setSyncRows] = useState<SyncStateRow[]>([]);

  const refreshSync = useCallback(() => {
    void fetch("/api/admin/sync-state", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        const rows = (payload as { data?: { rows?: SyncStateRow[] } }).data?.rows;
        if (rows) setSyncRows(rows);
      });
  }, []);

  useEffect(() => {
    refreshSync();
  }, [refreshSync]);

  useMediaSync(() => {
    onUploadComplete();
    refreshSync();
  });

  const editRelease = editReleaseId ? catalog.find((release) => release.id === editReleaseId) : null;
  const editUi = editReleaseId ? releases.find((release) => release.id === editReleaseId) : null;

  if (editRelease && editUi) {
    return (
      <ReleaseMediaSyncWorkspace
        release={editRelease}
        ui={editUi}
        onClose={() => setEditReleaseId(null)}
        onUploadComplete={() => {
          onUploadComplete();
          refreshSync();
        }}
        actions={actions}
      />
    );
  }

  return (
    <div className="media-control-room">
      <header className="media-control-room-header">
        <div>
          <h1>Media Control Room</h1>
          <p>Frontend sibling surfaces — release-centric, not a generic asset dump.</p>
        </div>
      </header>
      <nav className="media-sync-sticky-tabs" aria-label="Media sections">
        {controlRoomRootSections.map((section) => (
          <button
            key={section.id}
            type="button"
            className={`media-sync-sticky-tab${activeSection === section.id ? " active" : ""}`}
            onClick={() => setActiveSection(section.id)}
          >
            {section.label}
          </button>
        ))}
      </nav>
      <div className="media-sync-section-scroll">
        {activeSection === "singles" ? (
          <ReleaseManagementSection sectionTitle="Singles" catalog={catalog} releases={releases} filter={singlesFilter} syncRows={syncRows} onEdit={setEditReleaseId} onOpenRelease={onOpenRelease} onUploadComplete={onUploadComplete} actions={actions} />
        ) : null}
        {activeSection === "albums_eps" ? (
          <ReleaseManagementSection sectionTitle="Albums & EPs" catalog={catalog} releases={releases} filter={albumsFilter} syncRows={syncRows} onEdit={setEditReleaseId} onOpenRelease={onOpenRelease} onUploadComplete={onUploadComplete} actions={actions} />
        ) : null}
        {activeSection === "features" ? (
          <ReleaseManagementSection sectionTitle="Features" catalog={catalog} releases={releases} filter={featuresFilter} syncRows={syncRows} onEdit={setEditReleaseId} onOpenRelease={onOpenRelease} onUploadComplete={onUploadComplete} actions={actions} />
        ) : null}
        {activeSection === "hero" ? <HeroControlSection onUploadComplete={onUploadComplete} /> : null}
        {activeSection === "vault" ? <VaultControlSection onUploadComplete={onUploadComplete} /> : null}
        {activeSection === "audiovisuals" ? <AudioVisualsPanel embedded onUploadComplete={onUploadComplete} /> : null}
        {activeSection === "press_promo" ? (
          <section className="media-sync-section-panel">
            <h2>Press &amp; Promo</h2>
            <p className="input-hint">Press kits, promo stills, and campaign assets route to press surfaces.</p>
            <MediaUploadPanel draft={globalDraft("press")} mode="artwork" onUploadComplete={onUploadComplete} />
          </section>
        ) : null}
      </div>
    </div>
  );
}
