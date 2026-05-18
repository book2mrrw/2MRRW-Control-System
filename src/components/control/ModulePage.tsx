import { notFound } from "next/navigation";
import { modulePages } from "@/components/control/OperationalData";
import { OperationalCard, PageHeader, StatusStrip } from "@/components/control/OperationalPrimitives";
import { AudioVisualsPanel } from "@/components/control/AudioVisualsPanel";
import { CircleActivityPanel } from "@/components/control/CircleActivityPanel";
import { GlobalSearch } from "@/components/control/GlobalSearch";

export function ModulePage({ module }: { module: keyof typeof modulePages }) {
  const config = modulePages[module];
  if (!config) notFound();
  const specializedSections: Partial<Record<keyof typeof modulePages, Array<{ label: string; title: string; detail: string }>>> = {
    analytics: [
      { label: "Streams", title: "Stream analytics", detail: "Release streams, track velocity, playlist movement, and performance by time period." },
      { label: "Listeners", title: "Listener analytics", detail: "Audience growth, returning listeners, saves, follows, and engagement quality." },
      { label: "Geo", title: "Geo analytics", detail: "Top cities, countries, regions, and localized fan movement." },
      { label: "Platforms", title: "Platform analytics", detail: "Spotify, Apple Music, YouTube, storefront, vault, and owned-channel performance." },
      { label: "Top content", title: "Top content", detail: "Best-performing releases, tracks, videos, vault assets, and shop-linked content." },
      { label: "Revenue", title: "Revenue tracking", detail: "Royalties, product revenue, subscriptions, payouts, and release-level earning signals." }
    ],
    shop: [
      { label: "Merch", title: "Merch management", detail: "Products, variants, drop status, inventory notes, and release-linked bundles." },
      { label: "360", title: "Cinematic 360 viewer", detail: "Product spin structure for premium presentation and app-ready product detail pages." },
      { label: "Shopify", title: "Shopify integration", detail: "Commerce sync layer for products, checkout, orders, and storefront references." },
      { label: "Printful", title: "Printful support", detail: "Fulfillment provider slots for print-on-demand apparel and physical goods." },
      { label: "Ghost", title: "Floating ghost mannequin", detail: "Premium apparel visualization system for clean black-canvas product media." }
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
            <p className="meta-label">{module === "analytics" ? "Signal view" : module === "shop" ? "Commerce studio" : module === "settings" ? "Defaults and memory" : "Workspace"}</p>
            <h2>{module === "analytics" ? "Creator analytics" : module === "shop" ? "Shop operating system" : module === "settings" ? "Control preferences" : "Current items"}</h2>
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
