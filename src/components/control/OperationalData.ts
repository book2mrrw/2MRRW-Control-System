import type { ControlTone } from "@/design/tokens";

export type NavItem = {
  href: string;
  label: string;
  detail: string;
  tone: ControlTone;
};

export const primaryNavigation: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", detail: "Operating overview", tone: "signal" },
  { href: "/releases", label: "Releases", detail: "Release pipeline", tone: "signal" },
  { href: "/media", label: "Media", detail: "Upload operations", tone: "signal" },
  { href: "/visuals", label: "Visuals", detail: "Video embeds", tone: "signal" },
  { href: "/vault", label: "Vault", detail: "Protected catalog", tone: "vault" },
  { href: "/analytics", label: "Analytics", detail: "Stream signals", tone: "success" },
  { href: "/identity", label: "Identity", detail: "Access control", tone: "vault" },
  { href: "/commerce", label: "Commerce", detail: "Checkout ops", tone: "commerce" },
  { href: "/notify", label: "Notify", detail: "Inbox dispatch", tone: "signal" },
  { href: "/audit", label: "Audit", detail: "Risk review", tone: "danger" },
  { href: "/signal", label: "Signal", detail: "Transmission state", tone: "signal" },
  { href: "/circle", label: "Circle", detail: "Community events", tone: "signal" },
  { href: "/settings", label: "Settings", detail: "System config", tone: "vault" }
];

export const releaseSteps = [
  { id: "basic", label: "Basic Release Information", href: "/releases/new" },
  { id: "tracks", label: "Track Information", href: "/releases/new/tracks" },
  { id: "songwriters", label: "Songwriter Information", href: "/releases/new/songwriters" },
  { id: "isrc", label: "ISRC Management", href: "/releases/new/isrc" },
  { id: "cover-art", label: "Cover Art Upload", href: "/releases/new/cover-art" },
  { id: "audio", label: "Audio Upload", href: "/releases/new/audio" },
  { id: "lyrics", label: "Lyrics Upload", href: "/releases/new/lyrics" },
  { id: "review", label: "Review + Publish", href: "/releases/new/review" }
] as const;

export type ReleaseStepId = (typeof releaseSteps)[number]["id"];

export const modulePages: Record<
  string,
  {
    title: string;
    eyebrow: string;
    description: string;
    tone: ControlTone;
    actions: Array<{ label: string; href: string }>;
    rows: Array<Record<string, string>>;
  }
> = {
  visuals: {
    title: "Visuals Management",
    eyebrow: "Video operations",
    description: "Manage official YouTube visual records, release links, publishing state, and embed readiness.",
    tone: "signal",
    actions: [{ label: "Create visual record", href: "/visuals#create" }, { label: "Review media", href: "/media/videos" }],
    rows: [
      { Item: "Official music video", State: "Draft queue", Contract: "/api/admin/audio-visuals" },
      { Item: "Release visualizer", State: "Embeddable", Contract: "/api/audio-visuals" }
    ]
  },
  vault: {
    title: "Vault Management",
    eyebrow: "Protected media",
    description: "Operate gated content, signed media access, entitlement checks, and vault upload readiness.",
    tone: "vault",
    actions: [{ label: "Upload vault asset", href: "/media/loops" }, { label: "Review identity", href: "/identity" }],
    rows: [
      { Item: "Founder Room", State: "Entitled", Contract: "/api/vault/content" },
      { Item: "Session notes", State: "Signed URL required", Contract: "/api/vault/content/[id]/media" }
    ]
  },
  analytics: {
    title: "Analytics Operations",
    eyebrow: "Streaming signal",
    description: "Track valid streams, playback events, country aggregation, and listener thresholds.",
    tone: "success",
    actions: [{ label: "Audit playback events", href: "/audit" }, { label: "Open signal", href: "/signal" }],
    rows: [
      { Item: "Valid stream threshold", State: "30 seconds", Contract: "/api/analytics/events" },
      { Item: "Playback progress", State: "Persisted", Contract: "/api/playback/progress" }
    ]
  },
  identity: {
    title: "Identity + Permissions",
    eyebrow: "Access resolver",
    description: "Inspect account state, membership grants, library permissions, and admin-only control paths.",
    tone: "vault",
    actions: [{ label: "Review vault grants", href: "/vault" }, { label: "Commerce grants", href: "/commerce" }],
    rows: [
      { Item: "Admin headers", State: "Server gated", Contract: "x-admin protected APIs" },
      { Item: "Entitlements", State: "Derived", Contract: "/api/account/state" }
    ]
  },
  commerce: {
    title: "Commerce Operations",
    eyebrow: "Checkout + fulfillment",
    description: "Manage product readiness, checkout creation, webhook fulfillment, and post-payment access grants.",
    tone: "commerce",
    actions: [{ label: "Audit webhooks", href: "/audit" }, { label: "Inspect identity", href: "/identity" }],
    rows: [
      { Item: "Checkout session", State: "Webhook gated", Contract: "/api/checkout" },
      { Item: "Membership grant", State: "Idempotent", Contract: "/api/stripe/webhook" }
    ]
  },
  notify: {
    title: "Notify Center",
    eyebrow: "Dispatch queue",
    description: "Operate inbox records, notification preferences, Circle triggers, and user-facing dispatch state.",
    tone: "signal",
    actions: [{ label: "Trigger Circle", href: "/circle" }, { label: "Review inbox", href: "/notify#inbox" }],
    rows: [
      { Item: "Inbox", State: "Readable", Contract: "/api/notifications/inbox" },
      { Item: "Preferences", State: "User controlled", Contract: "/api/notifications/preferences" }
    ]
  },
  audit: {
    title: "Audit Room",
    eyebrow: "Operational risk",
    description: "Review blocked releases, failed upload intents, webhook mismatch risks, and admin action trails.",
    tone: "danger",
    actions: [{ label: "Readiness gates", href: "/releases" }, { label: "Media contracts", href: "/media" }],
    rows: [
      { Item: "Release readiness", State: "Gate enforced", Contract: "/api/admin/releases/manage/[id]/readiness" },
      { Item: "Media access", State: "Entitlement checked", Contract: "/api/media/[assetId]/signed-url" }
    ]
  },
  signal: {
    title: "Signal Control",
    eyebrow: "Transmission lane",
    description: "Manage active signal windows, suppression state, radio independence, and delivery health.",
    tone: "signal",
    actions: [{ label: "Open analytics", href: "/analytics" }, { label: "Notify users", href: "/notify" }],
    rows: [
      { Item: "Active signal", State: "Windowed", Contract: "/api/signal/active" },
      { Item: "Signal state", State: "Suppression aware", Contract: "/api/signal/state" }
    ]
  },
  circle: {
    title: "Circle Management",
    eyebrow: "Community operations",
    description: "Trigger operational artist events and route them into notification and public community surfaces.",
    tone: "signal",
    actions: [{ label: "Create event", href: "/circle#create" }, { label: "Notify center", href: "/notify" }],
    rows: [
      { Item: "2MRRW active", State: "Event ready", Contract: "/api/admin/circle/events" },
      { Item: "Highlighted comment", State: "Dispatch ready", Contract: "/api/circle/events" }
    ]
  },
  settings: {
    title: "Settings",
    eyebrow: "System configuration",
    description: "Review environment posture, route contracts, release policy, and integration readiness.",
    tone: "vault",
    actions: [{ label: "Release policy", href: "/releases/new/review" }, { label: "Upload policy", href: "/media" }],
    rows: [
      { Item: "Supabase", State: "Server-only keys", Contract: "server/supabase" },
      { Item: "Vercel", State: "Build verified", Contract: "next.config.mjs" }
    ]
  }
};
