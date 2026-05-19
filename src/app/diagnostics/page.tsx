import { PageHeader, StatusStrip } from "@/components/control/OperationalPrimitives";

export default function DiagnosticsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Diagnostics"
        title="System status (stabilization)"
        description="Lightweight summary while full ingestion diagnostics are deferred. Use /api/health/* for live probes."
      />
      <StatusStrip
        items={[
          { label: "Mode", value: "stabilized", tone: "signal" },
          { label: "Catalog", value: "client-fetch", tone: "vault" },
          { label: "Layout", value: "empty SSR", tone: "commerce" },
          { label: "Probes", value: "/api/health/*", tone: "success" }
        ]}
      />
      <section className="panel">
        <p>
          Full table scans and ingestion integrity reports are disabled during stabilization to prevent build
          timeouts and 504s. Check <code>/api/health/basic</code>, <code>/api/health/db</code>, and{" "}
          <code>/api/health/storage</code> for runtime health.
        </p>
      </section>
    </>
  );
}
