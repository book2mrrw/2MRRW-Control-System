import { notFound } from "next/navigation";
import { modulePages } from "@/components/control/OperationalData";
import { DataTable, OperationalCard, PageHeader } from "@/components/control/OperationalPrimitives";
import { AudioVisualsPanel } from "@/components/control/AudioVisualsPanel";
import { CircleActivityPanel } from "@/components/control/CircleActivityPanel";

export function ModulePage({ module }: { module: keyof typeof modulePages }) {
  const config = modulePages[module];
  if (!config) notFound();

  return (
    <>
      <PageHeader eyebrow={config.eyebrow} title={config.title} description={config.description} actions={config.actions} />
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="meta-label">Management table</p>
            <h2>Operational records</h2>
          </div>
        </div>
        <DataTable rows={config.rows} />
      </section>
      {module === "visuals" ? <AudioVisualsPanel /> : null}
      {module === "circle" ? <CircleActivityPanel /> : null}
      <section className="operation-grid">
        <OperationalCard eyebrow="Route entry" title="Releases" detail="Open release workflow records and readiness gates." href="/releases" tone="signal" />
        <OperationalCard eyebrow="Route entry" title="Media" detail="Open upload-intent panels and storage policy lanes." href="/media" tone="vault" />
        <OperationalCard eyebrow="Route entry" title="Audit" detail="Review validation gates and integration risks." href="/audit" tone="danger" />
      </section>
    </>
  );
}
