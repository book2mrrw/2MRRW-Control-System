"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { controlToneStyle } from "@/design/tokens";
import { primaryNavigation } from "@/components/control/OperationalData";

export function OperationalShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="control-shell">
      <a className="skip-link" href="#control-workspace">
        Skip to workspace
      </a>
      <div className="ambient-grid" aria-hidden="true" />
      <aside className="app-sidebar" aria-label="2MRRW operational navigation">
        <Link className="brand-lockup" href="/dashboard">
          <span className="brand-mark" aria-hidden="true">
            2M
          </span>
          <span>
            <strong>2MRRW</strong>
            <small>Control System</small>
          </span>
        </Link>
        <nav className="control-rail">
          {primaryNavigation.map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className="rail-link"
                data-active={active ? "true" : "false"}
                href={item.href}
                key={item.href}
                style={controlToneStyle(item.tone)}
              >
                <span aria-hidden="true" />
                <strong>{item.label}</strong>
                <small>{item.detail}</small>
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="app-main">
        <header className="top-status" aria-label="Control system status">
          <div>
            <p className="meta-label">Backend CMS</p>
            <strong>Operational release management</strong>
          </div>
          <div className="top-status-cluster">
            <span>Route-backed workflows</span>
            <span>Admin API contracts</span>
            <span>Dark compact UI</span>
          </div>
        </header>
        <main className="workspace" id="control-workspace">
          {children}
        </main>
      </div>
    </div>
  );
}
