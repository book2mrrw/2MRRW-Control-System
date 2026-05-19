import { primaryNavigation } from "@/components/control/OperationalData";
import { OperationalCard, PageHeader, StatusStrip } from "@/components/control/OperationalPrimitives";
import { getReleaseManagementOverview } from "@/server/release-management/releaseManagementService";

export function ControlShell() {
  const overview = getReleaseManagementOverview();

  return (
    <>
      <PageHeader
        eyebrow="Command overview"
        title="2MRRW Artist Control"
        description="Release-first entry points for releases, media, analytics, revenue, Circle, and settings."
        actions={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "+ Create Release", href: "/releases/new" }
        ]}
      />
      <StatusStrip
        items={[
          { label: "Release Drafts", value: String(overview.accountDashboard.drafts), tone: "signal" },
          { label: "Incomplete", value: String(overview.accountDashboard.incomplete), tone: "danger" },
          { label: "Review Ready", value: String(overview.accountDashboard.readyForReview), tone: "success" },
          { label: "Published", value: String(overview.accountDashboard.published), tone: "commerce" }
        ]}
      />
      <section className="operation-grid">
        {primaryNavigation.map((item) => (
          <OperationalCard
            detail={item.detail}
            eyebrow="Open"
            href={item.href}
            key={item.href}
            title={item.label}
            tone={item.tone}
          />
        ))}
      </section>
    </>
  );
}
