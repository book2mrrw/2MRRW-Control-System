import Link from "next/link";
import { PageHeader, StatusStrip } from "@/components/control/OperationalPrimitives";
import { getReleaseManagementOverview } from "@/server/release-management/releaseManagementService";

export default function DashboardPage() {
  const overview = getReleaseManagementOverview();
  const mission = overview.missionControl;
  const latestRelease = overview.allReleases[0] ?? null;
  const scheduledRelease = overview.allReleases.find((release) => release.status === "scheduled") ?? null;
  const unfinishedDraft = mission.continueCards[0] ?? null;
  const recentActivity = [
    ...overview.allReleases.slice(0, 3).map((release) => `${release.title} updated ${release.updatedAt.slice(0, 10)}`),
    ...mission.notifications.slice(0, 2).map((notification) => `${notification.title}: ${notification.detail}`)
  ].slice(0, 5);

  return (
    <>
      <PageHeader
        eyebrow="Creator release system"
        title="Welcome back, 2MRRW"
        description="Cinematic. intuitive. sequential. Purpose-built for releases, media, sync, analytics, shop readiness, and creative publishing flow."
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
      <section className="dashboard-command-grid">
        <article className="panel dashboard-welcome-card">
          <div className="section-heading">
            <div>
              <p className="meta-label">Welcome section</p>
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
            <Link href="/releases/new">Add Release</Link>
            <Link href="/releases">Open Discography</Link>
          </div>
        </article>
        <article className="panel next-release-card">
          <p className="meta-label">Latest release</p>
          {latestRelease ? (
            <Link className="release-card-main" href={`/releases/${latestRelease.id}`}>
              <span className="release-card-art" aria-hidden="true">{latestRelease.releaseType === "ep" ? "EP" : latestRelease.releaseType === "deluxe" ? "DX" : latestRelease.releaseType.slice(0, 1).toUpperCase()}</span>
              <span className="release-card-body">
                <strong>{latestRelease.title}</strong>
                <span>{latestRelease.releaseType.replaceAll("_", " ")} / {latestRelease.status.replaceAll("_", " ")}</span>
                <span>Updated {latestRelease.updatedAt.slice(0, 10)}</span>
              </span>
            </Link>
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
      </section>
    </>
  );
}
