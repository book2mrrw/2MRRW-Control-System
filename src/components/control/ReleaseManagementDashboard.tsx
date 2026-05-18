import { controlToneStyle } from "@/design/tokens";
import { getCoverArtUploadPolicy } from "@/server/media/mediaAssetService";
import { getReleaseUploadPolicy } from "@/server/media/uploadIntentService";
import { getReleaseManagementOverview } from "@/server/release-management/releaseManagementService";
import { genreTaxonomy, moodStyleOptions } from "@/server/release-management/taxonomies";
import { ReleaseUploadPanel } from "@/components/control/ReleaseUploadPanel";

export function ReleaseManagementDashboard() {
  const overview = getReleaseManagementOverview();
  const coverPolicy = getCoverArtUploadPolicy();
  const primaryDraft = overview.allReleases[0];
  const audioPolicy = getReleaseUploadPolicy("master_audio");

  return (
    <section className="release-management-panel" id="release-management" aria-labelledby="release-management-heading">
      <div className="release-management-heading">
        <div>
          <p className="meta-label">Release Management</p>
          <h2 id="release-management-heading">Artist distribution command lane.</h2>
          <p>
            Draft creation, metadata readiness, songwriter splits, media object state, and publishing gates stay
            in the backend control layer before anything reaches the public website, app, Vault, or streaming
            surfaces.
          </p>
        </div>
        <div className="release-scoreboard" aria-label="Release management summary">
          <div>
            <span>Drafts</span>
            <strong>{overview.accountDashboard.drafts}</strong>
          </div>
          <div>
            <span>Incomplete</span>
            <strong>{overview.accountDashboard.incomplete}</strong>
          </div>
          <div>
            <span>Review Ready</span>
            <strong>{overview.accountDashboard.readyForReview}</strong>
          </div>
        </div>
      </div>

      <div className="release-command-grid">
        <article className="release-command-card" style={controlToneStyle("signal")}>
          <p className="meta-label">Account Dashboard</p>
          <h3>Operating overview</h3>
          <p>Tracks release counts, incomplete work, readiness gates, and publishing state without storefront copy.</p>
          <ul>
            <li>Incomplete Releases: {overview.accountDashboard.incomplete}</li>
            <li>View All Releases: {overview.allReleases.length}</li>
            <li>Published lane: {overview.accountDashboard.published}</li>
          </ul>
        </article>

        <article className="release-command-card" style={controlToneStyle("commerce")}>
          <p className="meta-label">Add New Release</p>
          <h3>Single / Album / EP flow</h3>
          <div className="release-form">
            <label>
              Release type
              <select name="releaseType" defaultValue="single">
                {overview.addNewRelease.map((releaseType) => (
                  <option key={releaseType} value={releaseType}>
                    {releaseType.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Working title
              <input name="title" placeholder="2MRRW release title" />
            </label>
            <p>API-backed draft creation is staged at `/api/admin/releases/manage` for admin-authenticated clients.</p>
          </div>
        </article>

        <article className="release-command-card" style={controlToneStyle("vault")}>
          <p className="meta-label">Track Information</p>
          <h3>Metadata and split control</h3>
          <p>
            Track rows support explicit state, lyric language, live version, composition type, ISRC fields,
            producer names, partner IDs, songwriter bank links, and split totals.
          </p>
          {primaryDraft ? (
            <ul>
              <li>Current draft: {primaryDraft.title}</li>
              <li>Tracks: {primaryDraft.tracks.length}</li>
              <li>Release type: {primaryDraft.releaseType}</li>
            </ul>
          ) : null}
        </article>

        <article className="release-command-card" style={controlToneStyle("success")}>
          <p className="meta-label">Media Object Readiness</p>
          <h3>Cover, audio, lyrics</h3>
          <p>
            Cover art policy is metadata-driven and aligned with the protected media layer before Storage/CDN
            integration.
          </p>
          <ul>
            <li>Extensions: {coverPolicy.allowedExtensions.join(", ")}</li>
            <li>
              Target size: {coverPolicy.targetSizeMb.min}-{coverPolicy.targetSizeMb.max}MB
            </li>
            <li>Preferred: {coverPolicy.preferredDimensions.width}px square</li>
          </ul>
        </article>
      </div>

      <article className="release-command-card release-upload-card" style={controlToneStyle("signal")}>
        <p className="meta-label">Mobile / Desktop Upload Foundation</p>
        <h3>Direct-to-storage release assets</h3>
        <p>
          Admin clients request a signed upload intent, then send files directly to the private
          `protected-media` bucket without proxying large phone or desktop uploads through Next.js.
        </p>
        <ul>
          <li>Audio: {audioPolicy.extensions.join(", ")} up to {audioPolicy.maxSizeMb}MB for current direct intents.</li>
          <li>Full songs target 24-bit / 44.1kHz; media probing is tracked as required metadata until transcoding/probing is wired.</li>
          <li>Singles and albums cover cards accept JPG/JPEG/PNG/GIF static art or MP4 animated loops, not MOV.</li>
          <li>Upload cards cover singles, albums, 2MRRW Signal, collector cards, audio previews, audio full songs, and retained Radio assets.</li>
          <li>Storage prefixes stay organized by owner: singles, albums, previews, masters, signal, collectors, and radio.</li>
        </ul>
        <ReleaseUploadPanel draft={primaryDraft ? { id: primaryDraft.id, title: primaryDraft.title, tracks: primaryDraft.tracks } : null} />
      </article>

      <div className="release-taxonomy-strip" aria-label="Release metadata selectors">
        <div>
          <span>Genre Taxonomy</span>
          <strong>{genreTaxonomy.map((genre) => genre.label).join(" / ")}</strong>
        </div>
        <div>
          <span>Mood / Style</span>
          <strong>{moodStyleOptions.slice(0, 5).join(" / ")}</strong>
        </div>
      </div>
    </section>
  );
}
