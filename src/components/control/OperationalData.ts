import type { ControlTone } from "@/design/tokens";

export type NavItem = {
  href: string;
  label: string;
  detail: string;
  tone: ControlTone;
};

export const primaryNavigation: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", detail: "Today / focus", tone: "vault" },
  { href: "/releases", label: "Releases", detail: "Discography", tone: "vault" },
  { href: "/media", label: "Media", detail: "Uploads / assets", tone: "signal" },
  { href: "/analytics", label: "Analytics", detail: "Audience", tone: "success" },
  { href: "/shop", label: "Shop", detail: "Merch / drops", tone: "commerce" },
  { href: "/settings", label: "Settings", detail: "Defaults", tone: "vault" }
];

export const releaseSteps = [
  { id: "setup", label: "Choose Type", href: "/releases/new" },
  { id: "details", label: "Release Details", href: "/releases/new/details" },
  { id: "tracks", label: "Tracks & Credits", href: "/releases/new/tracks" },
  { id: "uploads", label: "Artwork & Media", href: "/releases/new/uploads" },
  { id: "review", label: "Review & Publish", href: "/releases/new/review" }
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
    title: "Audio Visuals",
    eyebrow: "Video embeds",
    description: "Manage music videos, looping visuals, visualizers, YouTube embeds, and cinematic release assets.",
    tone: "signal",
    actions: [{ label: "Add Audio Visual", href: "/visuals#create" }, { label: "Media Library", href: "/media/videos" }],
    rows: [
      { Item: "Official music video", State: "Draft", Sync: "Publishes to frontend after approval" },
      { Item: "Release visualizer", State: "Ready", Sync: "Embeddable YouTube player" }
    ]
  },
  vault: {
    title: "Vault Media",
    eyebrow: "Protected content",
    description: "Upload and replace vault visuals, previews, and cinematic assets. Frontend access checks stay outside the backend UI.",
    tone: "vault",
    actions: [{ label: "Upload vault asset", href: "/media/loops" }, { label: "Media Library", href: "/media" }],
    rows: []
  },
  analytics: {
    title: "Analytics",
    eyebrow: "Audience",
    description: "Track streams, listeners, countries, saves, playlist adds, release performance, and revenue trends.",
    tone: "success",
    actions: [{ label: "Open releases", href: "/releases" }, { label: "Open shop", href: "/shop" }],
    rows: [
      { Item: "Streams over time", State: "Tracking", Snapshot: "Release performance" },
      { Item: "Top regions", State: "Tracking", Snapshot: "Audience map" },
      { Item: "Top tracks", State: "Tracking", Snapshot: "Saves and playlist adds" }
    ]
  },
  identity: {
    title: "Account Access",
    eyebrow: "Audience access",
    description: "Frontend authentication and user state are handled by the public app. Backend stays focused on content sync.",
    tone: "vault",
    actions: [{ label: "Open media", href: "/media" }, { label: "Open releases", href: "/releases" }],
    rows: []
  },
  commerce: {
    title: "Revenue",
    eyebrow: "Royalties",
    description: "Review revenue operations and storefront sync health without managing frontend access rules.",
    tone: "commerce",
    actions: [{ label: "Open revenue", href: "/revenue" }, { label: "Open settings", href: "/settings" }],
    rows: [
      { Item: "Products", State: "No products yet", Scope: "Merch and revenue" },
      { Item: "Revenue events", State: "No data yet", Scope: "Purchases and payouts" }
    ]
  },
  revenue: {
    title: "Revenue",
    eyebrow: "Royalties and payouts",
    description: "Review streaming revenue, merch revenue, royalties, and pending payouts.",
    tone: "commerce",
    actions: [{ label: "Open media", href: "/media" }, { label: "Review settings", href: "/settings" }],
    rows: [
      { Item: "Royalty summary", State: "No data yet", Snapshot: "Revenue by release" },
      { Item: "Revenue events", State: "No data yet", Snapshot: "Purchases and payouts" }
    ]
  },
  shop: {
    title: "Shop",
    eyebrow: "Merch and commerce",
    description: "Manage merch, cinematic product presentation, Shopify structure, Printful support, and premium drop readiness.",
    tone: "commerce",
    actions: [{ label: "Add product", href: "/shop#create" }, { label: "Release drops", href: "/releases" }],
    rows: [
      { Item: "Merch management", State: "Ready", Snapshot: "Products, variants, bundles" },
      { Item: "360 viewer", State: "Structured", Snapshot: "Cinematic product spin" },
      { Item: "Shopify", State: "Integration layer", Snapshot: "Storefront sync path" },
      { Item: "Printful", State: "Support planned", Snapshot: "Fulfillment provider" },
      { Item: "Ghost mannequin", State: "Visual system", Snapshot: "Floating apparel view" }
    ]
  },
  notify: {
    title: "Notifications",
    eyebrow: "Fan updates",
    description: "Prepare inbox updates, preferences, and Circle notifications.",
    tone: "signal",
    actions: [{ label: "Trigger Circle", href: "/circle" }, { label: "Review inbox", href: "/notify#inbox" }],
    rows: [
      { Item: "Inbox", State: "Ready", Channel: "In-app updates" },
      { Item: "Preferences", State: "Fan controlled", Channel: "Notification settings" }
    ]
  },
  audit: {
    title: "Release Review",
    eyebrow: "Quality check",
    description: "Review releases that need attention before submission.",
    tone: "danger",
    actions: [{ label: "Releases", href: "/releases" }, { label: "Media Library", href: "/media" }],
    rows: [
      { Item: "Release readiness", State: "Checked", Result: "Submit when complete" },
      { Item: "Media access", State: "Checked", Result: "Preview before publish" }
    ]
  },
  signal: {
    title: "2MRRW Signals",
    eyebrow: "Broadcasts",
    description: "Create broadcast updates, release announcements, fan transmissions, and scheduled notifications.",
    tone: "signal",
    actions: [{ label: "Open analytics", href: "/analytics" }, { label: "Notify users", href: "/notify" }],
    rows: [
      { Item: "Release announcement", State: "Draft", Channel: "Fan transmission" },
      { Item: "Delivery update", State: "Ready", Channel: "Scheduled announcement" }
    ]
  },
  circle: {
    title: "Circle",
    eyebrow: "Community moments",
    description: "Create artist moments for community surfaces and notifications.",
    tone: "signal",
    actions: [{ label: "Create event", href: "/circle#create" }, { label: "Notify center", href: "/notify" }],
    rows: [
      { Item: "2MRRW active", State: "Ready", Channel: "Circle" },
      { Item: "Highlighted comment", State: "Ready", Channel: "Circle and notifications" }
    ]
  },
  settings: {
    title: "Settings",
    eyebrow: "Account and defaults",
    description: "Manage profile, payout settings, metadata defaults, upload defaults, release preferences, timezone, and notifications.",
    tone: "vault",
    actions: [{ label: "Release policy", href: "/releases/new/review" }, { label: "Upload policy", href: "/media" }],
    rows: [
      { Item: "Release policy", State: "Ready", Area: "Submission rules" },
      { Item: "Upload policy", State: "Ready", Area: "Media requirements" }
    ]
  }
};
