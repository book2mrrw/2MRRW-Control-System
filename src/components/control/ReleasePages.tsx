import Link from "next/link";
import { EmptyState, FormSection, PageHeader, StatusStrip, DataTable, WorkflowStepper } from "@/components/control/OperationalPrimitives";
import { CreateReleaseDraftForm, ReleaseMetadataForm, SongwriterContributionForm, TrackInformationForm } from "@/components/control/ReleaseForms";
import { MediaUploadPanel } from "@/components/control/MediaUploadPanel";
import { getMediaUploadPolicy } from "@/server/media/uploadIntentService";
import {
  getReadinessSummary,
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

function releaseRows(drafts: ReleaseManagementDraft[]) {
  return drafts.map((draft) => ({
    Title: draft.title,
    Type: draft.releaseType.toUpperCase(),
    Status: draft.status,
    Readiness: draft.readinessState,
    Tracks: draft.tracks.length,
    Updated: draft.updatedAt.slice(0, 10)
  }));
}

export function ReleaseIndexPage({ status }: { status?: "draft" | "scheduled" | "published" }) {
  const overview = getReleaseManagementOverview();
  const drafts = overview.allReleases.filter((draft) => (status ? draft.status === status : true));
  const title = status ? `${status[0]?.toUpperCase()}${status.slice(1)} Releases` : "Release Management";

  return (
    <>
      <PageHeader
        eyebrow="Distribution operations"
        title={title}
        description="Operate the release pipeline as route-backed workflow software: draft creation, metadata, tracks, splits, assets, readiness, scheduling, and publish gates."
        actions={[
          { label: "New Release", href: "/releases/new" },
          { label: "Drafts", href: "/releases/drafts" },
          { label: "Scheduled", href: "/releases/scheduled" },
          { label: "Published", href: "/releases/published" }
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
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="meta-label">Release records</p>
            <h2>Pipeline table</h2>
          </div>
          <Link className="control-button" href="/releases/new">
            Start Workflow
          </Link>
        </div>
        <DataTable rows={releaseRows(drafts)} />
        <div className="record-link-grid">
          {drafts.map((draft) => (
            <Link className="record-link" href={`/releases/${draft.id}`} key={draft.id}>
              <strong>{draft.title}</strong>
              <span>{draft.releaseType} / {draft.status} / {draft.tracks.length} track(s)</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

export function ReleaseWizardPage({ step }: { step: ReleaseStepId }) {
  const draft = primaryDraft();
  const currentStepIndex = ["basic", "tracks", "songwriters", "isrc", "cover-art", "audio", "lyrics", "review"].indexOf(step);
  const nextStep = ["/releases/new/tracks", "/releases/new/songwriters", "/releases/new/isrc", "/releases/new/cover-art", "/releases/new/audio", "/releases/new/lyrics", "/releases/new/review", "/releases"][currentStepIndex];
  const previousStep = ["/releases", "/releases/new", "/releases/new/tracks", "/releases/new/songwriters", "/releases/new/isrc", "/releases/new/cover-art", "/releases/new/audio", "/releases/new/lyrics"][currentStepIndex];

  return (
    <>
      <PageHeader
        eyebrow="Release wizard"
        title="New Release Workflow"
        description="Every step is a real route that either writes to the existing admin APIs or exposes the exact backend contract needed for integration."
        actions={draft ? [{ label: "Open Draft", href: `/releases/${draft.id}` }] : [{ label: "All Releases", href: "/releases" }]}
      />
      <WorkflowStepper current={step} />
      <section className="panel">
        {step === "basic" ? (
          <>
            <FormSection title="Step 1 Basic Release Information" description="Create a release draft and save distribution-level metadata. Draft creation uses `/api/admin/releases/manage`; metadata saves use `/api/admin/releases/manage/[id]/metadata`.">
              {draft ? <ReleaseMetadataForm draft={draft} /> : <CreateReleaseDraftForm />}
            </FormSection>
          </>
        ) : null}
        {step === "tracks" && draft ? (
          <FormSection title="Step 2 Track Information" description="Track information is edited per-track and persisted through the existing release-management track route.">
            <div className="stack">
              {draft.tracks.map((track) => (
                <article className="sub-panel" key={track.id}>
                  <div className="section-heading">
                    <div>
                      <p className="meta-label">Track {track.position}</p>
                      <h2>{track.title}</h2>
                    </div>
                    <Link className="control-button" href={`/tracks/${track.id}/information`}>
                      Full Track Page
                    </Link>
                  </div>
                  <TrackInformationForm releaseId={draft.id} track={track} />
                </article>
              ))}
            </div>
          </FormSection>
        ) : null}
        {step === "songwriters" && draft ? (
          <FormSection title="Step 3 Songwriter Information" description="Add publishing rows to a track and use exact 100% split validation before review. Producer rows do not count toward ownership totals.">
            <SongwriterContributionForm draft={draft} />
            <SongwriterTable draft={draft} />
          </FormSection>
        ) : null}
        {step === "isrc" && draft ? (
          <FormSection title="Step 4 ISRC Management" description="Assign manual ISRCs or track generated ISRC placeholders per track before distribution handoff.">
            <div className="stack">
              {draft.tracks.map((track) => (
                <TrackInformationForm releaseId={draft.id} track={track} key={track.id} />
              ))}
            </div>
          </FormSection>
        ) : null}
        {step === "cover-art" && draft ? (
          <FormSection title="Step 5 Cover Art Upload" description="Request signed upload intents for release cover art. Policy accepts JPG/JPEG/PNG/GIF static art and MP4 animated loops, not MOV.">
            <MediaUploadPanel draft={{ id: draft.id, title: draft.title, tracks: draft.tracks }} mode="artwork" />
          </FormSection>
        ) : null}
        {step === "audio" && draft ? (
          <FormSection title="Step 6 Audio Upload" description="Request track-scoped upload intents for preview or full-song audio. The service validates MP3/WAV file types and tracks 24-bit / 44.1kHz metadata requirements for masters.">
            <MediaUploadPanel draft={{ id: draft.id, title: draft.title, tracks: draft.tracks }} mode="audio" />
          </FormSection>
        ) : null}
        {step === "lyrics" && draft ? (
          <FormSection title="Step 7 Lyrics Upload" description="Attach lyrics documents to track context and preserve upload-completion state without pretending bytes uploaded when Storage is not configured.">
            <MediaUploadPanel draft={{ id: draft.id, title: draft.title, tracks: draft.tracks }} mode="lyrics" />
          </FormSection>
        ) : null}
        {step === "review" && draft ? <ReviewPanel draft={draft} /> : null}
        {step !== "basic" && !draft ? (
          <EmptyState title="Create a draft first" detail="The route is ready, but workflow steps need a draft release ID before they can persist changes." action={{ label: "Create Draft", href: "/releases/new" }} />
        ) : null}
      </section>
      <nav className="workflow-actions" aria-label="Workflow navigation">
        <Link className="control-button secondary" href={previousStep ?? "/releases"}>
          Back
        </Link>
        <Link className="control-button" href={nextStep ?? "/releases"}>
          Next
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

  return (
    <>
      <PageHeader
        eyebrow="Release workspace"
        title={draft.title}
        description="Route-backed release command page for metadata, tracks, songwriter splits, media states, readiness, and public catalog publish status."
        status={readiness.ready ? "Ready for review" : "Incomplete"}
        actions={[
          { label: "Wizard", href: "/releases/new" },
          { label: "Media", href: "/media" }
        ]}
      />
      <StatusStrip
        items={[
          { label: "Release Type", value: draft.releaseType.toUpperCase(), tone: "signal" },
          { label: "Cover Art", value: draft.coverArtState, tone: draft.coverArtState === "missing" ? "danger" : "success" },
          { label: "Audio", value: draft.audioAssetsState, tone: draft.audioAssetsState === "missing" ? "danger" : "success" },
          { label: "Lyrics", value: draft.lyricsState, tone: "vault" }
        ]}
      />
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="meta-label">Readiness checks</p>
            <h2>Publish gates</h2>
          </div>
        </div>
        <DataTable rows={readiness.checks.map((check) => ({ Gate: check.key, Passed: check.passed ? "Yes" : "No", Message: check.message }))} />
      </section>
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="meta-label">Tracks</p>
            <h2>Track management</h2>
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

  return (
    <>
      <PageHeader
        eyebrow="Track operations"
        title={`Track Information — ${track.title || "Untitled Track"}`}
        description="Dedicated track information page for artist metadata, collaborators, advisory state, language, composition type, ISRCs, and publishing splits."
        actions={[
          { label: "Release", href: `/releases/${draft.id}` },
          { label: "Wizard Step", href: "/releases/new/tracks" }
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
        <FormSection title="Track metadata" description="This form writes through `/api/admin/releases/manage/[id]/tracks/[trackId]`, keeping track metadata out of decorative dashboard cards.">
          <TrackInformationForm releaseId={draft.id} track={track} />
        </FormSection>
      </section>
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="meta-label">Publishing splits</p>
            <h2>Songwriter administration</h2>
          </div>
          <span className="state-badge">{split.message}</span>
        </div>
        <DataTable
          rows={contributions.map((row) => ({
            Contributor: row.contributorName,
            Type: row.contributionType,
            Publisher: row.isPublisher ? "Yes" : "No",
            Split: `${row.ownershipSplit}%`,
            PublisherName: row.publisherName ?? "-"
          }))}
        />
        <SongwriterContributionForm draft={draft} />
      </section>
    </>
  );
}

export function SongwriterTable({ draft }: { draft: ReleaseManagementDraft }) {
  const rows = draft.tracks.flatMap((track) =>
    listTrackContributions(track.id).map((row) => ({
      Track: track.title,
      Contributor: row.contributorName,
      Type: row.contributionType,
      Publisher: row.isPublisher ? "Yes" : "No",
      Split: `${row.ownershipSplit}%`,
      Validation: validateTrackSplits(track.id).message
    }))
  );
  return <DataTable rows={rows} />;
}

function ReviewPanel({ draft }: { draft: ReleaseManagementDraft }) {
  const readiness = getReadinessSummary(draft.id);
  return (
    <FormSection title="Step 8 Review + Publish" description="Review the exact service-layer readiness checks used before publish. Failed checks block public catalog propagation.">
      <DataTable rows={readiness.checks.map((check) => ({ Gate: check.key, Passed: check.passed ? "Yes" : "No", Requirement: check.message }))} />
      <p className="form-status">
        {readiness.ready ? "Ready for publish via the admin publish route." : "Not ready. Resolve all metadata, media, track information, and split checks first."}
      </p>
    </FormSection>
  );
}

export function MediaPage({ mode = "all" }: { mode?: "all" | "artwork" | "audio" | "videos" | "loops" }) {
  const draft = primaryDraft();
  const artworkPolicy = getMediaUploadPolicy("single_cover_art");
  const audioPolicy = getMediaUploadPolicy("audio_full_song");
  return (
    <>
      <PageHeader
        eyebrow="Media operations"
        title={mode === "all" ? "Media Upload System" : `${mode[0]?.toUpperCase()}${mode.slice(1)} Uploads`}
        description="Route-backed upload panels request signed upload intents, enforce file type/owner validation, and never report completed uploads unless the completion contract runs."
        actions={[
          { label: "Artwork", href: "/media/artwork" },
          { label: "Audio", href: "/media/audio" },
          { label: "Videos", href: "/media/videos" },
          { label: "Loops", href: "/media/loops" }
        ]}
      />
      <StatusStrip
        items={[
          { label: "Cover Ext", value: artworkPolicy.extensions.join(", "), tone: "signal" },
          { label: "Cover Max", value: `${artworkPolicy.maxSizeMb}MB`, tone: "vault" },
          { label: "Audio Ext", value: audioPolicy.extensions.join(", "), tone: "success" },
          { label: "Master Max", value: `${audioPolicy.maxSizeMb}MB`, tone: "commerce" }
        ]}
      />
      <section className="panel">
        <MediaUploadPanel draft={draft ? { id: draft.id, title: draft.title, tracks: draft.tracks } : null} mode={mode} />
      </section>
    </>
  );
}
