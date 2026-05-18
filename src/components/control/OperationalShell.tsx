"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { controlToneStyle } from "@/design/tokens";
import { GlobalSearch } from "@/components/control/GlobalSearch";
import { primaryNavigation } from "@/components/control/OperationalData";

function NavigationIcon({ label }: { label: string }) {
  const paths: Record<string, string> = {
    Dashboard: "M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3V10.5Z",
    Releases: "M5 5h14v14H5V5Zm3 3v8h8V8H8Z",
    Media: "M4 7h16v10H4V7Zm3 3 3 3 2-2 5 4",
    Analytics: "M5 19V9m7 10V5m7 14v-7",
    Shop: "M6 8h12l-1 12H7L6 8Zm2-3h8l2 3H6l2-3Z",
    Settings: "M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0-5v3m0 12v3M3 12h3m12 0h3"
  };
  const path = paths[label] ?? "M5 12h14";

  return (
    <svg aria-hidden="true" className="rail-icon" viewBox="0 0 24 24">
      <path d={path} />
    </svg>
  );
}

export function OperationalShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="control-shell">
      <a className="skip-link" href="#control-workspace">
        Skip to workspace
      </a>
      <div className="ambient-grid" aria-hidden="true" />
      <aside className="app-sidebar" aria-label="2MRRW artist control navigation">
        <Link className="brand-lockup" href="/dashboard">
          <span className="brand-mark" aria-hidden="true">
            2M
          </span>
          <span>
            <strong>2MRRW</strong>
            <small>Creator Release System</small>
          </span>
        </Link>
        <div className="sidebar-system-card">
          <p className="meta-label">Creator OS</p>
          <strong>Release-first workspace</strong>
          <small>Drafts, media, analytics, sync, and publishing stay in one calm operational surface.</small>
        </div>
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
                <NavigationIcon label={item.label} />
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
            <p className="meta-label">Backend Creator OS</p>
            <strong>Sequential releases, quiet sync, premium control</strong>
          </div>
          <GlobalSearch />
          <div className="top-status-cluster">
            <span>Autosave ready</span>
            <span>Media pipeline</span>
            <span>Frontend sync guarded</span>
          </div>
        </header>
        <main className="workspace" id="control-workspace">
          {children}
        </main>
      </div>
    </div>
  );
}
