"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ComponentType, type ReactNode } from "react";
import {
  BarChart3,
  Bell,
  ChevronLeft,
  ChevronRight,
  Eye,
  Gauge,
  Images,
  Package,
  Plus,
  Search,
  Settings,
  ShoppingBag
} from "lucide-react";
import { controlToneStyle } from "@/design/tokens";
import { primaryNavigation } from "@/components/control/OperationalData";
import { useReleaseControl } from "@/components/control/ReleaseControlStore";

function NavigationIcon({ label }: { label: string }) {
  const icons: Record<string, ComponentType<{ size?: number; strokeWidth?: number }>> = {
    Dashboard: Gauge,
    Releases: Package,
    Media: Images,
    "Hero Editor": Eye,
    Analytics: BarChart3,
    Shop: ShoppingBag,
    Settings
  };
  const Icon = icons[label] ?? Gauge;

  return <Icon size={18} strokeWidth={2} />;
}

function pageTitle(pathname: string) {
  const match = primaryNavigation.find((item) => pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`)));
  if (pathname.startsWith("/releases/new")) return "Add Release";
  return match?.label ?? "Dashboard";
}

function pageSubtitle(pathname: string) {
  if (pathname.startsWith("/releases/new")) return "Five-step release workflow";
  if (pathname.startsWith("/media")) return "Uploads, ownership, and sync";
  if (pathname.startsWith("/analytics")) return "Streams, platforms, and signals";
  if (pathname.startsWith("/shop")) return "Merch performance analytics";
  if (pathname.startsWith("/settings")) return "Profile, memory, and defaults";
  return "Creator Studio";
}

export function OperationalShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { setPreviewOpen } = useReleaseControl();

  return (
    <div className="control-shell" data-sidebar-collapsed={collapsed ? "true" : "false"}>
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
            <small>Creator Studio</small>
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
                <NavigationIcon label={item.label} />
                <strong>{item.label}</strong>
                <small>{item.detail}</small>
              </Link>
            );
          })}
        </nav>
        <footer className="sidebar-footer">
          <div className="sidebar-profile">
            <span aria-hidden="true">2M</span>
            <strong>2MRRW</strong>
            <small>Creator Studio</small>
          </div>
          <button className="sidebar-collapse-button" onClick={() => setCollapsed((current) => !current)} type="button">
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            <span>{collapsed ? "Expand" : "Collapse"}</span>
          </button>
        </footer>
      </aside>
      <div className="app-main">
        <header className="top-status" aria-label="Control system status">
          <div className="topbar-title">
            <p className="meta-label">{pageSubtitle(pathname)}</p>
            <strong>{pageTitle(pathname)}</strong>
          </div>
          <div className="top-status-cluster">
            <button className="topbar-icon-button" type="button" aria-label="Search">
              <Search size={17} />
            </button>
            <button className="topbar-icon-button" type="button" aria-label="Notifications">
              <Bell size={17} />
            </button>
            <button className="topbar-live-site" type="button" onClick={() => setPreviewOpen(true)}>
              <Eye size={16} />
              View Live Site
            </button>
            <Link className="topbar-new-release" href="/releases/new">
              <Plus size={16} />
              New Release
            </Link>
          </div>
        </header>
        <main className="workspace" id="control-workspace">
          {children}
        </main>
      </div>
    </div>
  );
}
