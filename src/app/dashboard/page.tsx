import Link from "next/link";
import { PageHeader, StatusStrip } from "@/components/control/OperationalPrimitives";
import { getStreamingAnalyticsSummary, listAnalyticsEvents } from "@/server/analytics/analyticsService";
import { ensureFrontendReleaseEcosystemImported } from "@/server/release-management/frontendReleaseIngestionService";
import { getReleaseManagementOverview } from "@/server/release-management/releaseManagementService";

export default async function DashboardPage() {
  await ensureFrontendReleaseEcosystemImported();
  const overview = getReleaseManagementOverview();
  const mission = overview.missionControl;
  const streaming = getStreamingAnalyticsSummary();
  const listeners = new Set(listAnalyticsEvents().map((event) => event.userId)).size;
  const latestRelease = overview.allReleases[0] ?? null;
  const scheduledRelease = overview.allReleases.find((release) => release.status === "scheduled") ?? null;
  const unfinishedDraft = mission.continueCards[0] ?? null;
  const totalTracks = overview.allReleases.reduce((sum, release) => sum + release.tracks.length, 0);
  const nextRelease = unfinishedDraft ?? (latestRelease ? {
    title: latestRelease.title,
    href: `/releases/${latestRelease.id}`,
    percentComplete: latestRelease.continueCard.percentComplete,
    nextAction: latestRelease.status === "published" ? "Review frontend contract" : "Continue release"
  } : null);
  const recentActivity = [
    ...overview.allReleases.slice(0, 3).map((release) => `${release.title} updated ${release.updatedAt.slice(0, 10)}`),
    ...mission.notifications.slice(0, 2).map((notification) => `${notification.title}: ${notification.detail}`)
  ].slice(0, 5);
  const quickActions = [
    { label: "New Release", detail: "Start the five-step workflow", href: "/releases/new" },
    { label: "Upload Media", detail: "Attach artwork, audio, hero, vault, or merch", href: "/media" },
    { label: "Review Analytics", detail: "Check streams, platforms, and top tracks", href: "/analytics" },
    { label: "Shop Workspace", detail: "Prepare product visuals and drop structure", href: "/shop" }
  ];

  return (
    <>
      <PageHeader
        eyebrow="Creator release system"
        title="Welcome back, 2MRRW."
        description="One cinematic creator system for releases, media, analytics, shop readiness, and quiet backend sync."
        actions={[
          { label: "Add Release", href: "/releases/new" }
        ]}
      />
      <Link className="mobile-primary-action control-button" href="/releases/new">
        Add Release
      </Link>
      <StatusStrip
        items={[
          { label: "Drafts", value: String(overview.accountDashboard.drafts), tone: "vault" },
          { label: "Scheduled", value: String(overview.allReleases.filter((release) => release.status === "scheduled").length), tone: "commerce" },
          { label: "Published", value: String(overview.accountDashboard.published), tone: "success" },
          { label: "Sync", value: mission.systemConfidence.find((item) => item.key === "frontend_updated")?.state ?? "Syncing", tone: "signal" }
        ]}
      />
      <section className="quick-stats-grid" aria-label="Quick stats">
        <article className="stats-card">
          <span>Streams</span>
          <strong>{streaming.validStreams}</strong>
          <small>{streaming.totalStreamEvents} playback events tracked</small>
        </article>
        <article className="stats-card">
          <span>Listeners</span>
          <strong>{listeners}</strong>
          <small>Known analytics identities</small>
        </article>
        <article className="stats-card">
          <span>Releases</span>
          <strong>{overview.allReleases.length}</strong>
          <small>{totalTracks} tracks in release drafts</small>
        </article>
        <article className="stats-card">
          <span>Countries</span>
          <strong>{streaming.countryCount}</strong>
          <small>Streaming country signals</small>
        </article>
      </section>
      <section className="dashboard-command-grid">
        <article className="panel dashboard-welcome-card">
          <div className="section-heading">
            <div>
              <p className="meta-label">Dashboard hero</p>
              <h2>Build the next release without noise.</h2>
            </div>
          </div>
          <p>Start with a format, move through five steps, and let 2MRRW remember credits, metadata, uploads, scheduling, and sync state as you work.</p>
          <div className="sync-contract-strip">
            <span>Drafts persist</span>
            <span>Uploads persist</span>
            <span>Progress persists</span>
            <span>Autosave surfaced</span>
          </div>
          <div className="hero-actions">
            <Link className="glow-button" href="/releases/new">Add Release</Link>
            <Link href="/releases">Open Discography</Link>
          </div>
        </article>
        <article className="panel next-release-card">
          <p className="meta-label">Next release</p>
          {nextRelease ? (
            <>
              <Link className="release-card-main next-release-main" href={nextRelease.href}>
                <span className="release-card-art next-release-art" aria-hidden="true">{latestRelease?.releaseType === "ep" ? "EP" : latestRelease?.releaseType === "deluxe" ? "DX" : latestRelease?.releaseType.slice(0, 1).toUpperCase() ?? "2M"}</span>
                <span className="release-card-body">
                  <strong>{nextRelease.title}</strong>
                  <span>{nextRelease.nextAction}</span>
                  <span>{nextRelease.percentComplete}% complete</span>
                </span>
              </Link>
              <div className="release-progress-bar" aria-label={`${nextRelease.percentComplete}% complete`}>
                <span style={{ width: `${nextRelease.percentComplete}%` }} />
              </div>
              <div className="inline-action-row">
                <Link className="control-button" href={nextRelease.href}>Continue</Link>
                <Link className="control-button secondary" href={latestRelease ? `/api/releases/${latestRelease.slug}` : "/releases"}>Preview</Link>
              </div>
            </>
          ) : (
            <div className="empty-card"><strong>No release yet</strong><span>Create the first 2MRRW release draft.</span></div>
          )}
        </article>
        <article className="panel">
          <div className="section-heading">
            <div>
              <p className="meta-label">Scheduled release</p>
              <h2>{scheduledRelease?.title ?? "Nothing scheduled"}</h2>
            </div>
          </div>
          <p>{scheduledRelease ? `${scheduledRelease.scheduledPublishAt?.slice(0, 10) ?? "Date pending"} / ${scheduledRelease.tracks.length} tracks` : "Set a release date during details, then confirm the schedule during review."}</p>
        </article>
        <article className="panel continue-draft-card">
          <div className="section-heading">
            <div>
              <p className="meta-label">Continue unfinished draft</p>
              <h2>{unfinishedDraft?.title ?? "No unfinished draft"}</h2>
            </div>
          </div>
          <p>{unfinishedDraft ? `${unfinishedDraft.nextAction} / ${unfinishedDraft.percentComplete}% complete / progress persists` : "New drafts appear here with the next best action."}</p>
          <Link className="control-button" href={unfinishedDraft?.href ?? "/releases/new"}>{unfinishedDraft ? "Continue" : "Start Release"}</Link>
        </article>
        <article className="panel">
          <div className="section-heading">
            <div>
              <p className="meta-label">Recent uploads</p>
              <h2>Media pipeline</h2>
            </div>
          </div>
          <div className="activity-list">
            <span>Cover art validation ready</span>
            <span>Audio visual upload lane ready</span>
            <span>Vault media assignment ready</span>
          </div>
        </article>
        <article className="panel">
          <div className="section-heading">
            <div>
              <p className="meta-label">Recent activity</p>
              <h2>What changed</h2>
            </div>
          </div>
          <div className="activity-list">
            {recentActivity.length ? recentActivity.map((item) => <span key={item}>{item}</span>) : <span>No recent activity yet.</span>}
          </div>
        </article>
        <article className="panel quick-actions-panel">
          <div className="section-heading">
            <div>
              <p className="meta-label">Quick actions</p>
              <h2>Move fast without leaving the system.</h2>
            </div>
          </div>
          <div className="quick-action-list">
            {quickActions.map((action) => (
              <Link href={action.href} key={action.href}>
                <strong>{action.label}</strong>
                <span>{action.detail}</span>
              </Link>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}
