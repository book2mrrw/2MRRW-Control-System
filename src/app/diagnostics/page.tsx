import { PageHeader, DataTable, StatusStrip } from "@/components/control/OperationalPrimitives";
import { buildIngestionDiagnosticsReport } from "@/server/diagnostics/ingestionDiagnosticsService";
import { ensureCatalogHydrated } from "@/server/release-management/frontendReleaseIngestionService";

export default async function DiagnosticsPage() {
  await ensureCatalogHydrated();
  const report = await buildIngestionDiagnosticsReport();

  return (
    <>
      <PageHeader
        eyebrow="Diagnostics"
        title="Ingestion & sync integrity"
        description="Missing relationships, orphans, duplicate slugs, and sync conflicts from Supabase."
      />
      <StatusStrip
        items={[
          { label: "Releases", value: String(report.tableCounts.releases ?? 0), tone: "signal" },
          { label: "Tracks", value: String(report.tableCounts.tracks ?? 0), tone: "vault" },
          { label: "Media", value: String(report.tableCounts.media_assets ?? 0), tone: "commerce" },
          { label: "Links", value: String(report.tableCounts.release_media ?? 0), tone: "success" }
        ]}
      />
      <section className="panel">
        <DataTable
          rows={Object.entries(report.tableCounts).map(([table, count]) => ({
            Table: table,
            Rows: String(count)
          }))}
        />
      </section>
      <section className="panel">
        <DataTable
          rows={report.missingRelationships.map((row) => ({
            Slug: row.slug,
            Issue: row.issue,
            "Release ID": row.releaseId
          }))}
        />
      </section>
      <section className="panel">
        <DataTable
          rows={[
            ...report.duplicateSlugs.map((slug) => ({ Type: "duplicate_slug", Detail: slug })),
            ...report.orphanMediaAssets.map((asset) => ({ Type: "orphan_media", Detail: asset.storagePath })),
            ...report.syncConflicts.map((row) => ({ Type: "sync_conflict", Detail: `${row.key}: ${row.detail}` }))
          ]}
        />
      </section>
    </>
  );
}
