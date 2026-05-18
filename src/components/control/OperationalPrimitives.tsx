import Link from "next/link";
import type { ReactNode } from "react";
import { controlToneStyle, type ControlTone } from "@/design/tokens";
import { releaseSteps, type ReleaseStepId } from "@/components/control/OperationalData";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions = [],
  status
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: Array<{ label: string; href: string }>;
  status?: string;
}) {
  return (
    <header className="page-header">
      <div>
        <p className="meta-label">{eyebrow}</p>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      <div className="page-header-actions">
        {status ? <span className="state-badge">{status}</span> : null}
        {actions.map((action) => (
          <Link className="control-button" href={action.href} key={action.href}>
            {action.label}
          </Link>
        ))}
      </div>
    </header>
  );
}

export function StatusStrip({ items }: { items: Array<{ label: string; value: string; tone?: ControlTone }> }) {
  return (
    <section className="status-grid" aria-label="Status summary">
      {items.map((item) => (
        <div className="status-pill" key={item.label} style={controlToneStyle(item.tone ?? "signal")}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </section>
  );
}

export function OperationalCard({
  eyebrow,
  title,
  detail,
  href,
  tone = "signal",
  meta
}: {
  eyebrow: string;
  title: string;
  detail: string;
  href: string;
  tone?: ControlTone;
  meta?: string;
}) {
  return (
    <Link className="operation-card" href={href} style={controlToneStyle(tone)}>
      <div className="card-header">
        <div>
          <p className="meta-label">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <span className="state-badge">Open</span>
      </div>
      <p>{detail}</p>
      {meta ? <strong>{meta}</strong> : null}
    </Link>
  );
}

export function WorkflowStepper({ current }: { current: ReleaseStepId }) {
  const currentIndex = releaseSteps.findIndex((step) => step.id === current);
  return (
    <nav className="workflow-stepper" aria-label="Release workflow steps">
      {releaseSteps.map((step, index) => {
        const state = index < currentIndex ? "done" : index === currentIndex ? "active" : "queued";
        const label = state === "done" ? "Complete" : state === "active" ? "Active" : "Queued";
        return (
          <Link className="workflow-step" data-active={step.id === current ? "true" : "false"} data-state={state} href={step.href} key={step.id}>
            <span>{index + 1}</span>
            <strong>{step.label}</strong>
            <small>{label}</small>
          </Link>
        );
      })}
    </nav>
  );
}

export function DataTable({ rows }: { rows: Array<Record<string, string | number | boolean | null | undefined>> }) {
  const columns = rows[0] ? Object.keys(rows[0]) : [];
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={Math.max(columns.length, 1)}>Nothing here yet.</td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index}>
                {columns.map((column) => (
                  <td key={column}>{String(row[column] ?? "-")}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function FormSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="form-section">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ title, detail, action }: { title: string; detail: string; action?: { label: string; href: string } }) {
  return (
    <section className="empty-state">
      <h2>{title}</h2>
      <p>{detail}</p>
      {action ? (
        <Link className="control-button" href={action.href}>
          {action.label}
        </Link>
      ) : null}
    </section>
  );
}
