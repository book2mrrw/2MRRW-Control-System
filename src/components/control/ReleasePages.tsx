import Link from "next/link";
import { EmptyState, FormSection, PageHeader, StatusStrip, DataTable, WorkflowStepper } from "@/components/control/OperationalPrimitives";
import { CreateReleaseDraftForm, LyricsEditorForm, ReleaseMetadataForm, SongwriterContributionForm, TrackInformationForm } from "@/components/control/ReleaseForms";
import { GlobalSearch } from "@/components/control/GlobalSearch";
import { AudioVisualsPanel } from "@/components/control/AudioVisualsPanel";
import { HeroConfigPanel } from "@/components/control/HeroConfigPanel";
import { MediaUploadPanel } from "@/components/control/MediaUploadPanel";
import { getMediaUploadPolicy } from "@/server/media/uploadIntentService";
import { listContributorProfiles, listMetadataSuggestions } from "@/server/release-management/contributorDirectoryService";
import {
  getReadinessSummary,
  getReleaseLifecycle,
  getReleaseDraft,
  getReleaseManagementOverview,
  listReleaseDrafts,
  listTrackContributions,
  validateTrackSplits,
  type ReleaseManagementDraft
} from "@/server/release-management/releaseManagementService";
import type { ReleaseStepId } from "@/components/control/OperationalData";

function primaryDraft() {
  return listReleaseDrafts()[0] ?? null;
}

function releaseStatusLabel(status: ReleaseManagementDraft["status"]) {
  const labels: Record<ReleaseManagementDraft["status"], string> = {
    draft: "Draft",
    metadata_incomplete: "Incomplete",
    assets_pending: "Incomplete",
    rights_pending: "Incomplete",
    ready_for_review: "Ready",
    scheduled: "Scheduled",
    published: "Live",
    archived: "Archived"
  };
  return labels[status] ?? status.replaceAll("_", " ");
}

function completionPercent(draft: ReleaseManagementDraft) {
  const summary = getReadinessSummary(draft.id);
  if (!summary.checks.length) return 0;
  return Math.round((summary.checks.filter((check) => check.passed).length / summary.checks.length) * 100);
}

function releaseDateLabel(draft: ReleaseManagementDraft) {
  return draft.scheduledPublishAt?.slice(0, 10) ?? "Date not set";
}

type ReleaseTab = "draft" | "scheduled" | "published" | "archived";
type ReleaseTypeFilter = "single" | "album" | "ep";

function tabMatchesRelease(tab: ReleaseTab | undefined, draft: ReleaseManagementDraft) {
  if (!tab) return true;
  if (tab === "draft") return ["draft", "metadata_incomplete", "assets_pending", "rights_pending", "ready_for_review"].includes(draft.status);
  return draft.status === tab;
}

function typeMatchesRelease(type: ReleaseTypeFilter | undefined, draft: ReleaseManagementDraft) {
  if (!type) return true;
  if (type === "album") return draft.releaseType === "album" || draft.releaseType === "deluxe";
  return draft.releaseType === type;
}

function releaseArtworkLabel(draft: ReleaseManagementDraft) {
  return draft.releaseType === "single" ? "S" : draft.releaseType === "ep" ? "EP" : draft.releaseType === "deluxe" ? "DX" : "LP";
}

function releaseTypeRule(draft: ReleaseManagementDraft) {
  if (draft.releaseType === "single") return "Single rule: exactly 1 track.";
  if (draft.releaseType === "ep") return "EP rule: 2-4 tracks.";
  if (draft.releaseType === "album") return "Album rule: 5+ tracks.";
  return "Deluxe rule: optional bonus-track version.";
}

export function ReleaseIndexPage({ status, type }: { status?: ReleaseTab; type?: ReleaseTypeFilter }) {
  const overview = getReleaseManagementOverview();
  const drafts = overview.allReleases.filter((draft) => tabMatchesRelease(status, draft) && typeMatchesRelease(type, draft));
  const title = status ? `${status[0]?.toUpperCase()}${status.slice(1)} Releases` : "Discography";

  return (
    <>
      <PageHeader
        eyebrow="Creator discography"
        title={title}
        description="Artwork-first release management for drafts, scheduled drops, published catalog, and unfinished ideas."
        actions={[
          { label: "Add Release", href: "/releases/new" }
        ]}
      />
      <StatusStrip
        items={[
          { label: "Drafts", value: String(overview.accountDashboard.drafts), tone: "signal" },
          { label: "Incomplete", value: String(overview.accountDashboard.incomplete), tone: "danger" },
          { label: "Review Ready", value: String(overview.accountDashboard.readyForReview), tone: "success" },
          { label: "Published", value: String(overview.accountDashboard.published), tone: "commerce" }
        ]}
      />
      <section className="panel discography-workspace">
        <div className="section-heading">
          <div>
            <p className="meta-label">Release library</p>
            <h2>Discography cards</h2>
          </div>
          <Link className="control-button" href="/releases/new">
            Add Release
          </Link>
        </div>
        <GlobalSearch />
        <div className="release-filter-row" aria-label="Release filters">
          {[
            { label: "All", href: "/releases", active: !status && !type },
            { label: "Albums", href: "/releases?type=album", active: type === "album" },
            { label: "Singles", href: "/releases?type=single", active: type === "single" },
            { label: "EPs", href: "/releases?type=ep", active: type === "ep" },
            { label: "Drafts", href: "/releases/drafts", active: status === "draft" },
            { label: "Scheduled", href: "/releases/scheduled", active: status === "scheduled" },
            { label: "Published", href: "/releases/published", active: status === "published" }
          ].map((filter) => (
            <Link className="filter-chip" data-active={filter.active ? "true" : "false"} href={filter.href} key={filter.href}>
              {filter.label}
            </Link>
          ))}
        </div>
        {drafts.length ? (
          <div className="release-card-grid">
            {drafts.map((draft) => (
              <article className="release-card" key={draft.id}>
                <Link className="release-card-main" href={`/releases/${draft.id}`}>
                  <span className="release-card-art" aria-hidden="true">{releaseArtworkLabel(draft)}</span>
                  <span className="release-card-body">
                    <strong>{draft.title}</strong>
                    <span>{draft.releaseType.replaceAll("_", " ")} / {releaseDateLabel(draft)}</span>
                    <span>{draft.tracks.length} tracks / {completionPercent(draft)}% complete</span>
                    <span className="release-status-badge">{releaseStatusLabel(draft.status)}</span>
                  </span>
                </Link>
                <span className="release-card-actions">
                  <Link href="/releases/new">Edit Release</Link>
                  <button type="button">Duplicate Release</button>
                  <button type="button">Archive Release</button>
                  <button type="button">Publish Release</button>
                  <Link href={`/api/releases/${draft.slug}`}>View Frontend</Link>
                </span>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No releases yet"
            detail="Create your first release for the 2MRRW ecosystem."
            action={{ label: "+ Add Release", href: "/releases/new" }}
          />
        )}
      </section>
    </>
  );
}

export function ReleaseWizardPage({ step }: { step: ReleaseStepId }) {
  const draft = primaryDraft();
  const contributorProfiles = listContributorProfiles();
  const metadataSuggestions = listMetadataSuggestions();
  const stepOrder: ReleaseStepId[] = ["setup", "details", "tracks", "uploads", "review"];
  const stepUrls = ["/releases/new", "/releases/new/details", "/releases/new/tracks", "/releases/new/uploads", "/releases/new/review"];
  const currentStepIndex = stepOrder.indexOf(step);
  const nextStep = stepUrls[currentStepIndex + 1] ?? "/releases";
  const previousStep = stepUrls[currentStepIndex - 1] ?? "/releases";
  const pageDescriptions: Record<ReleaseStepId, string> = {
    setup: "Choose the format. The system will create the right draft shape and move you forward.",
    details: "Title, artist, genre, language, release date, collaborator memory, and metadata defaults.",
    tracks: "Track rows, lyrics, explicit states, collaborator memory, contributor roles, and credits.",
    uploads: "Cover art, hero media, audio visuals, vault assets, preview states, replacement paths, and sync readiness.",
    review: "Distribution readiness, release summary, publish checks, and final review."
  };
  const normalizedTracks = draft?.releaseType === "single" ? draft.tracks.slice(0, 1) : draft?.tracks ?? [];
  const isSingle = draft?.releaseType === "single";

  return (
    <>
      <PageHeader
        eyebrow="2MRRW RELEASE SYSTEM"
        title="Add Release"
        description={pageDescriptions[step]}
        actions={draft ? [{ label: "Save Draft", href: `/releases/${draft.id}` }] : [{ label: "Save Draft", href: "/releases" }]}
      />
      <div className="release-flow-layout">
        <WorkflowStepper current={step} />
        <section className="panel release-workflow-panel">
          <Link className="workflow-back-link" href={previousStep ?? "/releases"}>
            Back
          </Link>
          {draft ? (
            <StatusStrip
              items={[
                { label: "Draft", value: "Autosaved", tone: "vault" },
                { label: "Complete", value: `${completionPercent(draft)}%`, tone: "success" },
                { label: "Status", value: releaseStatusLabel(draft.status), tone: "signal" },
                { label: "Release Date", value: releaseDateLabel(draft), tone: "commerce" }
              ]}
            />
          ) : null}
          {step === "setup" ? (
            <FormSection title="What would you like to release?" description="Single, EP, Album, or Deluxe Album. This creates the draft and the recommended track structure.">
              <CreateReleaseDraftForm />
              <Link className="control-button secondary workflow-cancel-link" href="/releases">
                Cancel
              </Link>
              {draft ? (
                <Link className="workflow-continue-card" href="/releases/new/details">
                  <span className="release-card-art" aria-hidden="true">{releaseArtworkLabel(draft)}</span>
                  <span>
                    <strong>Continue existing draft: {draft.title}</strong>
                    <small>{draft.releaseType.replaceAll("_", " ")} / {completionPercent(draft)}% complete / autosaved</small>
                  </span>
                </Link>
              ) : null}
            </FormSection>
          ) : null}
          {step === "details" && draft ? (
            <div className="release-editor-grid">
              <FormSection title="Release details" description="Clean metadata first. These fields drive distribution, sync, publishing, and release review.">
                <div className="release-rule-card">
                  <p className="meta-label">Progress persists</p>
                  <strong>{releaseTypeRule(draft)}</strong>
                  <span>Draft state and saved metadata persist through the release-management service after save.</span>
                </div>
                <ReleaseMetadataForm draft={draft} contributorProfiles={contributorProfiles} metadataSuggestions={metadataSuggestions} />
              </FormSection>
              <aside className="workflow-side-notes">
                <div className="cover-summary-panel">
                  <p className="meta-label">Cover artwork</p>
                  <strong>Upload the release cover.</strong>
                  <span>3000x3000 recommended. 1400x1400 minimum.</span>
                  <MediaUploadPanel draft={{ id: draft.id, title: draft.title, tracks: draft.tracks }} mode="artwork" />
                </div>
                <div className="release-summary-panel">
                  <p className="meta-label">Release type summary</p>
                  <span className="release-card-art" aria-hidden="true">{releaseArtworkLabel(draft)}</span>
                  <strong>{draft.releaseType.replaceAll("_", " ")} / {draft.tracks.length} tracks</strong>
                  <span>{releaseTypeRule(draft)}</span>
                  <span>Release date feeds scheduling and review readiness.</span>
                </div>
              </aside>
            </div>
          ) : null}
          {step === "tracks" && draft ? (
            <FormSection title="Tracks & credits" description="Add tracks, lyrics, producer credits, engineer credits, songwriter splits, and collaborator memory.">
              <div className="track-command-row">
                <button className="control-button secondary" disabled={isSingle} type="button">{isSingle ? "Single locked to 1 track" : "Add Track"}</button>
                <button className="control-button secondary" type="button">Drag Reorder</button>
                <button className="control-button secondary" disabled={isSingle} type="button">Duplicate Track</button>
              </div>
              <div className="release-rule-card">
                <p className="meta-label">Track validation</p>
                <strong>{releaseTypeRule(draft)}</strong>
                <span>{isSingle ? "Singles cannot add or render extra track slots. The one track keeps its audio file, credits, and metadata." : "Audio is tied to the exact track, lyrics to the exact song, and collaborator roles are remembered for future autocomplete."}</span>
              </div>
              <div className="track-row-list">
                {normalizedTracks.map((track) => (
                  <article className="track-row-card" key={track.id}>
                    <span>{track.position}</span>
                    <strong>{track.title}</strong>
                    <small>{track.position === 1 ? "3:24" : "3:08"} / {track.audioState} / lyrics {track.lyricsState.replaceAll("_", " ")} / {track.explicit ? "explicit" : "clean"}</small>
                  </article>
                ))}
              </div>
              <div className="accordion-stack">
                {normalizedTracks.map((track) => (
                  <details key={track.id} open={track.position === 1}>
                    <summary>{track.position}. {track.title}</summary>
                    <TrackInformationForm releaseId={draft.id} track={track} contributorProfiles={contributorProfiles} />
                  </details>
                ))}
                <details>
                  <summary>Lyrics</summary>
                  <LyricsEditorForm draft={draft} />
                </details>
                <details open>
                  <summary>Credits, contributors, and splits</summary>
                  <div className="track-command-row">
                    <button className="control-button secondary" type="button">Add Collaborator</button>
                    <button className="control-button secondary" type="button">Producer Credits</button>
                    <button className="control-button secondary" type="button">Engineer Credits</button>
                  </div>
                  <SongwriterContributionForm draft={draft} contributorProfiles={contributorProfiles} />
                  <SongwriterTable draft={draft} />
                </details>
              </div>
            </FormSection>
          ) : null}
          {step === "uploads" && draft ? (
            <FormSection title="Artwork & media" description="Upload cover art, hero media, audio visuals, vault media, and preview replacements before publish.">
              <div className="sync-contract-strip">
                <span>Backend</span>
                <span>Website</span>
                <span>Mobile app</span>
                <span>Tablet app</span>
                <span>Desktop app</span>
              </div>
              <div className="media-workflow-grid">
                <article className="media-workflow-card">
                  <p className="meta-label">Cover art</p>
                  <strong>1400x1400 minimum</strong>
                  <span>Tied to release: {draft.title}. 3000x3000 recommended.</span>
                  <MediaUploadPanel draft={{ id: draft.id, title: draft.title, tracks: normalizedTracks }} mode="artwork" />
                </article>
                <article className="media-workflow-card">
                  <p className="meta-label">Hero media</p>
                  <strong>Release page atmosphere</strong>
                  <span>Tied to homepage hero, landing hero, or release page hero.</span>
                  <MediaUploadPanel draft={{ id: draft.id, title: draft.title, tracks: normalizedTracks }} mode="videos" />
                </article>
                <article className="media-workflow-card">
                  <p className="meta-label">Audio visual</p>
                  <strong>Visualizer and video assets</strong>
                  <span>Tied to the audiovisual section with preview and replacement states.</span>
                  <MediaUploadPanel draft={{ id: draft.id, title: draft.title, tracks: normalizedTracks }} mode="loops" />
                </article>
                <article className="media-workflow-card">
                  <p className="meta-label">Vault media</p>
                  <strong>Protected extras</strong>
                  <span>Tied to vault panels without changing public frontend styling.</span>
                  <MediaUploadPanel draft={{ id: draft.id, title: draft.title, tracks: normalizedTracks }} mode="all" />
                </article>
              </div>
            </FormSection>
          ) : null}
          {step === "review" && draft ? <ReviewPanel draft={draft} /> : null}
          {step !== "setup" && !draft ? (
            <EmptyState title="Create a release first" detail="Choose a release type before continuing." action={{ label: "Create Release", href: "/releases/new" }} />
          ) : null}
        </section>
      </div>
      <nav className="workflow-actions" aria-label="Workflow navigation">
        <span className="autosave-indicator">Autosave ready</span>
        <Link className="control-button secondary" href={previousStep ?? "/releases"}>
          Back
        </Link>
        <Link className="control-button" href={nextStep ?? "/releases"}>
          {step === "review" ? "Back to Releases" : "Save & Continue"}
        </Link>
      </nav>
    </>
  );
}

export function ReleaseDetailPage({ releaseId }: { releaseId: string }) {
  const draft = getReleaseDraft(releaseId);
  if (!draft) {
    return <EmptyState title="Release draft not found" detail="No release-management draft exists for this ID." action={{ label: "Back to Releases", href: "/releases" }} />;
  }
  const readiness = getReadinessSummary(draft.id);
  const lifecycle = getReleaseLifecycle(draft.id);

  return (
    <>
      <PageHeader
        eyebrow="Release"
        title={draft.title}
        description="Review this release, finish missing items, and prepare it for submission."
        status={draft.saveState === "synced" ? "Synced" : readiness.ready ? "Ready" : "Saved"}
        actions={[
          { label: "Continue Release", href: "/releases/new/details" },
          { label: "Media", href: "/media" },
          { label: "Preview Contract", href: lifecycle.previewLinks[0]?.href ?? `/api/admin/releases/manage/${draft.id}?preview=contract` }
        ]}
      />
      <StatusStrip
        items={[
          { label: "Save", value: draft.saveState, tone: draft.saveState === "failed" ? "danger" : "success" },
          { label: "Stage", value: draft.publishingStage, tone: "signal" },
          { label: "Frontend", value: readiness.creatorConfidence.find((item) => item.key === "frontend_updated")?.state ?? "syncing", tone: "vault" },
          { label: "Last Updated", value: draft.updatedAt.slice(0, 10), tone: "commerce" }
        ]}
      />
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="meta-label">Creator health</p>
            <h2>Content confidence</h2>
          </div>
          <span className="state-badge">Safe mode ready</span>
        </div>
        <DataTable
          rows={readiness.creatorConfidence.map((item) => ({
            Check: item.label,
            State: item.state.replaceAll("_", " "),
            Detail: item.detail,
            Updated: item.updatedAt.slice(0, 10)
          }))}
        />
      </section>
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="meta-label">Release checklist</p>
            <h2>Before you submit</h2>
          </div>
        </div>
        <DataTable rows={readiness.checks.map((check) => ({ Checklist: checklistLabel(check.key), Status: check.passed ? "Complete" : "Needs attention", Notes: check.message }))} />
      </section>
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="meta-label">Release timeline</p>
            <h2>What changed</h2>
          </div>
        </div>
        <DataTable rows={lifecycle.activity.map((event) => ({ Event: event.message, Type: event.kind.replaceAll("_", " "), Time: event.createdAt.slice(0, 19) }))} />
      </section>
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="meta-label">Tracks</p>
            <h2>Tracks</h2>
          </div>
        </div>
        <div className="record-link-grid">
          {draft.tracks.map((track) => (
            <Link className="record-link" href={`/tracks/${track.id}/information`} key={track.id}>
              <strong>{track.position}. {track.title}</strong>
              <span>{track.compositionType} / explicit: {track.explicit ? "yes" : "no"} / audio: {track.audioState}</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

export function TrackInformationPage({ trackId }: { trackId: string }) {
  const draft = listReleaseDrafts().find((item) => item.tracks.some((track) => track.id === trackId));
  const track = draft?.tracks.find((item) => item.id === trackId) ?? null;
  if (!draft || !track) {
    return <EmptyState title="Track not found" detail="No release-management track exists for this ID." action={{ label: "Back to Releases", href: "/releases" }} />;
  }
  const contributions = listTrackContributions(track.id);
  const split = validateTrackSplits(track.id);
  const contributorProfiles = listContributorProfiles();

  return (
    <>
      <PageHeader
        eyebrow="Track"
        title={track.title || "Untitled Track"}
        description="Edit track details, collaborators, advisory state, language, composition type, ISRCs, and splits."
        actions={[
          { label: "Release", href: `/releases/${draft.id}` },
          { label: "Tracks Step", href: "/releases/new/tracks" }
        ]}
      />
      <StatusStrip
        items={[
          { label: "Artist", value: draft.artistName, tone: "signal" },
          { label: "Featured Artists", value: track.producerNames.join(", ") || "None recorded", tone: "vault" },
          { label: "Parental Advisory", value: track.explicit ? "Explicit" : "Clean", tone: track.explicit ? "danger" : "success" },
          { label: "Split Total", value: `${split.total}%`, tone: split.passed ? "success" : "danger" }
        ]}
      />
      <section className="panel">
        <FormSection title="Track Information" description="Save the details 2MRRW uses for this track.">
          <TrackInformationForm releaseId={draft.id} track={track} contributorProfiles={contributorProfiles} />
        </FormSection>
      </section>
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="meta-label">Publishing splits</p>
            <h2>Contributors & splits</h2>
          </div>
          <span className="state-badge">{split.message}</span>
        </div>
        <DataTable
          rows={contributions.map((row) => ({
            Contributor: row.contributorName,
            Role: row.contributionType.replaceAll("_", " "),
            Publisher: row.isPublisher ? "Yes" : "No",
            Royalty: `${row.ownershipSplit}%`,
            Publishing: row.publisherName ? "Recorded" : "-"
          }))}
        />
        <SongwriterContributionForm draft={draft} contributorProfiles={contributorProfiles} />
      </section>
    </>
  );
}

export function SongwriterTable({ draft }: { draft: ReleaseManagementDraft }) {
  const rows = draft.tracks.flatMap((track) =>
    listTrackContributions(track.id).map((row) => ({
      Track: track.title,
      Contributor: row.contributorName,
      Role: row.contributionType.replaceAll("_", " "),
      Royalty: `${row.ownershipSplit}%`,
      Publishing: row.publisherName ? "Recorded" : "-",
      Total: validateTrackSplits(track.id).message
    }))
  );
  return <DataTable rows={rows} />;
}

function ReviewPanel({ draft }: { draft: ReleaseManagementDraft }) {
  const readiness = getReadinessSummary(draft.id);
  const scheduleReady = Boolean(draft.scheduledPublishAt);
  const readinessByKey = new Map(readiness.checks.map((check) => [check.key, check]));
  const rows = [
    { Checklist: "Release Details", Status: readinessByKey.get("metadata")?.passed ? "Complete" : "Missing", Notes: readinessByKey.get("metadata")?.message ?? "Confirm title, artist, genre, language, and release date." },
    { Checklist: "Tracks & Credits", Status: readinessByKey.get("track_information")?.passed && readinessByKey.get("splits")?.passed ? "Complete" : "Missing", Notes: "Tracks, lyrics, credits, roles, and splits must be ready." },
    { Checklist: "Artwork", Status: readinessByKey.get("cover_art")?.passed ? "Complete" : "Missing", Notes: readinessByKey.get("cover_art")?.message ?? "Upload approved release artwork." },
    { Checklist: "Distribution", Status: readiness.ready ? "Complete" : "Needs attention", Notes: "Stores and delivery state follow release readiness." },
    { Checklist: "Pricing & Stores", Status: readiness.ready && scheduleReady ? "Ready" : "Needs attention", Notes: "Confirm shop, store, and schedule settings before publish." }
  ];
  return (
    <FormSection title="Distribution" description="Confirm release summary, resolve warnings, preview, and prepare final distribution.">
      <div className="review-publish-grid">
        <article className="review-summary-card">
          <span className="release-card-art" aria-hidden="true">{releaseArtworkLabel(draft)}</span>
          <div>
            <p className="meta-label">Release summary</p>
            <strong>{draft.title}</strong>
            <span>{draft.artistName} / {draft.releaseType.replaceAll("_", " ")} / {draft.tracks.length} tracks</span>
            <span>{releaseDateLabel(draft)} / {completionPercent(draft)}% complete</span>
          </div>
        </article>
        <div className="review-checklist">
          {rows.map((row) => {
            const complete = row.Status === "Complete" || row.Status === "Ready";
            return (
            <article className="checklist-card" data-complete={complete ? "true" : "false"} key={row.Checklist}>
              <span aria-hidden="true">{complete ? "OK" : "!"}</span>
              <div>
                <strong>{row.Checklist}</strong>
                <small>{row.Notes}</small>
              </div>
            </article>
            );
          })}
        </div>
      </div>
      <p className="form-status">
        {readiness.ready && scheduleReady ? "Ready to publish release." : "Resolve missing warnings, then publish or schedule for later."}
      </p>
      <div className="publish-action-row">
        <button className="control-button" disabled={!readiness.ready || !scheduleReady} type="button">
          Publish Release
        </button>
        <button className="control-button secondary" disabled={!readiness.ready} type="button">
          Schedule for Later
        </button>
        <Link className="control-button secondary" href={`/releases/${draft.id}`}>
          Preview Release
        </Link>
      </div>
    </FormSection>
  );
}

function checklistLabel(key: string) {
  const labels: Record<string, string> = {
    track_count: "Track count",
    metadata: "Metadata complete",
    cover_art: "Artwork approved",
    audio: "Audio uploaded",
    track_information: "Track information",
    splits: "Contributors balanced"
  };
  return labels[key] ?? key.replaceAll("_", " ");
}

export function MediaPage({ mode = "all" }: { mode?: "all" | "artwork" | "audio" | "videos" | "loops" }) {
  const draft = primaryDraft();
  const artworkPolicy = getMediaUploadPolicy("single_cover_art");
  const mediaSections = [
    { label: "Cover Art", title: "Cover Art", detail: "PNG, JPG/JPEG, WEBP, or MP4 short visual cover. Minimum 1400x1400, recommended 3000x3000.", mode: "artwork" },
    { label: "Additional Media", title: "Additional Media", detail: "Images, GIFs, MP4/MOV/WEBM loops, and supporting media attached to exact ownership targets.", mode: "all" },
    { label: "Audio Files", title: "Audio Files", detail: "Track-owned MP3, WAV, FLAC, and AIFF upload lanes.", mode: "audio" },
    { label: "Music Videos", title: "Music Videos", detail: "YouTube embeds plus optional visual files for media library organization.", mode: "loops" },
    { label: "Press Photos", title: "Press Photos", detail: "Press-ready images tied to the media library and hero/press ownership.", mode: "press" },
    { label: "Vault Assets", title: "Vault Assets", detail: "Structured archival file storage with optional metadata and versioned uploads.", mode: "vault" }
  ] as const;
  return (
    <>
      <PageHeader
        eyebrow="Media"
        title={mode === "all" ? "Media System" : `${mode[0]?.toUpperCase()}${mode.slice(1)} Uploads`}
        description="Upload, preview, replace, confirm deletion, assign media, and prepare instant frontend sync without changing the public frontend aesthetic."
        actions={[
          { label: "Artwork", href: "/media/artwork" },
          { label: "Audio", href: "/media/audio" },
          { label: "Videos", href: "/media/videos" },
          { label: "Loops", href: "/media/loops" }
        ]}
      />
      <StatusStrip
        items={[
          { label: "Artwork Formats", value: artworkPolicy.extensions.join(", "), tone: "signal" },
          { label: "Cover Max", value: `${artworkPolicy.maxSizeMb}MB`, tone: "vault" },
          { label: "Artwork Minimum", value: "1400x1400", tone: "success" },
          { label: "Recommended", value: "3000x3000", tone: "commerce" },
        ]}
      />
      <HeroConfigPanel />
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="meta-label">Search media</p>
            <h2>Find uploads, drafts, and assignments</h2>
          </div>
        </div>
        <GlobalSearch />
        <div className="module-card-grid media-capability-grid">
          {mediaSections.map((section) => (
            <article className="module-feature-card" key={section.title}>
              <p className="meta-label">{section.label}</p>
              <strong>{section.title}</strong>
              <span>{section.detail}</span>
            </article>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="meta-label">Upload console</p>
            <h2>Replacement, preview, and sync</h2>
          </div>
          <span className="state-badge">Instant frontend sync</span>
        </div>
        <MediaUploadPanel draft={draft ? { id: draft.id, title: draft.title, tracks: draft.tracks } : null} mode={mode} />
      </section>
      <section className="media-library-upload-grid" aria-label="Media library upload zones">
        {mediaSections.map((section) => (
          <article className="panel media-library-zone" key={section.title}>
            <div className="section-heading">
              <div>
                <p className="meta-label">{section.label}</p>
                <h2>{section.title}</h2>
              </div>
            </div>
            <p>{section.detail}</p>
            {section.label === "Music Videos" ? <AudioVisualsPanel /> : null}
            <MediaUploadPanel draft={draft ? { id: draft.id, title: draft.title, tracks: draft.releaseType === "single" ? draft.tracks.slice(0, 1) : draft.tracks } : null} mode={section.mode} />
          </article>
        ))}
      </section>
    </>
  );
}
