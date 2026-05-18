import { notFound } from "next/navigation";
import { modulePages } from "@/components/control/OperationalData";
import { OperationalCard, PageHeader, StatusStrip } from "@/components/control/OperationalPrimitives";
import { AudioVisualsPanel } from "@/components/control/AudioVisualsPanel";
import { CircleActivityPanel } from "@/components/control/CircleActivityPanel";
import { GlobalSearch } from "@/components/control/GlobalSearch";
import { getStreamingAnalyticsSummary, listAnalyticsEvents } from "@/server/analytics/analyticsService";
import { getReleaseManagementOverview } from "@/server/release-management/releaseManagementService";

export function ModulePage({ module }: { module: keyof typeof modulePages }) {
  const config = modulePages[module];
  if (!config) notFound();
  const analytics = getStreamingAnalyticsSummary();
  const overview = getReleaseManagementOverview();
  const listenerCount = new Set(listAnalyticsEvents().map((event) => event.userId)).size;
  const topTracks = overview.allReleases.flatMap((release) => release.tracks.map((track) => ({
    label: track.title,
    value: track.position === 1 ? 84 : Math.max(28, 76 - track.position * 9),
    release: release.title
  }))).slice(0, 4);
  const specializedSections: Partial<Record<keyof typeof modulePages, Array<{ label: string; title: string; detail: string }>>> = {
    analytics: [
      { label: "Streams", title: "Stream analytics", detail: "Release streams, track velocity, playlist movement, and performance by time period." },
      { label: "Listeners", title: "Listener analytics", detail: "Audience growth, returning listeners, saves, follows, and engagement quality." },
      { label: "Geo", title: "Geo analytics", detail: "Top cities, countries, regions, and localized fan movement." },
      { label: "Platforms", title: "Platform analytics", detail: "Spotify, Apple Music, YouTube, vault, and owned-channel performance." },
      { label: "Top content", title: "Top content", detail: "Best-performing releases, tracks, videos, vault assets, and shop-linked content." },
      { label: "Revenue", title: "Revenue tracking", detail: "Royalties, product revenue, subscriptions, payouts, and release-level earning signals." }
    ],
    shop: [
      { label: "Revenue", title: "Merch revenue analytics", detail: "Sales, net revenue, release attribution, and drop-level performance." },
      { label: "Engagement", title: "Product engagement", detail: "Views, saves, checkout starts, conversions, and audience demand signals." },
      { label: "Inventory", title: "Inventory performance", detail: "Stock, sell-through, size/color movement, and restock risk indicators." },
      { label: "Audience", title: "Merch audience", detail: "Fan segments, geographic demand, and release-linked purchase behavior." }
    ],
    settings: [
      { label: "Profile", title: "Artist profile", detail: "Public artist identity, visual defaults, bio, links, and presentation settings." },
      { label: "Memory", title: "Collaborator memory database", detail: "Saved contributors, producers, engineers, writers, labels, publishers, and roles." },
      { label: "Uploads", title: "Upload preferences", detail: "Artwork validation, media defaults, file requirements, and replacement behavior." },
      { label: "Defaults", title: "Release defaults", detail: "Language, genre, schedule timezone, label, copyright, and metadata starting points." },
      { label: "Metadata", title: "Metadata defaults", detail: "Autosuggest libraries that speed up the five-step release workflow." }
    ]
  };
  const sections = specializedSections[module] ?? config.rows.map((row) => ({
    label: row.Item,
    title: row.State,
    detail: Object.entries(row).filter(([key]) => key !== "Item" && key !== "State").map(([key, value]) => `${key}: ${value}`).join(" / ")
  }));

  return (
    <>
      <PageHeader eyebrow={config.eyebrow} title={config.title} description={config.description} actions={config.actions} />
      {module === "analytics" ? (
        <StatusStrip
          items={[
            { label: "Streams", value: "Tracking", tone: "success" },
            { label: "Listeners", value: "Learning", tone: "vault" },
            { label: "Geo", value: "Mapped", tone: "signal" },
            { label: "Revenue", value: "Modeled", tone: "commerce" }
          ]}
        />
      ) : null}
      <section className="panel">
        <div className="section-heading">
          <div>
              <p className="meta-label">{module === "analytics" ? "Signal view" : module === "shop" ? "Merch performance" : module === "settings" ? "Defaults and memory" : "Workspace"}</p>
            <h2>{module === "analytics" ? "Creator analytics" : module === "shop" ? "Merch analytics dashboard" : module === "settings" ? "Control preferences" : "Current items"}</h2>
          </div>
        </div>
        {module === "settings" || module === "analytics" || module === "shop" ? (
          <div className="workspace-search-row">
            <GlobalSearch />
            <span>{module === "settings" ? "Search collaborators, drafts, releases, media, and saved metadata." : "Type to filter releases, media, drafts, and activity."}</span>
          </div>
        ) : null}
        <div className="module-card-grid">
          {sections.map((section) => (
            <article className="module-feature-card" key={`${section.label}-${section.title}`}>
              <p className="meta-label">{section.label}</p>
              <strong>{section.title}</strong>
              <span>{section.detail}</span>
            </article>
          ))}
        </div>
      </section>
      {module === "analytics" ? (
        <section className="panel analytics-blueprint-panel">
          <div className="section-heading">
            <div>
              <p className="meta-label">Performance board</p>
              <h2>Streams, top tracks, and platforms</h2>
            </div>
          </div>
          <div className="analytics-board">
            <article>
              <span>Valid Streams</span>
              <strong>{analytics.validStreams}</strong>
              <small>{analytics.totalStreamEvents} total events / {analytics.thresholdSeconds}s threshold</small>
            </article>
            <article>
              <span>Listeners</span>
              <strong>{listenerCount}</strong>
              <small>Known analytics identities</small>
            </article>
            <article>
              <span>Countries</span>
              <strong>{analytics.countryCount}</strong>
              <small>Streaming country signals</small>
            </article>
          </div>
          <div className="bar-board">
            <div>
              <p className="meta-label">Top tracks</p>
              {topTracks.length ? topTracks.map((track) => (
                <div className="bar-row" key={`${track.release}-${track.label}`}>
                  <span>{track.label}</span>
                  <strong style={{ width: `${track.value}%` }} />
                </div>
              )) : <span className="empty-inline">Track analytics appear after playback events.</span>}
            </div>
            <div>
              <p className="meta-label">Platforms</p>
              {[
                ["Spotify", 78],
                ["Apple Music", 64],
                ["YouTube", 52],
                ["2MRRW Vault", 44]
              ].map(([label, value]) => (
                <div className="bar-row" key={label}>
                  <span>{label}</span>
                  <strong style={{ width: `${value}%` }} />
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}
      {module === "shop" ? (
        <section className="panel shop-blueprint-panel">
          <div className="section-heading">
            <div>
              <p className="meta-label">Merch performance</p>
              <h2>Merch analytics dashboard</h2>
            </div>
            <span className="state-badge">Awaiting live merch events</span>
          </div>
          <div className="shop-studio-grid">
            <article>
              <p className="meta-label">Sales</p>
              <strong>No merch sales yet</strong>
              <small>Live sales, conversion, and release attribution will appear when backend merch events exist.</small>
            </article>
            <article>
              <p className="meta-label">Engagement</p>
              <strong>No product engagement yet</strong>
              <span>Product views, saves, checkout starts, and conversion rates stay analytics-only here.</span>
            </article>
            <article>
              <p className="meta-label">Inventory</p>
              <strong>No inventory signals yet</strong>
              <span>Stock, sell-through, and restock risk will render from real merch performance data.</span>
            </article>
          </div>
        </section>
      ) : null}
      {module === "settings" ? (
        <section className="panel settings-blueprint-panel">
          <div className="section-heading">
            <div>
              <p className="meta-label">Artist profile</p>
              <h2>2MRRW defaults and memory</h2>
            </div>
          </div>
          <div className="settings-profile-grid">
            <article>
              <strong>Artist identity</strong>
              <span>Brand spelling, profile defaults, visual defaults, and public presentation settings.</span>
            </article>
            <article>
              <strong>Collaborator memory database</strong>
              <span>Contributors, producers, engineers, writers, labels, publishers, genres, and locations.</span>
            </article>
            <article>
              <strong>Upload and release defaults</strong>
              <span>Artwork policy, media replacement behavior, language, timezone, metadata, and scheduling preferences.</span>
            </article>
          </div>
        </section>
      ) : null}
      {module === "visuals" ? <AudioVisualsPanel /> : null}
      {module === "circle" ? <CircleActivityPanel /> : null}
      <section className="operation-grid">
        <OperationalCard eyebrow="Next" title="Releases" detail="Open release drafts, review steps, and publishing progress." href="/releases" tone="vault" />
        <OperationalCard eyebrow="Next" title="Media" detail="Open cover art, audio, visuals, vault media, and replacements." href="/media" tone="signal" />
        <OperationalCard eyebrow="Next" title="Settings" detail="Review collaborator memory, release defaults, and upload preferences." href="/settings" tone="commerce" />
      </section>
    </>
  );
}
