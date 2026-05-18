import { OperationalCard, PageHeader, StatusStrip } from "@/components/control/OperationalPrimitives";
import { getReleaseManagementOverview } from "@/server/release-management/releaseManagementService";

const cards = [
  { href: "/releases", eyebrow: "Distribution", title: "Release Management", detail: "Drafts, metadata, track information, songwriter splits, ISRCs, upload gates, and publish readiness.", tone: "signal" as const },
  { href: "/media", eyebrow: "Assets", title: "Media Uploads", detail: "Signed upload intents for artwork, audio masters, videos, loops, lyrics, vault, and collector assets.", tone: "vault" as const },
  { href: "/analytics", eyebrow: "Signals", title: "Analytics", detail: "Streaming validity, playback events, country summaries, and listener state.", tone: "success" as const },
  { href: "/commerce", eyebrow: "Revenue", title: "Commerce", detail: "Checkout creation, webhook fulfillment, product grants, and entitlement checks.", tone: "commerce" as const },
  { href: "/audit", eyebrow: "Risk", title: "Audit", detail: "Release gate failures, media access checks, admin writes, and integration readiness.", tone: "danger" as const },
  { href: "/settings", eyebrow: "Config", title: "Settings", detail: "Operational configuration, environment posture, and integration policy references.", tone: "vault" as const }
];

export default function DashboardPage() {
  const overview = getReleaseManagementOverview();
  return (
    <>
      <PageHeader
        eyebrow="Operational dashboard"
        title="2MRRW backend control center"
        description="Compact route-based command surface for music distribution operations. Every card opens a real workflow route."
        actions={[
          { label: "New Release", href: "/releases/new" },
          { label: "Upload Media", href: "/media" }
        ]}
      />
      <StatusStrip
        items={[
          { label: "Release Drafts", value: String(overview.accountDashboard.drafts), tone: "signal" },
          { label: "Incomplete", value: String(overview.accountDashboard.incomplete), tone: "danger" },
          { label: "Ready Review", value: String(overview.accountDashboard.readyForReview), tone: "success" },
          { label: "Route Model", value: "Operational", tone: "vault" }
        ]}
      />
      <section className="operation-grid">
        {cards.map((card) => (
          <OperationalCard key={card.href} {...card} />
        ))}
      </section>
    </>
  );
}
