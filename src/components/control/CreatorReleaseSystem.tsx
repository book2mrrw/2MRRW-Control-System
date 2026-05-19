"use client";

import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MoreHorizontal,
  CircleAlert,
  CloudUpload,
  Eye,
  GripVertical,
  Info,
  LayoutDashboard,
  List,
  Package,
  Pencil,
  Plus,
  Rocket,
  Save,
  Search,
  Settings,
  ShoppingBag,
  Trash2,
  Upload,
  Video
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  fetchControlCatalogReleases,
  mapCatalogReleasesToUi,
  type ControlUiRelease,
  type DurableCatalogRelease
} from "@/services/catalog/controlCatalogClient";
import { ReleaseMediaCard } from "@/components/media/ReleaseMediaCard";
import {
  archiveReleaseAction,
  duplicateReleaseAction,
  publishReleaseAction,
  recoverReleaseAction,
  syncReleaseToFrontendAction,
  unpublishReleaseAction,
  type ReleaseReadinessCheck
} from "@/services/catalog/releaseActionsClient";
import { ReleaseScheduleSection, type ReleaseScheduleValue } from "@/components/control/ReleaseScheduleSection";
import {
  createReleaseDraft,
  patchReleaseMetadata,
  patchReleaseTrack,
  scheduleReleaseAction
} from "@/services/catalog/releaseStudioClient";
import { MediaLibrary, ReleaseWorkspaceSections } from "@/components/control/MediaSyncWorkspace";

type Page = "dashboard" | "releases" | "media" | "analytics" | "shop" | "settings" | "flow" | "release-detail";
type ReleaseTypeId = "single" | "ep" | "album" | "deluxe";
type BadgeVariant = "ok" | "pri" | "warn" | "muted" | "err";
type ButtonVariant = "primary" | "secondary" | "ghost" | "success" | "danger";

type Release = ControlUiRelease;

type Track = {
  id: number;
  num: number;
  title: string;
  dur: string;
  explicit: boolean;
  isrc: string;
};

type ReleaseData = {
  title: string;
  artist: string;
  date: string;
  genre: string;
  genre2: string;
  language: string;
  notes: string;
};

type Credits = Record<string, string>;

const RELEASE_TYPES = [
  { id: "single", icon: "♪", label: "Single", count: "1 Track", desc: "A focused, impactful release. One song, one moment." },
  { id: "ep", icon: "◎", label: "EP", count: "2 - 6 Tracks", desc: "A compact collection. Ideal for building momentum fast." },
  { id: "album", icon: "◉", label: "Album", count: "7+ Tracks", desc: "Your full artistic statement. The complete vision." },
  { id: "deluxe", icon: "★", label: "Deluxe Album", count: "Album + bonus", desc: "Extended edition with exclusive bonus tracks and content." }
] satisfies Array<{ id: ReleaseTypeId; icon: string; label: string; count: string; desc: string }>;

const INITIAL_TRACKS: Track[] = [{ id: 1, num: 1, title: "", dur: "0:00", explicit: false, isrc: "" }];

const GENRES = ["Hip-Hop/Rap", "R&B/Soul", "Pop", "Electronic", "Alternative", "Rock", "Jazz", "Classical", "Country", "Latin", "Reggae", "Gospel", "Blues", "Folk", "Funk", "Afrobeats", "Trap", "Drill"];
const LANGUAGES = ["English", "Spanish", "French", "Portuguese", "German", "Japanese", "Korean", "Arabic", "Hindi", "Italian", "Russian"];
const STORES = ["Spotify", "Apple Music", "TuneCore", "Amazon Music", "YouTube Music", "Tidal", "Deezer", "Pandora", "SoundCloud", "Beatport", "Audiomack", "Boomplay"];

const ACTIVITY: Array<{ id: number; text: string; time: string; color: string }> = [];

const TOP_TRACKS: Array<{ title: string; streams: number; pct: number }> = [];
const MEDIA_ACCEPT = ".jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.webm,.wav,.mp3,.flac,.aac,image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm,audio/wav,audio/mpeg,audio/flac,audio/aac";

const STEP_NAMES = ["Choose Type", "Release Details", "Tracks & Credits", "Artwork & Media", "Review & Publish"];

const NAV_ITEMS = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { id: "releases", icon: Package, label: "Releases", badge: 1 },
  { id: "media", icon: Camera, label: "Media" },
  { id: "analytics", icon: BarChart3, label: "Analytics" },
  { id: "shop", icon: ShoppingBag, label: "Shop" }
] satisfies Array<{ id: Exclude<Page, "settings" | "flow">; icon: typeof LayoutDashboard; label: string; badge?: number }>;

const RELEASE_TYPE_TAB_MAP: Record<string, Release["type"] | "AlbumOrEp"> = {
  Albums: "AlbumOrEp",
  Singles: "Single",
  EPs: "EP"
};
type AlbumOrEp = "AlbumOrEp";

const PAGE_TITLES: Record<Page, string> = {
  dashboard: "Dashboard",
  releases: "Releases",
  media: "Media Library",
  analytics: "Analytics",
  shop: "Shop",
  settings: "Settings",
  flow: "New Release",
  "release-detail": "Release"
};

const PAGE_ROUTES: Partial<Record<Page, string>> = {
  dashboard: "/dashboard",
  releases: "/releases",
  media: "/media",
  analytics: "/analytics",
  shop: "/shop",
  settings: "/settings",
  flow: "/releases/new"
};

function releaseIdFromPathname(pathname: string) {
  const match = /^\/releases\/([^/]+)$/.exec(pathname);
  if (!match || match[1] === "new" || match[1] === "drafts" || match[1] === "published" || match[1] === "scheduled" || match[1] === "archived") {
    return null;
  }
  return match[1];
}

function pageFromPathname(pathname: string): Page {
  if (pathname === "/" || pathname.startsWith("/dashboard")) return "dashboard";
  if (pathname.startsWith("/releases/new")) return "flow";
  if (releaseIdFromPathname(pathname)) return "release-detail";
  if (pathname.startsWith("/releases")) return "releases";
  if (pathname.startsWith("/media")) return "media";
  if (pathname.startsWith("/analytics")) return "analytics";
  if (pathname.startsWith("/shop")) return "shop";
  if (pathname.startsWith("/settings")) return "settings";
  return "dashboard";
}

const fmtNum = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n));
const fmtBytes = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

function Icon({ icon: IconComponent, size = 16 }: { icon: typeof LayoutDashboard; size?: number }) {
  return <IconComponent size={size} strokeWidth={2} aria-hidden="true" />;
}

function Btn({
  children,
  variant = "ghost",
  size = "",
  onClick,
  style = {},
  disabled = false,
  type = "button",
  className = ""
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: "icon" | "sm" | "lg" | "";
  onClick?: () => void;
  style?: CSSProperties;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <button type={type} className={`btn btn-${variant}${size ? ` btn-${size}` : ""} ${className}`.trim()} onClick={onClick} style={style} disabled={disabled}>
      {children}
    </button>
  );
}

function Badge({ variant = "muted", children }: { variant?: BadgeVariant; children: ReactNode }) {
  const map: Record<BadgeVariant, string> = { ok: "badge-ok", pri: "badge-pri", warn: "badge-warn", muted: "badge-muted", err: "badge-err" };
  return <span className={`badge ${map[variant]}`}>{children}</span>;
}

function StatusBadge({ status }: { status: Release["status"] | "Scheduled" }) {
  const map: Partial<Record<Release["status"], BadgeVariant>> = { Released: "ok", Scheduled: "pri", Draft: "warn", Rejected: "err" };
  return <Badge variant={map[status as Release["status"]] ?? "muted"}>{status}</Badge>;
}

function Div({ margin = "20px 0" }: { margin?: string }) {
  return <hr className="divider" style={{ margin }} />;
}

function Progress({ value, variant = "", style = {} }: { value: number; variant?: string; style?: CSSProperties }) {
  return (
    <div className="progress-bar" style={style}>
      <div className={`progress-fill ${variant}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

function Cover({
  emoji,
  grad,
  size = "md",
  imageUrl,
  loopUrl,
  posterUrl,
  primaryAsset,
  slug
}: {
  emoji: string;
  grad: string;
  size?: "sm" | "md" | "lg" | "xl";
  imageUrl?: string | null;
  loopUrl?: string | null;
  posterUrl?: string | null;
  primaryAsset?: import("@/services/catalog/controlCatalogClient").ReleasePrimaryAsset | null;
  slug?: string;
}) {
  return (
    <ReleaseMediaCard
      alt=""
      className={`release-cover cover-${size}`}
      coverUrl={posterUrl ?? imageUrl}
      emoji={emoji}
      grad={grad}
      lazy
      loopUrl={loopUrl}
      motionUrl={loopUrl}
      posterUrl={posterUrl}
      primaryAsset={primaryAsset}
      slug={slug}
    />
  );
}

function formatDuration(seconds: number) {
  if (!seconds) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

type StudioToast = { tone: "ok" | "err"; message: string; checklist?: ReleaseReadinessCheck[] };

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

function StudioToastBanner({ toast }: { toast: StudioToast | null }) {
  if (!toast) return null;
  const failedChecks = toast.checklist?.filter((check) => !check.passed) ?? [];
  const bannerStyle =
    toast.tone === "err"
      ? { background: "var(--err-bg)", borderColor: "rgba(239,68,68,.2)", color: "var(--err)" }
      : undefined;

  return (
    <div className="success-banner mb-16" style={bannerStyle} role="status">
      <div>{toast.message}</div>
      {failedChecks.length ? (
        <ul style={{ margin: "10px 0 0", paddingLeft: 18, fontSize: 12, lineHeight: 1.6 }}>
          {failedChecks.map((check) => (
            <li key={check.key}>
              <strong>{check.key.replaceAll("_", " ")}:</strong> {check.message}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function useReleaseStudioActions(
  onRefresh: () => void,
  showToast: (message: string, tone?: StudioToast["tone"], checklist?: ReleaseReadinessCheck[]) => void,
  onOpenRelease?: (releaseId: string) => void
) {
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const run = useCallback(
    async (
      releaseId: string,
      action: string,
      request: () => Promise<{ ok: boolean; error?: string; checks?: ReleaseReadinessCheck[] }>,
      successMessage: string
    ) => {
      const key = `${action}:${releaseId}`;
      setBusyKey(key);
      try {
        const result = await request();
        if (result.ok) {
          showToast(successMessage);
          onRefresh();
        } else {
          showToast(result.error ?? "Action failed", "err", result.checks);
        }
      } finally {
        setBusyKey(null);
      }
    },
    [onRefresh, showToast]
  );

  const actions = useMemo<ReleaseStudioActions>(
    () => ({
      busyKey,
      isBusy: (releaseId, action) => busyKey === `${action}:${releaseId}`,
      publish: (releaseId) => void run(releaseId, "publish", () => publishReleaseAction(releaseId), "Release published"),
      unpublish: (releaseId) => void run(releaseId, "unpublish", () => unpublishReleaseAction(releaseId), "Release unpublished"),
      archive: (releaseId) => void run(releaseId, "archive", () => archiveReleaseAction(releaseId), "Release archived"),
      recover: (releaseId) => void run(releaseId, "recover", () => recoverReleaseAction(releaseId), "Release recovered"),
      duplicate: (releaseId) =>
        void run(releaseId, "duplicate", async () => {
          const result = await duplicateReleaseAction(releaseId);
          if (result.ok && result.data?.id) {
            onOpenRelease?.(result.data.id);
          }
          return result;
        }, "Release duplicated"),
      sync: (releaseId) => void run(releaseId, "sync", () => syncReleaseToFrontendAction(releaseId), "Frontend sync queued")
    }),
    [busyKey, onOpenRelease, run]
  );

  return actions;
}

function IG({ label, required, hint, children, style = {} }: { label?: string; required?: boolean; hint?: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="input-group" style={style}>
      {label ? (
        <label className="input-label">
          {label}
          {required ? <span className="req"> *</span> : null}
        </label>
      ) : null}
      {children}
      {hint ? <p className="input-hint">{hint}</p> : null}
    </div>
  );
}

function Sidebar({
  active,
  onNav,
  collapsed,
  onToggle,
  releaseCount
}: {
  active: Page;
  onNav: (page: Page) => void;
  collapsed: boolean;
  onToggle: () => void;
  releaseCount: number;
}) {
  return (
    <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>
      <div className="sb-logo">
        <div className="sb-mark">2M</div>
        <div className="sb-wordmark">
          <div className="sb-name">2MRRW</div>
          <div className="sb-sub">Creator Studio</div>
        </div>
      </div>
      <nav className="sb-nav">
        <div className="sb-section">Main</div>
        {NAV_ITEMS.map((item) => (
          <button key={item.id} className={`nav-item${active === item.id ? " active" : ""}`} onClick={() => onNav(item.id)} title={collapsed ? item.label : undefined} type="button">
            <span className="nav-icon">
              <Icon icon={item.icon} size={17} />
            </span>
            <span className="nav-label">{item.label}</span>
            {item.id === "releases" && releaseCount > 0 ? <span className="nav-badge">{releaseCount}</span> : item.badge ? <span className="nav-badge">{item.badge}</span> : null}
          </button>
        ))}
        <div className="sb-section" style={{ marginTop: 8 }}>
          System
        </div>
        <button className={`nav-item${active === "settings" ? " active" : ""}`} onClick={() => onNav("settings")} title={collapsed ? "Settings" : undefined} type="button">
          <span className="nav-icon">
            <Settings size={17} strokeWidth={2} aria-hidden="true" />
          </span>
          <span className="nav-label">Settings</span>
        </button>
      </nav>
      <div className="sb-footer">
        <div className="sb-profile">
          <div className="avatar">2M</div>
          <div>
            <div className="profile-name">2MRRW</div>
            <div className="profile-role">Artist · Independent</div>
          </div>
        </div>
        <button className="collapse-btn" onClick={onToggle} type="button">
          <span className="nav-icon">{collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}</span>
          <span className="nav-label">{collapsed ? "Expand" : "Collapse"}</span>
        </button>
      </div>
    </aside>
  );
}

function TopBar({ title, onNewRelease }: { title: string; onNewRelease: () => void }) {
  return (
    <div className="topbar">
      <span className="topbar-title">{title}</span>
      <div className="topbar-right">
        <div style={{ position: "relative", display: "inline-flex" }}>
          <Btn variant="ghost" size="icon">
            <Bell size={16} />
          </Btn>
          <div className="notif-dot" />
        </div>
        <Btn variant="ghost" size="icon">
          <Search size={16} />
        </Btn>
        <Btn variant="primary" onClick={onNewRelease}>
          <Plus size={15} /> New Release
        </Btn>
      </div>
    </div>
  );
}

function Dashboard({
  onNewRelease,
  onNav,
  releases
}: {
  onNewRelease: () => void;
  onNav: (page: Page) => void;
  releases: Release[];
}) {
  const nextRelease = releases[0];
  return (
    <div className="content">
      <div className="mb-20">
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.5px", marginBottom: 5 }}>Welcome back, 2MRRW</h1>
        <p style={{ color: "var(--tx3)", fontSize: 13 }}>
          {releases.length ? "Your Supabase catalog is connected to the control surface." : "Upload your first release to begin syncing live content."}
        </p>
      </div>
      <div className="card card-highlight mb-16" style={{ display: "flex", alignItems: "center", gap: 20, padding: "18px 22px" }}>
        <Cover emoji={nextRelease?.emoji ?? "2M"} grad={nextRelease?.grad ?? "135deg,#111827,#374151"} size="lg" imageUrl={nextRelease?.coverUrl} loopUrl={nextRelease?.loopUrl} posterUrl={nextRelease?.posterUrl} primaryAsset={nextRelease?.primaryAsset} slug={nextRelease?.slug} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "1.2px", color: "var(--pri)", marginBottom: 4 }}>NEXT RELEASE</div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.5px", marginBottom: 3 }}>{nextRelease?.title ?? "No release yet"}</div>
          <div style={{ fontSize: 12, color: "var(--tx3)", marginBottom: 12 }}>
            {nextRelease ? `${nextRelease.type} · ${nextRelease.date}` : "Your first release will appear here."}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Progress value={nextRelease ? 83 : 0} style={{ flex: 1 }} />
            <span style={{ fontSize: 12, color: "var(--tx3)", whiteSpace: "nowrap" }}>{nextRelease ? "83% complete" : "0% complete"}</span>
          </div>
        </div>
        <div className="col gap-8">
          <Btn variant="primary" onClick={onNewRelease}>
            Continue →
          </Btn>
          <Btn variant="ghost" size="sm" style={{ justifyContent: "center" }}>
            <Eye size={13} /> Preview
          </Btn>
        </div>
      </div>
      <div className="grid-4 mb-16">
        {[
          { label: "Total Streams", val: "0", change: "No analytics yet", up: null, color: "var(--pri)" },
          { label: "Monthly Listeners", val: "0", change: "No listeners yet", up: null, color: "var(--tx)" },
          { label: "Total Releases", val: String(releases.length), change: "All time", up: null, color: "var(--tx)" },
          { label: "Countries", val: "0", change: "No country data yet", up: null, color: "var(--tx)" }
        ].map((s, i) => (
          <div className="card" style={{ padding: "16px 18px" }} key={i}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-val" style={{ color: s.color }}>
              {s.val}
            </div>
            <div className={`stat-change ${s.up === true ? "stat-up" : s.up === false ? "stat-down" : "stat-neutral"}`}>{s.change}</div>
          </div>
        ))}
      </div>
      <div className="grid-2">
        <div className="card">
          <div className="row-between mb-16">
            <span style={{ fontSize: 15, fontWeight: 700 }}>Recent Activity</span>
            <span style={{ fontSize: 12, color: "var(--tx3)" }}>Last 7 days</span>
          </div>
          {ACTIVITY.length ? ACTIVITY.map((a) => (
            <div className="activity-item" key={a.id}>
              <div className="activity-dot" style={{ background: a.color }} />
              <span className="activity-text">{a.text}</span>
              <span className="activity-time">{a.time}</span>
            </div>
          )) : <div className="empty-desc">No recent activity yet.</div>}
          <Div margin="16px 0" />
          <Btn variant="ghost" style={{ width: "100%" }}>
            <List size={14} /> View all activity
          </Btn>
        </div>
        <div className="card col">
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Quick Actions</div>
          <p style={{ fontSize: 13, color: "var(--tx2)", lineHeight: 1.7, marginBottom: 20 }}>
            Publish music in minutes. Our step-by-step guided flow handles everything — details, tracks, artwork, and distribution.
          </p>
          <div className="col gap-8 mt-auto">
            <Btn variant="primary" onClick={onNewRelease} style={{ width: "100%" }}>
              <Plus size={15} /> Start New Release
            </Btn>
            <Btn variant="ghost" onClick={() => onNav("releases")} style={{ width: "100%" }}>
              <Package size={15} /> View Discography
            </Btn>
            <Btn variant="ghost" onClick={() => onNav("analytics")} style={{ width: "100%" }}>
              <BarChart3 size={15} /> View Analytics
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReleaseOverflowMenu({
  releaseId,
  status,
  onOpenRelease,
  actions
}: {
  releaseId: string;
  status: Release["status"];
  onOpenRelease: (releaseId: string) => void;
  actions: ReleaseStudioActions;
}) {
  const archived = status === "Rejected";
  const canPublish = status === "Draft" || status === "Scheduled";
  const canUnpublish = status === "Released";
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <Btn variant="ghost" size="icon" onClick={() => setOpen((value) => !value)} aria-label="Release actions">
        <MoreHorizontal size={14} />
      </Btn>
      {open ? (
        <div className="card" style={{ position: "absolute", right: 0, top: "100%", zIndex: 20, minWidth: 168, padding: 6, marginTop: 4 }}>
          <button type="button" className="nav-item" style={{ width: "100%" }} onClick={() => { setOpen(false); onOpenRelease(releaseId); }}>
            Manage release
          </button>
          {archived ? (
            <button type="button" className="nav-item" style={{ width: "100%" }} disabled={actions.isBusy(releaseId, "recover")} onClick={() => { setOpen(false); actions.recover(releaseId); }}>
              Recover
            </button>
          ) : (
            <>
              {canPublish ? (
                <button type="button" className="nav-item" style={{ width: "100%" }} disabled={actions.isBusy(releaseId, "publish")} onClick={() => { setOpen(false); actions.publish(releaseId); }}>
                  Publish
                </button>
              ) : null}
              {canUnpublish ? (
                <button type="button" className="nav-item" style={{ width: "100%" }} disabled={actions.isBusy(releaseId, "unpublish")} onClick={() => { setOpen(false); actions.unpublish(releaseId); }}>
                  Unpublish
                </button>
              ) : null}
              <button type="button" className="nav-item" style={{ width: "100%" }} disabled={actions.isBusy(releaseId, "archive")} onClick={() => { setOpen(false); actions.archive(releaseId); }}>
                Archive
              </button>
            </>
          )}
          <button type="button" className="nav-item" style={{ width: "100%" }} disabled={actions.isBusy(releaseId, "duplicate")} onClick={() => { setOpen(false); actions.duplicate(releaseId); }}>
            Duplicate
          </button>
          <button type="button" className="nav-item" style={{ width: "100%" }} disabled={actions.isBusy(releaseId, "sync")} onClick={() => { setOpen(false); actions.sync(releaseId); }}>
            Sync frontend
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Releases({
  onNewRelease,
  releases,
  onOpenRelease,
  actions
}: {
  onNewRelease: () => void;
  releases: Release[];
  onOpenRelease: (releaseId: string) => void;
  actions: ReleaseStudioActions;
}) {
  const [tab, setTab] = useState("All");
  const tabs = ["All", "Albums & EPs", "Singles", "Drafts"];
  const filtered = useMemo(() => {
    if (tab === "All") return releases;
    if (tab === "Drafts") return releases.filter((release) => release.status === "Draft" || release.status === "Scheduled");
    if (tab === "Albums & EPs") return releases.filter((r) => r.type === "Album" || r.type === "EP" || r.type === "Deluxe");
    if (tab === "Singles") return releases.filter((r) => r.type === "Single");
    return releases;
  }, [releases, tab]);
  return (
    <div className="content">
      <div className="row-between mb-20">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.5px", marginBottom: 4 }}>Releases</h1>
          <p style={{ fontSize: 13, color: "var(--tx3)" }}>Your complete discography — {releases.length} releases</p>
        </div>
        <Btn variant="primary" onClick={onNewRelease}>
          <Plus size={15} /> Add Release
        </Btn>
      </div>
      <div className="tab-bar mb-20" style={{ width: "fit-content" }}>
        {tabs.map((t) => (
          <button key={t} className={`tab${tab === t ? " active" : ""}`} onClick={() => setTab(t)} type="button">
            {t}
          </button>
        ))}
      </div>
      <div className="card" style={{ padding: "6px" }}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <Package size={44} style={{ display: "block", margin: "0 auto 16px", color: "var(--bord3)" }} />
            <div className="empty-title">No {tab.toLowerCase()} yet</div>
            <div className="empty-desc">Start a new release to add one here.</div>
          </div>
        ) : (
          filtered.map((r) => (
            <div
              className="release-row"
              key={r.id}
              onClick={() => onOpenRelease(r.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && onOpenRelease(r.id)}
            >
              <Cover emoji={r.emoji} grad={r.grad} size="md" imageUrl={r.coverUrl} loopUrl={r.loopUrl} posterUrl={r.posterUrl} primaryAsset={r.primaryAsset} slug={r.slug} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="release-title">{r.title}</div>
                <div className="release-meta">
                  {r.type} · {r.date} · {r.tracks} track{r.tracks !== 1 ? "s" : ""}
                </div>
              </div>
              <div className="row gap-8" onClick={(e) => e.stopPropagation()}>
                <StatusBadge status={r.status} />
                <Btn variant="ghost" size="sm" onClick={() => onOpenRelease(r.id)}>
                  <Pencil size={12} /> Edit
                </Btn>
                <ReleaseOverflowMenu releaseId={r.id} status={r.status} onOpenRelease={onOpenRelease} actions={actions} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StepBar({ current }: { current: number }) {
  return (
    <div className="step-bar">
      {STEP_NAMES.map((name, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div className="step-segment" key={name}>
            <div className="step-item">
              <div className={`step-dot${done ? " done" : active ? " active" : ""}`}>{done ? <Check size={12} /> : i + 1}</div>
              <span className={`step-label${done ? " done" : active ? " active" : ""}`}>{name}</span>
            </div>
            {i < STEP_NAMES.length - 1 ? <div className={`step-connector${done ? " done" : ""}`} /> : null}
          </div>
        );
      })}
    </div>
  );
}

function StepChooseType({ selected, onSelect }: { selected: ReleaseTypeId; onSelect: (type: ReleaseTypeId) => void }) {
  return (
    <div className="card" style={{ padding: 28 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>What are you releasing?</h2>
      <p style={{ fontSize: 13, color: "var(--tx3)", marginBottom: 24 }}>Choose the format that best fits your project. One choice, one path forward.</p>
      <div className="grid-2" style={{ gap: 14 }}>
        {RELEASE_TYPES.map((t) => (
          <button key={t.id} className={`type-card${selected === t.id ? " selected" : ""}`} onClick={() => onSelect(t.id)} type="button">
            <div className="type-icon">{t.icon}</div>
            <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
              <div className="type-name">{t.label}</div>
              <div className="type-count">{t.count}</div>
              <div className="type-desc">{t.desc}</div>
            </div>
            {selected === t.id ? <CheckCircle2 size={20} style={{ color: "var(--pri)", flexShrink: 0 }} /> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepReleaseDetails({ data, onChange }: { data: ReleaseData; onChange: (data: ReleaseData) => void }) {
  const set = (k: keyof ReleaseData, v: string) => onChange({ ...data, [k]: v });
  return (
    <div className="card" style={{ padding: 28 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Release Details</h2>
      <p style={{ fontSize: 13, color: "var(--tx3)", marginBottom: 24 }}>Tell us about your release. Only essential fields are required.</p>
      <div className="grid-2">
        <IG label="Release Title" required>
          <input className="input" value={data.title} onChange={(e) => set("title", e.target.value)} placeholder="Release title" />
        </IG>
        <IG label="Artist Name" required>
          <input className="input" value={data.artist} onChange={(e) => set("artist", e.target.value)} placeholder="e.g. 2MRRW" />
        </IG>
      </div>
      <div className="grid-2">
        <IG label="Release Date" required>
          <input className="input" type="date" value={data.date} onChange={(e) => set("date", e.target.value)} />
        </IG>
        <IG label="Primary Genre" required>
          <select className="select" value={data.genre} onChange={(e) => set("genre", e.target.value)}>
            {GENRES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </IG>
      </div>
      <div className="grid-2">
        <IG label="Secondary Genre" hint="Optional — helps with discovery">
          <select className="select" value={data.genre2} onChange={(e) => set("genre2", e.target.value)}>
            <option value="">None</option>
            {GENRES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </IG>
        <IG label="Language" required>
          <select className="select" value={data.language} onChange={(e) => set("language", e.target.value)}>
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </IG>
      </div>
      <IG label="Release Notes" hint="Optional — displayed on your release page and press kit">
        <textarea className="input textarea" value={data.notes || ""} onChange={(e) => set("notes", e.target.value)} placeholder="Add context, inspiration, or notes about this release…" />
      </IG>
      <div style={{ padding: "12px 16px", background: "var(--pri-bg)", border: "1px solid var(--pri-glow)", borderRadius: "var(--r-md)", fontSize: 12, color: "var(--pri)", display: "flex", alignItems: "center", gap: 8 }}>
        <Info size={14} />
        Smart dropdowns and autosuggest will help fill in genre details as you type.
      </div>
    </div>
  );
}

function StepTracks({ releaseType, tracks, onTracks, credits, onCredits }: { releaseType: ReleaseTypeId; tracks: Track[]; onTracks: (tracks: Track[]) => void; credits: Credits; onCredits: (credits: Credits) => void }) {
  const canAddTrack = releaseType !== "single" && (releaseType !== "ep" || tracks.length < 6);
  const addTrack = () => {
    if (!canAddTrack) return;
    const n = tracks.length + 1;
    onTracks([...tracks, { id: Date.now(), num: n, title: "", dur: "0:00", explicit: false, isrc: "" }]);
  };
  const remove = (id: number) => {
    onTracks(tracks.filter((t) => t.id !== id).map((t, i) => ({ ...t, num: i + 1 })));
  };
  const update = (id: number, k: keyof Track, v: string | boolean) => onTracks(tracks.map((t) => (t.id === id ? { ...t, [k]: v } : t)));
  return (
    <div className="card" style={{ padding: 28 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Tracks & Credits</h2>
      <p style={{ fontSize: 13, color: "var(--tx3)", marginBottom: 24 }}>Add your tracks and collaborators. Drag to reorder. Add lyrics and explicit flags per track.</p>
      <div className="row-between mb-12">
        <span style={{ fontSize: 14, fontWeight: 700 }}>
          Tracks <span style={{ color: "var(--tx3)", fontWeight: 400 }}>({tracks.length})</span>
        </span>
        <Btn variant="primary" size="sm" onClick={addTrack} disabled={!canAddTrack}>
          <Plus size={13} /> Add Track
        </Btn>
      </div>
      <div style={{ display: "flex", gap: 10, padding: "0 12px", marginBottom: 6, fontSize: 10, fontWeight: 700, color: "var(--tx4)", letterSpacing: ".8px", textTransform: "uppercase" }}>
        <span style={{ width: 18 }}>#</span>
        <span style={{ width: 18 }} />
        <span style={{ flex: 1 }}>Title</span>
        <span style={{ width: 60, textAlign: "center" }}>Duration</span>
        <span style={{ width: 32, textAlign: "center" }}>E</span>
        <span style={{ width: 28 }} />
      </div>
      <div style={{ marginBottom: 20 }}>
        {tracks.length ? tracks.map((t) => (
          <div className="track-row" key={t.id}>
            <span className="track-num">{t.num}</span>
            <GripVertical size={14} style={{ color: "var(--tx4)", cursor: "grab", flexShrink: 0 }} />
            <input className="input" style={{ flex: 1, padding: "5px 8px", fontSize: 13, minWidth: 0 }} value={t.title} onChange={(e) => update(t.id, "title", e.target.value)} placeholder={`Track ${t.num} title`} />
            <input className="input" style={{ width: 60, padding: "5px 8px", fontSize: 12, textAlign: "center" }} value={t.dur} onChange={(e) => update(t.id, "dur", e.target.value)} placeholder="0:00" />
            <label title="Explicit content" style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", flexShrink: 0, width: 32, justifyContent: "center" }}>
              <input type="checkbox" checked={t.explicit} onChange={(e) => update(t.id, "explicit", e.target.checked)} style={{ width: 14, height: 14, accentColor: "var(--pri)", cursor: "pointer" }} />
            </label>
            <Btn variant="ghost" size="icon" onClick={() => remove(t.id)}>
              <Trash2 size={13} style={{ color: "var(--err)" }} />
            </Btn>
          </div>
        )) : <div className="empty-desc">No tracks yet. Add track rows manually for this release.</div>}
      </div>
      <Div margin="20px 0" />
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Credits</div>
      <div className="grid-2">
        {[
          ["Producer", "producer", "e.g. Skyline Beats"],
          ["Mixing Engineer", "mixer", "e.g. Jaylen Joshua"],
          ["Mastering Engineer", "masterer", "e.g. Chris Gehringer"],
          ["Executive Producer", "exec", "Optional"],
          ["Songwriter", "songwriter", "Optional"],
          ["Featured Artist", "feature", "Optional"]
        ].map(([label, key, ph]) => (
          <IG label={label} key={key}>
            <input className="input" value={credits[key] || ""} onChange={(e) => onCredits({ ...credits, [key]: e.target.value })} placeholder={ph} />
          </IG>
        ))}
      </div>
      <Btn variant="ghost" size="sm">
        <Plus size={13} /> Add Collaborator
      </Btn>
    </div>
  );
}

function StepArtwork({ stores, onStores }: { stores: string[]; onStores: (stores: string[]) => void }) {
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const toggleStore = (s: string) => onStores(stores.includes(s) ? stores.filter((x) => x !== s) : [...stores, s]);
  return (
    <div className="card" style={{ padding: 28 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Artwork & Media</h2>
      <p style={{ fontSize: 13, color: "var(--tx3)", marginBottom: 24 }}>Upload your cover art and choose distribution stores. Art must be 3000×3000px minimum.</p>
      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--tx3)", letterSpacing: ".7px", textTransform: "uppercase", marginBottom: 10 }}>
            Cover Art <span style={{ color: "var(--pri)" }}>*</span>
          </div>
          <label className={`upload-zone${coverFile ? " has-file" : ""}`} style={{ aspectRatio: "1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%" }}>
            <input accept={MEDIA_ACCEPT} style={{ display: "none" }} type="file" onChange={(event) => setCoverFile(event.currentTarget.files?.[0] ?? null)} />
            {coverFile ? (
              <>
                <div style={{ width: 88, height: 88, background: "linear-gradient(135deg,#111827,#374151)", borderRadius: 14, marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>2M</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ok)" }}>Cover art selected</div>
                <div style={{ fontSize: 11, color: "var(--tx3)", marginTop: 4 }}>{coverFile.name}</div>
                <div style={{ fontSize: 11, color: "var(--tx3)", marginTop: 6 }}>Click to replace</div>
              </>
            ) : (
              <>
                <Upload size={34} style={{ color: "var(--tx3)", marginBottom: 12 }} />
                <div style={{ fontSize: 13, fontWeight: 700 }}>Upload Cover Art</div>
                <div style={{ fontSize: 11, color: "var(--tx3)", marginTop: 6 }}>PNG or JPG · 3000×3000 min</div>
              </>
            )}
          </label>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--tx3)", letterSpacing: ".7px", textTransform: "uppercase", marginBottom: 10 }}>Additional Media</div>
          <label className={`upload-zone${videoFile ? " has-file" : ""}`} style={{ padding: 20, marginBottom: 10, display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
            <input accept={MEDIA_ACCEPT} style={{ display: "none" }} type="file" onChange={(event) => setVideoFile(event.currentTarget.files?.[0] ?? null)} />
            <Video size={26} style={{ color: videoFile ? "var(--ok)" : "var(--tx3)", marginBottom: 8 }} />
            <div style={{ fontSize: 13, fontWeight: 700 }}>{videoFile ? "Motion visual selected" : "Music Video"}</div>
            <div style={{ fontSize: 11, color: "var(--tx3)", marginTop: 4 }}>{videoFile ? `${fmtBytes(videoFile.size)} · ${videoFile.name}` : "MP4, MOV, WEBM · Optional"}</div>
          </label>
          <label className="upload-zone" style={{ padding: 20, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <input accept={MEDIA_ACCEPT} style={{ display: "none" }} type="file" />
            <Camera size={26} style={{ color: "var(--tx3)", marginBottom: 8 }} />
            <div style={{ fontSize: 13, fontWeight: 700 }}>Press Photos</div>
            <div style={{ fontSize: 11, color: "var(--tx3)", marginTop: 4 }}>JPG, PNG, WEBP, GIF · Optional</div>
          </label>
        </div>
      </div>
      <Div margin="20px 0" />
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Distribution Stores</div>
      <p style={{ fontSize: 12, color: "var(--tx3)", marginBottom: 16 }}>
        Select where this release will be distributed. <span style={{ color: "var(--pri)", cursor: "pointer" }}>Select all</span>
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {STORES.map((s) => (
          <button key={s} className={`store-tag${stores.includes(s) ? " selected" : ""}`} onClick={() => toggleStore(s)} type="button">
            {stores.includes(s) ? <Check size={11} /> : null}
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepReview({
  releaseData,
  tracks,
  credits,
  stores,
  releaseId,
  onPublish,
  onSchedule
}: {
  releaseData: ReleaseData;
  tracks: Track[];
  credits: Credits;
  stores: string[];
  releaseId?: string | null;
  onPublish: () => void;
  onSchedule: (value: ReleaseScheduleValue) => Promise<void>;
}) {
  const [schedule, setSchedule] = useState<ReleaseScheduleValue | null>(null);
  const [schedulePreview, setSchedulePreview] = useState("");
  const creditCount = Object.values(credits).filter(Boolean).length;
  const checks = [
    { name: "Release Details", desc: `${releaseData.title || "—"} · ${releaseData.genre || "—"}`, status: releaseData.title ? "ok" : "missing" },
    { name: "Tracks & Credits", desc: `${tracks.length} tracks · ${creditCount} credits on record`, status: tracks.length ? "ok" : "missing" },
    { name: "Artwork", desc: "Upload media to begin.", status: "missing" },
    { name: "Distribution", desc: stores.length ? `${stores.length} of ${STORES.length} stores selected` : "No stores selected yet.", status: stores.length ? "ready" : "missing" },
    { name: "Pricing & Stores", desc: "No shop data yet.", status: "missing" }
  ];
  const publishReady = checks.every((check) => check.status !== "missing");
  return (
    <div className="card" style={{ padding: 28 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Review & Publish</h2>
      <p style={{ fontSize: 13, color: "var(--tx3)", marginBottom: 24 }}>Review everything before your release goes live. Changes can be made up to 24h before release date.</p>
      <div style={{ display: "flex", gap: 20, padding: 18, background: "var(--surf2)", borderRadius: 14, marginBottom: 24, border: "1px solid var(--bord)" }}>
        <div style={{ width: 84, height: 84, background: "linear-gradient(135deg,#4C1D95,#8B55F6)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, flexShrink: 0 }}>♫</div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.5px", marginBottom: 4 }}>{releaseData.title || "Untitled"}</div>
          <div style={{ fontSize: 13, color: "var(--tx3)", marginBottom: 2 }}>
            {releaseData.artist || "Unknown Artist"} · {releaseData.genre || "—"}
          </div>
          <div style={{ fontSize: 13, color: "var(--tx3)", marginBottom: 12 }}>
            {tracks.length} Track{tracks.length !== 1 ? "s" : ""} · {releaseData.date || "Date TBD"}
          </div>
          <StatusBadge status="Scheduled" />
        </div>
      </div>
      <div style={{ marginBottom: 24 }}>
        {checks.map((c) => (
          <div className="check-row" key={c.name}>
            <div>
              <div className="check-name">{c.name}</div>
              <div className="check-desc">{c.desc}</div>
            </div>
            {c.status === "ok" ? (
              <span className="check-ok">
                <CheckCircle2 size={16} /> Complete
              </span>
            ) : c.status === "ready" ? (
              <span className="check-ready">
                <CheckCircle2 size={16} /> Ready
              </span>
            ) : (
              <span className="check-ready">
                <CircleAlert size={16} /> Needs input
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="success-banner mb-16">
        <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
        <span>
          Complete artwork, audio, and store selections before publishing on <strong>{releaseData.date || "your release date"}</strong>.
        </span>
      </div>
      {releaseId ? (
        <div style={{ marginBottom: 20 }}>
          <ReleaseScheduleSection
            compact
            onChange={(value, preview) => {
              setSchedule(value);
              setSchedulePreview(preview.headline);
            }}
          />
        </div>
      ) : null}
      <div className="row gap-10">
        <Btn variant="success" style={{ flex: 1 }} onClick={onPublish} disabled={!publishReady}>
          <Rocket size={15} /> Publish Release
        </Btn>
        <Btn
          variant="ghost"
          disabled={!publishReady || !schedule}
          onClick={() => {
            if (schedule) void onSchedule(schedule);
          }}
        >
          Schedule for Later
        </Btn>
        <Btn variant="ghost">
          <Save size={15} /> Save Draft
        </Btn>
      </div>
      {schedulePreview ? <p style={{ fontSize: 12, color: "var(--tx3)", marginTop: 10 }}>Drop: {schedulePreview}</p> : null}
    </div>
  );
}

function ReleaseFlow({ onBack, onDone, onRefresh }: { onBack: () => void; onDone: () => void; onRefresh?: () => void }) {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [releaseId, setReleaseId] = useState<string | null>(null);
  const [draftTrackIds, setDraftTrackIds] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<ReleaseTypeId>("single");
  const [releaseData, setReleaseData] = useState<ReleaseData>({ title: "", artist: "2MRRW", date: "", genre: "Hip-Hop/Rap", genre2: "", language: "English", notes: "" });
  const [tracks, setTracks] = useState<Track[]>(INITIAL_TRACKS);
  const [credits, setCredits] = useState<Credits>({ producer: "", mixer: "", masterer: "", exec: "", songwriter: "", feature: "" });
  const [stores, setStores] = useState<string[]>([]);
  const selectType = (type: ReleaseTypeId) => {
    setSelectedType(type);
    setTracks(type === "single" ? INITIAL_TRACKS : []);
  };
  const triggerSave = useCallback(() => {
    setSaving(true);
    setTimeout(() => setSaving(false), 700);
  }, []);
  const canAdvance = useMemo(() => {
    if (step === 0) return !!selectedType;
    if (step === 1) return !!(releaseData.title && releaseData.artist && releaseData.date);
    if (step === 2) {
      const minimumTracks = selectedType === "single" ? 1 : selectedType === "ep" ? 2 : 7;
      return tracks.length >= minimumTracks && tracks.every((t) => t.title.trim());
    }
    return true;
  }, [step, selectedType, releaseData, tracks]);
  const persistStep = async (targetStep: number) => {
    setError("");
    if (targetStep === 1 && !releaseId) {
      const created = await createReleaseDraft(selectedType, selectedType === "single" ? 1 : tracks.length || undefined);
      if (!created.ok) {
        setError(created.error);
        return false;
      }
      if (!created.data?.id) {
        setError("Could not create release draft.");
        return false;
      }
      setReleaseId(created.data.id);
      const draftTracks = (created.data as { tracks?: Array<{ id: string }> }).tracks ?? [];
      if (draftTracks.length) setDraftTrackIds(draftTracks.map((track) => track.id));
    }
    if (targetStep === 2 && releaseId) {
      const meta = await patchReleaseMetadata(releaseId, {
        title: releaseData.title.trim(),
        originalReleaseDate: releaseData.date,
        metadataNotes: releaseData.notes.trim() || undefined
      });
      if (!meta.ok) {
        setError(meta.error);
        return false;
      }
    }
    if (targetStep === 3 && releaseId) {
      for (let index = 0; index < tracks.length; index += 1) {
        const trackId = draftTrackIds[index];
        if (!trackId) continue;
        const result = await patchReleaseTrack(releaseId, trackId, { title: tracks[index]!.title.trim() });
        if (!result.ok) {
          setError(result.error);
          return false;
        }
      }
    }
    if (targetStep === 5 && releaseId) {
      const published = await publishReleaseAction(releaseId);
      if (!published.ok) {
        setError(published.error ?? "Publish failed — complete artwork and audio in Media, then retry.");
        return false;
      }
      onRefresh?.();
    }
    return true;
  };
  const next = async () => {
    if (step < 4) {
      setSaving(true);
      const ok = await persistStep(step + 1);
      setSaving(false);
      if (!ok) return;
      triggerSave();
      setStep((s) => s + 1);
    } else {
      setSaving(true);
      const ok = await persistStep(5);
      setSaving(false);
      if (!ok) return;
      triggerSave();
      setTimeout(() => setDone(true), 400);
    }
  };
  const back = () => {
    if (step > 0) setStep((s) => s - 1);
    else onBack();
  };
  if (done) {
    return (
      <div className="content">
        <div style={{ maxWidth: 580, margin: "0 auto", paddingTop: 32 }}>
          <div className="card pop" style={{ padding: 52, textAlign: "center" }}>
            <div style={{ fontSize: 60, marginBottom: 20, lineHeight: 1 }}>🚀</div>
            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>Release Published!</h2>
            <p style={{ fontSize: 14, color: "var(--tx3)", lineHeight: 1.8, marginBottom: 8 }}>
              <strong style={{ color: "var(--tx)" }}>{releaseData.title}</strong> is scheduled to go live on <strong style={{ color: "var(--pri)" }}>{releaseData.date}</strong>.
            </p>
            <p style={{ fontSize: 13, color: "var(--tx3)", lineHeight: 1.7, marginBottom: 32 }}>
              Distributed to <strong style={{ color: "var(--tx)" }}>{stores.length} stores</strong>. We'll notify you when it goes live. Track performance in Analytics.
            </p>
            <div className="row gap-10" style={{ justifyContent: "center" }}>
              <Btn variant="primary" onClick={onDone}>
                <Package size={15} /> View Discography
              </Btn>
              <Btn variant="ghost" onClick={() => { setDone(false); setStep(0); }}>
                <Plus size={15} /> New Release
              </Btn>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="content">
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div className="row-between mb-24">
          <Btn variant="ghost" size="sm" onClick={back}>
            <ArrowLeft size={14} /> {step === 0 ? "Back to Releases" : "Back"}
          </Btn>
          <div className="autosave">
            <div className={`autosave-dot${saving ? " saving" : ""}`} style={saving ? { animation: "pulse 1s ease infinite" } : {}} />
            {saving ? "Saving…" : "All changes saved"}
          </div>
        </div>
        <StepBar current={step} />
        {step === 0 ? <StepChooseType selected={selectedType} onSelect={selectType} /> : null}
        {step === 1 ? <StepReleaseDetails data={releaseData} onChange={setReleaseData} /> : null}
        {step === 2 ? <StepTracks releaseType={selectedType} tracks={tracks} onTracks={setTracks} credits={credits} onCredits={setCredits} /> : null}
        {step === 3 ? <StepArtwork stores={stores} onStores={setStores} /> : null}
        {step === 4 ? (
          <StepReview
            releaseData={releaseData}
            tracks={tracks}
            credits={credits}
            stores={stores}
            releaseId={releaseId}
            onPublish={next}
            onSchedule={async (value) => {
              if (!releaseId) return;
              setSaving(true);
              const result = await scheduleReleaseAction(releaseId, value);
              setSaving(false);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              onRefresh?.();
              setDone(true);
            }}
          />
        ) : null}
        <div className="row gap-10" style={{ marginTop: 20 }}>
          {step > 0 ? (
            <Btn variant="ghost" onClick={back}>
              <ArrowLeft size={14} /> Back
            </Btn>
          ) : null}
          <Btn variant={step === 4 ? "success" : "primary"} style={{ flex: 1 }} onClick={() => void next()} disabled={!canAdvance || saving}>
            {step === 4 ? (
              <>
                <Rocket size={15} /> Publish Release
              </>
            ) : (
              <>
                Save & Continue <ArrowRight size={14} />
              </>
            )}
          </Btn>
        </div>
        {!canAdvance && step < 4 ? (
          <p style={{ fontSize: 12, color: "var(--warn)", textAlign: "center", marginTop: 10 }}>
            <CircleAlert size={12} /> {step === 0 ? "Select a release type to continue." : step === 1 ? "Release title, artist, and date are required." : "Add at least one track with a title."}
          </p>
        ) : null}
        {error ? (
          <p style={{ fontSize: 12, color: "var(--err)", textAlign: "center", marginTop: 10 }}>
            <CircleAlert size={12} /> {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ReleaseDetailView({
  release,
  ui,
  onBack,
  onRefresh,
  onOpenRelease,
  actions
}: {
  release: DurableCatalogRelease;
  ui: ControlUiRelease;
  onBack: () => void;
  onRefresh: () => void;
  onOpenRelease: (releaseId: string) => void;
  actions: ReleaseStudioActions;
}) {
  return (
    <div className="release-detail-workspace media-sync-workspace">
      <div className="row-between mb-20">
        <div className="row gap-12">
          <Btn variant="ghost" onClick={onBack}>
            <ChevronLeft size={16} /> Back
          </Btn>
          <Cover emoji={ui.emoji} grad={ui.grad} size="lg" imageUrl={ui.coverUrl} loopUrl={release.loopUrl ?? ui.loopUrl} posterUrl={release.posterUrl ?? ui.posterUrl} primaryAsset={release.primaryAsset ?? ui.primaryAsset} slug={release.slug ?? ui.slug} />
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.5px", marginBottom: 4 }}>{ui.title}</h1>
            <p style={{ fontSize: 13, color: "var(--tx3)" }}>
              {ui.type} · {ui.date} · {ui.tracks} tracks · <StatusBadge status={ui.status} />
            </p>
          </div>
        </div>
        <Btn variant="ghost" onClick={onRefresh}>
          Refresh catalog
        </Btn>
      </div>
      <ReleaseWorkspaceSections release={release} ui={ui} onOpenRelease={onOpenRelease} actions={actions} onUploadComplete={onRefresh} />
    </div>
  );
}

function Analytics() {
  const platforms: Array<{ name: string; val: number; color: string }> = [];
  const total = platforms.reduce((s, p) => s + p.val, 0);
  return (
    <div className="content">
      <div className="mb-24">
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.5px", marginBottom: 4 }}>Analytics</h1>
        <p style={{ fontSize: 13, color: "var(--tx3)" }}>Performance across all platforms · Last 30 days</p>
      </div>
      <div className="grid-4 mb-20">
        {[
          { label: "Total Streams", val: "0", change: "No analytics yet", up: null },
          { label: "Monthly Listeners", val: "0", change: "No listeners yet", up: null },
          { label: "Track Saves", val: "0", change: "No saves yet", up: null },
          { label: "Playlist Adds", val: "0", change: "No playlist data yet", up: null }
        ].map((s) => (
          <div className="card" style={{ padding: "16px 18px" }} key={s.label}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-val">{s.val}</div>
            <div className={`stat-change ${s.up === true ? "stat-up" : s.up === false ? "stat-down" : "stat-neutral"}`}>{s.change}</div>
          </div>
        ))}
      </div>
      <div className="grid-2">
        <div className="card">
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Top Tracks</div>
          {TOP_TRACKS.length ? TOP_TRACKS.map((t) => (
            <div className="bar-row" key={t.title}>
              <div className="bar-label">{t.title}</div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${t.pct}%` }} />
              </div>
              <div className="bar-val">{fmtNum(t.streams)}</div>
            </div>
          )) : <div className="empty-desc">No analytics available yet.</div>}
        </div>
        <div className="card">
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>By Platform</div>
          {platforms.length ? platforms.map((p) => (
            <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 9, height: 9, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{p.name}</span>
              <div style={{ flex: 2, height: 6, background: "var(--surf2)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", background: p.color, borderRadius: 3, width: `${(p.val / total) * 100}%`, transition: "width .5s ease" }} />
              </div>
              <span style={{ fontSize: 12, color: "var(--tx3)", width: 52, textAlign: "right" }}>{fmtNum(p.val)}</span>
            </div>
          )) : <div className="empty-desc">Platform analytics appear after real playback events.</div>}
          <Div margin="16px 0" />
          <div style={{ fontSize: 13, color: "var(--tx3)" }}>
            Total: <strong style={{ color: "var(--tx)" }}>{fmtNum(total)}</strong> streams
          </div>
        </div>
      </div>
    </div>
  );
}

function Shop() {
  return (
    <div className="content">
      <div className="mb-24">
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.5px", marginBottom: 4 }}>Shop</h1>
        <p style={{ fontSize: 13, color: "var(--tx3)" }}>Merch and physical releases</p>
      </div>
      <div className="empty-state">
        <ShoppingBag size={44} style={{ display: "block", margin: "0 auto 16px", color: "var(--bord3)" }} />
        <div className="empty-title">Shop coming soon</div>
        <div className="empty-desc">Set up your merch store to sell directly to fans. Physical CDs, vinyl, apparel, and more — all in one place.</div>
        <div style={{ marginTop: 24, display: "flex", gap: 10, justifyContent: "center" }}>
          <Btn variant="primary">Get Early Access</Btn>
          <Btn variant="ghost">Learn More</Btn>
        </div>
      </div>
    </div>
  );
}

function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  const connections = [
    { name: "Spotify", ok: false },
    { name: "Apple Music", ok: false },
    { name: "TuneCore", ok: false },
    { name: "Amazon Music", ok: false },
    { name: "YouTube Music", ok: false },
    { name: "Tidal", ok: false }
  ];
  return (
    <div className="content">
      <div className="mb-24">
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.5px", marginBottom: 4 }}>Settings</h1>
        <p style={{ fontSize: 13, color: "var(--tx3)" }}>Manage your artist profile and distribution connections</p>
      </div>
      <div style={{ maxWidth: 580 }}>
        <div className="card mb-16">
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Artist Profile</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, padding: "14px 16px", background: "var(--surf2)", borderRadius: "var(--r-lg)" }}>
            <div style={{ width: 56, height: 56, background: "linear-gradient(135deg,#4C1D95,#8B55F6)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800 }}>2M</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 3 }}>2MRRW</div>
              <div style={{ fontSize: 12, color: "var(--tx3)" }}>Artist · Independent</div>
            </div>
            <Btn variant="ghost" size="sm" style={{ marginLeft: "auto" }}>
              <Camera size={13} /> Change Photo
            </Btn>
          </div>
          <div className="grid-2">
            <IG label="Artist Name" required>
              <input className="input" defaultValue="2MRRW" />
            </IG>
            <IG label="Email">
              <input className="input" defaultValue="contact@2mrrw.com" type="email" />
            </IG>
          </div>
          <div className="grid-2">
            <IG label="Label">
              <input className="input" defaultValue="Independent" />
            </IG>
            <IG label="Country">
              <select className="select" defaultValue="United States">
                <option>United States</option>
                <option>United Kingdom</option>
                <option>Canada</option>
                <option>Australia</option>
              </select>
            </IG>
          </div>
          <IG label="Bio" hint="Shown on your release pages and press kit">
            <textarea className="input textarea" defaultValue="" />
          </IG>
          <div className="row gap-10">
            <Btn variant="primary" size="sm" onClick={save}>
              {saved ? (
                <>
                  <Check size={13} /> Saved!
                </>
              ) : (
                <>
                  <Save size={13} /> Save Changes
                </>
              )}
            </Btn>
            {saved ? <span style={{ fontSize: 12, color: "var(--ok)" }}>Profile updated successfully</span> : null}
          </div>
        </div>
        <div className="card mb-16">
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Distribution Connections</div>
          <p style={{ fontSize: 13, color: "var(--tx3)", marginBottom: 18 }}>Connect your distribution accounts to release on more platforms.</p>
          {connections.map((c) => (
            <div className="check-row" key={c.name}>
              <div className="row gap-10">
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: c.ok ? "var(--ok)" : "var(--bord3)", flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</span>
              </div>
              {c.ok ? <Badge variant="ok">Connected</Badge> : <Btn variant="ghost" size="sm">Connect</Btn>}
            </div>
          ))}
        </div>
        <div className="card">
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 18 }}>Notifications</div>
          {([
            ["Release goes live", true],
            ["New stream milestones", true],
            ["Playlist placements", true],
            ["Credit updates from team", false],
            ["Weekly analytics digest", true]
          ] as const).map(([label, def]) => (
            <div className="check-row" key={String(label)}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{label}</span>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <span style={{ fontSize: 12, color: "var(--tx3)" }}>{def ? "On" : "Off"}</span>
                <div style={{ width: 36, height: 20, borderRadius: 10, background: def ? "var(--pri)" : "var(--bord2)", position: "relative", cursor: "pointer", transition: "background .2s", border: `1px solid ${def ? "var(--pri-dim)" : "var(--bord3)"}` }}>
                  <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: def ? 18 : 2, transition: "left .2s ease", boxShadow: "0 1px 3px rgba(0,0,0,.3)" }} />
                </div>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CreatorReleaseSystem({ initialCatalog = [] }: { initialCatalog?: DurableCatalogRelease[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [page, setPage] = useState<Page>(() => pageFromPathname(pathname));
  const [collapsed, setCollapsed] = useState(false);
  const [catalog, setCatalog] = useState<DurableCatalogRelease[]>(initialCatalog);
  const releases = useMemo(() => mapCatalogReleasesToUi(catalog), [catalog]);
  const releaseId = releaseIdFromPathname(pathname);
  const activeRelease = useMemo(() => catalog.find((release) => release.id === releaseId) ?? null, [catalog, releaseId]);
  const activeUi = useMemo(() => releases.find((release) => release.id === releaseId) ?? null, [releases, releaseId]);

  useEffect(() => {
    setPage(pageFromPathname(pathname));
  }, [pathname]);

  useEffect(() => {
    if (initialCatalog.length) return;
    let cancelled = false;
    void fetchControlCatalogReleases().then((rows) => {
      if (!cancelled && rows.length) setCatalog(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [initialCatalog.length]);

  const refreshCatalog = useCallback(() => {
    void fetchControlCatalogReleases().then((rows) => {
      if (rows.length) setCatalog(rows);
    });
  }, []);

  const [toast, setToast] = useState<StudioToast | null>(null);
  const showToast = useCallback((message: string, tone: StudioToast["tone"] = "ok", checklist?: ReleaseReadinessCheck[]) => {
    setToast({ message, tone, checklist });
    window.setTimeout(() => setToast(null), 5200);
  }, []);

  const openRelease = useCallback(
    (id: string) => {
      router.push(`/releases/${id}`);
    },
    [router]
  );

  const releaseActions = useReleaseStudioActions(refreshCatalog, showToast, openRelease);

  const navigate = useCallback(
    (nextPage: Page) => {
      setPage(nextPage);
      const href = PAGE_ROUTES[nextPage];
      if (href && href !== pathname) {
        router.push(href);
      }
    },
    [pathname, router]
  );

  const activeNav = page === "flow" || page === "release-detail" ? "releases" : page;
  const pageTitle = page === "release-detail" && activeUi ? activeUi.title : PAGE_TITLES[page] || "Dashboard";

  return (
    <div className="app">
      <Sidebar active={activeNav} onNav={navigate} collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} releaseCount={releases.length} />
      <div className="main">
        <TopBar title={pageTitle} onNewRelease={() => navigate("flow")} />
        <div className={`page active${page === "media" || page === "release-detail" ? " page-scroll" : ""}`} key={page}>
          <StudioToastBanner toast={toast} />
          {page === "dashboard" ? <Dashboard onNewRelease={() => navigate("flow")} onNav={navigate} releases={releases} /> : null}
          {page === "releases" ? <Releases onNewRelease={() => navigate("flow")} releases={releases} onOpenRelease={openRelease} actions={releaseActions} /> : null}
          {page === "media" ? <MediaLibrary catalog={catalog} releases={releases} onOpenRelease={openRelease} actions={releaseActions} onUploadComplete={refreshCatalog} /> : null}
          {page === "release-detail" && activeRelease && activeUi ? (
            <ReleaseDetailView release={activeRelease} ui={activeUi} onBack={() => router.push("/releases")} onRefresh={refreshCatalog} onOpenRelease={openRelease} actions={releaseActions} />
          ) : null}
          {page === "analytics" ? <Analytics /> : null}
          {page === "shop" ? <Shop /> : null}
          {page === "settings" ? <SettingsPage /> : null}
          {page === "flow" ? <ReleaseFlow onBack={() => navigate("releases")} onDone={() => navigate("releases")} onRefresh={refreshCatalog} /> : null}
        </div>
      </div>
    </div>
  );
}
