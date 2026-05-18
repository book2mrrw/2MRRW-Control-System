"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { BarChart3, Eye, Image, Music, Plus, Radio, Settings, Trash2, Upload } from "lucide-react";
import { releaseTypeLimits, useReleaseControl, type ControlRelease, type HeroConfig, type ReleaseType } from "@/components/control/ReleaseControlStore";

function Icon({ name, size = 20 }: { name: "plus" | "upload" | "image" | "music" | "chart" | "settings" | "trash" | "eye" | "radio"; size?: number }) {
  const icons = { plus: Plus, upload: Upload, image: Image, music: Music, chart: BarChart3, settings: Settings, trash: Trash2, eye: Eye, radio: Radio };
  const Component = icons[name];
  return <Component size={size} strokeWidth={2} />;
}

function EmptyPanel({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return (
    <section className="rc-empty panel">
      <span className="rc-empty-orb" aria-hidden="true">2M</span>
      <h2>{title}</h2>
      <p>{detail}</p>
      {action}
    </section>
  );
}

function ReleaseRow({ release }: { release: ControlRelease }) {
  const { publishRelease, unpublishRelease, deleteRelease } = useReleaseControl();
  return (
    <article className="rc-release-row">
      <span className="rc-cover" aria-hidden="true">{release.coverUrl ? "ART" : release.type.toUpperCase().slice(0, 2)}</span>
      <div>
        <strong>{release.title || "Untitled release"}</strong>
        <small>{release.type} / {release.tracks.length} tracks / {release.releaseDate || "Date unset"}</small>
      </div>
      <span className={`rc-badge ${release.status}`}>{release.status}</span>
      <div className="rc-row-actions">
        {release.status === "live" ? (
          <button type="button" onClick={() => unpublishRelease(release.id)}>Unpublish</button>
        ) : (
          <button type="button" onClick={() => publishRelease(release.id)}>Publish</button>
        )}
        <button type="button" onClick={() => deleteRelease(release.id)}><Icon name="trash" size={14} /> Delete</button>
      </div>
    </article>
  );
}

export function ToastStack() {
  const { toasts, dismissToast } = useReleaseControl();
  return (
    <div className="rc-toast-stack" aria-live="polite">
      {toasts.map((toast) => (
        <button key={toast.id} type="button" onClick={() => dismissToast(toast.id)}>{toast.message}</button>
      ))}
    </div>
  );
}

export function PublicSitePreview() {
  const { previewOpen, setPreviewOpen, releases, heroConfig } = useReleaseControl();
  const live = releases.filter((release) => release.status === "live");
  if (!previewOpen) return null;
  return (
    <div className="rc-preview-modal" role="dialog" aria-modal="true" aria-label="Live site preview">
      <div className="rc-preview-shell">
        <header>
          <strong>2MRRW public preview</strong>
          <button type="button" onClick={() => setPreviewOpen(false)}>Close</button>
        </header>
        <section className="rc-public-hero">
          <p>Live Site Preview</p>
          <h1>{heroConfig.title || live[0]?.title || "No live hero yet"}</h1>
          <span>{heroConfig.subtitle || "Publish a release or save hero media to preview the public surface."}</span>
          {heroConfig.ctaLabel ? <button type="button">{heroConfig.ctaLabel}</button> : null}
        </section>
        <section className="rc-public-grid">
          {live.length ? live.map((release) => (
            <article key={release.id}>
              <span>{release.type}</span>
              <strong>{release.title}</strong>
              <small>{release.tracks.length} tracks</small>
            </article>
          )) : <p>No live releases yet.</p>}
        </section>
      </div>
    </div>
  );
}

export function DashboardView() {
  const { releases, log } = useReleaseControl();
  const live = releases.filter((release) => release.status === "live");
  return (
    <div className="rc-page">
      <header className="rc-hero panel">
        <p>2MRRW — Release Control System</p>
        <h1>{releases.length ? "Release control is live." : "Start from a clean release system."}</h1>
        <span>{releases.length ? `${live.length} live / ${releases.length} total releases` : "No NEBULA cards. No hardcoded releases. Create the first backend draft."}</span>
      </header>
      <section className="rc-stats">
        <article><span>Total releases</span><strong>{releases.length}</strong></article>
        <article><span>Live releases</span><strong>{live.length}</strong></article>
        <article><span>Drafts</span><strong>{releases.length - live.length}</strong></article>
        <article><span>Actions logged</span><strong>{log.length}</strong></article>
      </section>
      {releases.length ? (
        <section className="panel rc-stack">
          <h2>Recent releases</h2>
          {releases.slice(0, 4).map((release) => <ReleaseRow key={release.id} release={release} />)}
        </section>
      ) : (
        <EmptyPanel title="No releases yet" detail="Create a single, EP, album, or deluxe release to populate this control system." action={<a className="rc-primary" href="/releases/new"><Icon name="plus" /> New Release</a>} />
      )}
      <section className="panel rc-stack">
        <h2>Action log</h2>
        {log.length ? log.map((item) => <span className="rc-log" key={item}>{item}</span>) : <span className="rc-muted">No actions yet.</span>}
      </section>
    </div>
  );
}

export function ReleasesView() {
  const { releases } = useReleaseControl();
  const [tab, setTab] = useState<"all" | "live" | "draft">("all");
  const visible = releases.filter((release) => tab === "all" ? true : release.status === tab);
  return (
    <div className="rc-page">
      <div className="rc-header-row">
        <div><p className="meta-label">Discography</p><h1>Releases</h1></div>
        <a className="rc-primary" href="/releases/new"><Icon name="plus" /> New Release</a>
      </div>
      <div className="rc-tabs">
        {(["all", "live", "draft"] as const).map((item) => <button key={item} type="button" data-active={tab === item} onClick={() => setTab(item)}>{item}</button>)}
      </div>
      <section className="panel rc-stack">
        {visible.length ? visible.map((release) => <ReleaseRow key={release.id} release={release} />) : <EmptyPanel title="Nothing here yet" detail="This tab will populate from your in-memory release store." />}
      </section>
    </div>
  );
}

export function ReleaseEditorView() {
  const { createRelease, publishRelease } = useReleaseControl();
  const [step, setStep] = useState(0);
  const [type, setType] = useState<ReleaseType>("single");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("2MRRW");
  const [releaseDate, setReleaseDate] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [trackTitles, setTrackTitles] = useState<string[]>([""]);
  const [lastReleaseId, setLastReleaseId] = useState<string | null>(null);
  const [minTracks, maxTracks] = releaseTypeLimits[type];
  const steps = ["Type", "Details", "Tracks", "Artwork", "Publish"];

  function enforceTrackCount(nextType: ReleaseType) {
    const [min, max] = releaseTypeLimits[nextType];
    setTrackTitles((current) => {
      const resized = current.slice(0, max);
      while (resized.length < min) resized.push("");
      return resized;
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const tracks = trackTitles.slice(0, maxTracks).map((trackTitle, index) => ({ id: `track_${index + 1}`, title: trackTitle || `Track ${index + 1}`, credits: "", audioFile: "" }));
    const release = createRelease({ type, title, artist, releaseDate, coverUrl, youtubeUrl, tracks });
    setLastReleaseId(release.id);
  }

  return (
    <form className="rc-page" onSubmit={submit}>
      <div className="rc-header-row"><div><p className="meta-label">Five-step flow</p><h1>New / Edit Release</h1></div></div>
      <nav className="rc-stepbar">
        {steps.map((label, index) => <button key={label} type="button" data-active={step === index} onClick={() => setStep(index)}><span>{index + 1}</span>{label}</button>)}
      </nav>
      <section className="panel rc-editor">
        {step === 0 ? (
          <div className="rc-type-grid">
            {(["single", "ep", "album", "deluxe"] as ReleaseType[]).map((item) => (
              <button key={item} type="button" data-active={type === item} onClick={() => { setType(item); enforceTrackCount(item); }}>
                <strong>{item}</strong><span>{releaseTypeLimits[item][0]}-{releaseTypeLimits[item][1]} tracks</span>
              </button>
            ))}
          </div>
        ) : null}
        {step === 1 ? (
          <div className="rc-form-grid">
            <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Release title" /></label>
            <label>Artist<input value={artist} onChange={(event) => setArtist(event.target.value)} /></label>
            <label>Release Date<input type="date" value={releaseDate} onChange={(event) => setReleaseDate(event.target.value)} /></label>
          </div>
        ) : null}
        {step === 2 ? (
          <div className="rc-stack">
            <p className="rc-muted">{type} requires {minTracks}-{maxTracks} tracks.</p>
            {trackTitles.map((track, index) => <input key={index} value={track} onChange={(event) => setTrackTitles((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder={`Track ${index + 1}`} />)}
            <button type="button" disabled={trackTitles.length >= maxTracks} onClick={() => setTrackTitles((current) => [...current, ""])}>Add Track</button>
          </div>
        ) : null}
        {step === 3 ? (
          <div className="rc-form-grid">
            <label>Cover / MP4 URL<input value={coverUrl} onChange={(event) => setCoverUrl(event.target.value)} placeholder="Image or MP4 URL" /></label>
            <label>YouTube URL<input value={youtubeUrl} onChange={(event) => setYoutubeUrl(event.target.value)} placeholder="https://youtube.com/..." /></label>
            <div className="rc-upload-zone"><Icon name="upload" /> Upload zones use local UI state in this restored backend preview.</div>
          </div>
        ) : null}
        {step === 4 ? (
          <div className="rc-stack">
            <h2>{title || "Untitled release"}</h2>
            <p>{type} / {trackTitles.length} tracks / {releaseDate || "date unset"}</p>
            <button className="rc-primary" type="submit">Save Draft</button>
            {lastReleaseId ? <button type="button" onClick={() => publishRelease(lastReleaseId)}>Publish Release</button> : null}
          </div>
        ) : null}
      </section>
    </form>
  );
}

export function MediaLibraryView() {
  const { releases, updateMedia } = useReleaseControl();
  return (
    <div className="rc-page">
      <div className="rc-header-row"><div><p className="meta-label">Media Library</p><h1>Release media</h1></div></div>
      <section className="panel rc-stack">
        {releases.length ? releases.map((release) => (
          <article className="rc-media-card" key={release.id}>
            <strong>{release.title}</strong>
            <input placeholder="Cover or MP4 replacement URL" defaultValue={release.coverUrl} onBlur={(event) => updateMedia(release.id, { coverUrl: event.target.value })} />
            <input placeholder="Audio replacement file label" defaultValue={release.tracks[0]?.audioFile} onBlur={(event) => updateMedia(release.id, { audioFile: event.target.value })} />
            <input placeholder="YouTube URL" defaultValue={release.youtubeUrl} onBlur={(event) => updateMedia(release.id, { youtubeUrl: event.target.value })} />
          </article>
        )) : <EmptyPanel title="No release media yet" detail="Create a release, then attach cover art, audio, and YouTube URLs here." />}
      </section>
    </div>
  );
}

export function HeroEditorView() {
  const { heroConfig, updateHero } = useReleaseControl();
  const [form, setForm] = useState<HeroConfig>(heroConfig);
  return (
    <div className="rc-page">
      <div className="rc-header-row"><div><p className="meta-label">Hero Editor</p><h1>Homepage hero</h1></div></div>
      <section className="rc-hero-editor">
        <form className="panel rc-form-grid" onSubmit={(event) => { event.preventDefault(); updateHero(form); }}>
          <label>Title<input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></label>
          <label>Subtitle<input value={form.subtitle} onChange={(event) => setForm((current) => ({ ...current, subtitle: event.target.value }))} /></label>
          <label>CTA Label<input value={form.ctaLabel} onChange={(event) => setForm((current) => ({ ...current, ctaLabel: event.target.value }))} /></label>
          <label>CTA URL<input value={form.ctaHref} onChange={(event) => setForm((current) => ({ ...current, ctaHref: event.target.value }))} /></label>
          <label>Background URL<input value={form.backgroundUrl} onChange={(event) => setForm((current) => ({ ...current, backgroundUrl: event.target.value }))} /></label>
          <label>Background Type<select value={form.backgroundType} onChange={(event) => setForm((current) => ({ ...current, backgroundType: event.target.value as HeroConfig["backgroundType"] }))}><option value="image">Image</option><option value="video">MP4 / video</option></select></label>
          <button className="rc-primary" type="submit">Save Hero</button>
        </form>
        <aside className="panel rc-hero-preview">
          <p>Preview</p>
          <h2>{form.title || "Hero title empty"}</h2>
          <span>{form.subtitle || "Hero subtitle empty"}</span>
          {form.ctaLabel ? <button type="button">{form.ctaLabel}</button> : null}
        </aside>
      </section>
    </div>
  );
}

export function AnalyticsView() {
  const { releases } = useReleaseControl();
  const live = releases.filter((release) => release.status === "live");
  return (
    <div className="rc-page">
      <div className="rc-header-row"><div><p className="meta-label">Analytics</p><h1>Performance</h1></div></div>
      {live.length ? <section className="rc-stats"><article><span>Live releases</span><strong>{live.length}</strong></article><article><span>Tracks</span><strong>{live.reduce((sum, release) => sum + release.tracks.length, 0)}</strong></article></section> : <EmptyPanel title="Analytics empty" detail="Analytics render after releases go live." action={<Icon name="chart" size={40} />} />}
    </div>
  );
}

export function ShopView() {
  return (
    <div className="rc-page">
      <div className="rc-header-row">
        <div>
          <p className="meta-label">Merch Analytics</p>
          <h1>Shop</h1>
          <span>Merch performance and revenue insights. No storefront management here.</span>
        </div>
      </div>
      <section className="rc-stats">
        <article><span>Revenue</span><strong>$0</strong></article>
        <article><span>Orders</span><strong>0</strong></article>
        <article><span>Conversion</span><strong>0%</strong></article>
        <article><span>Top Item</span><strong>-</strong></article>
      </section>
      <EmptyPanel
        title="No merch analytics yet"
        detail="Connect merch sales data to track revenue, top items, conversion, and fulfillment performance."
      />
    </div>
  );
}

export function SettingsView() {
  return (
    <div className="rc-page">
      <div className="rc-header-row"><div><p className="meta-label">Settings</p><h1>Profile and system</h1></div></div>
      <section className="panel rc-form-grid">
        <label>Artist Name<input defaultValue="2MRRW" /></label>
        <label>System Title<input defaultValue="2MRRW — Release Control System" /></label>
        <label>Timezone<input defaultValue="America/Chicago" /></label>
      </section>
    </div>
  );
}
