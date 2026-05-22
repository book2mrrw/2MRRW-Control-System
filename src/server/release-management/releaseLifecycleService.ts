import { R2_BUCKET } from "@/lib/storage/r2";
import type {
  BackgroundProcessState,
  ContentReadinessState,
  CreatorConfidenceState,
  FutureRoleType,
  MediaDependencySurfaceType,
  MediaOptimizationJobType,
  PublishingStage,
  ReleaseReadinessArea,
  ReleaseVisibilityState,
  SystemTagScope
} from "@/server/release-management/taxonomies";

export type ReleaseLifecycleTarget = {
  id: string;
  slug: string;
  title: string;
  status: string;
  scheduledPublishAt?: string;
  updatedAt?: string;
  coverArtState: string;
  audioAssetsState: string;
  lyricsState: string;
  tracks: Array<{ id: string; title: string; audioState: string; lyricsState: string }>;
  metadataComplete: boolean;
  creditsComplete: boolean;
  visualsComplete?: boolean;
  archivedAt?: string;
  tags?: string[];
};

export type ReleaseReadinessVector = Record<ReleaseReadinessArea, ContentReadinessState>;

export type ReleaseRevisionKind =
  | "metadata_edit"
  | "artwork_replacement"
  | "audio_replacement"
  | "release_revision"
  | "status_change"
  | "slug_change"
  | "visibility_change"
  | "archive"
  | "recovery"
  | "undo"
  | "sync"
  | "cleanup"
  | "restore_point";

export type ReleaseRevisionRecord = {
  id: string;
  releaseId: string;
  kind: ReleaseRevisionKind;
  label: string;
  before?: unknown;
  after?: unknown;
  createdAt: string;
  actorRole: FutureRoleType;
};

export type ReleaseActivityEvent = {
  id: string;
  releaseId: string;
  message: string;
  kind: ReleaseRevisionKind | "processing" | "bulk_action" | "preview" | "dry_run" | "safe_mode";
  createdAt: string;
};

export type SystemTag = {
  id: string;
  label: string;
  slug: string;
  scopes: SystemTagScope[];
  createdAt: string;
};

export type MediaDependency = {
  id: string;
  assetId: string;
  surfaceType: MediaDependencySurfaceType;
  surfaceId: string;
  label: string;
  releaseId?: string;
  trackId?: string;
  visibility: ReleaseVisibilityState;
};

export type MediaOptimizationJob = {
  id: string;
  assetId: string;
  jobType: MediaOptimizationJobType;
  state: BackgroundProcessState;
  outputPath?: string;
  errorMessage?: string;
  retryCount: number;
  updatedAt: string;
};

export type FrontendPreviewLink = {
  label: string;
  href: string;
  surface: "release" | "lyrics" | "credits" | "visuals" | "contract";
};

export type CreatorConfidence = {
  key: CreatorConfidenceState;
  label: string;
  state: "ready" | "syncing" | "needs_attention";
  detail: string;
  updatedAt: string;
};

export type DraftContinueCard = {
  releaseId: string;
  title: string;
  href: string;
  nextAction: string;
  percentComplete: number;
  lastModifiedAt: string;
  recoveryState: "active" | "interrupted" | "archived_recoverable";
};

export type PublishConflictWarning = {
  key: string;
  severity: "info" | "warning" | "blocking";
  message: string;
};

export type StructuredStoragePlan = {
  bucket: string;
  canonicalPath: string;
  originalFileName: string;
  canonicalFileName: string;
  ownerFolder: string;
  variants: Array<{ label: "mobile" | "desktop" | "thumbnail" | "preview" | "waveform" | "source"; path: string }>;
};

export type CacheInvalidationPlan = {
  releaseId?: string;
  assetId?: string;
  tags: string[];
  paths: string[];
  reason: string;
  state: "queued";
};

export type SaveSyncState = "saving" | "saved" | "syncing" | "synced" | "publishing" | "published" | "failed";
export type RuntimeMode = "preview" | "staging" | "production";
export type ContentEntityKind = "release" | "track" | "contributor" | "media_asset" | "audio_visual" | "vault_asset" | "hero_asset";
export type MediaLifecycleState = "uploaded" | "processing" | "optimized" | "synced" | "published" | "archived" | "failed";
export type ReleaseRelationshipKind = "single_to_album" | "deluxe_parent" | "remaster_of" | "alternate_version" | "visual_for" | "vault_bonus_for";
export type ContentPriorityKind = "featured_release" | "homepage_hero" | "pinned_vault" | "featured_visual";

export type ContentEntityContract = {
  id: string;
  kind: ContentEntityKind;
  ownerArtistId: "artist_2mrrw";
  title: string;
  slug?: string;
  publishState: PublishingStage | MediaLifecycleState;
  syncState: SaveSyncState;
  parentIds: string[];
  childIds: string[];
  relationshipIds: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type ContentRelationship = {
  id: string;
  sourceId: string;
  sourceKind: ContentEntityKind;
  targetId: string;
  targetKind: ContentEntityKind;
  relationshipKind: ReleaseRelationshipKind;
  label: string;
  createdAt: string;
};

export type PublishDryRunResult = {
  releaseId: string;
  mode: RuntimeMode;
  ok: boolean;
  stage: PublishingStage;
  warnings: PublishConflictWarning[];
  routeChecks: Array<{ label: string; href: string; ok: boolean }>;
  syncPlan: CacheInvalidationPlan[];
};

export type RestorePoint = {
  id: string;
  releaseId: string;
  label: string;
  snapshot: unknown;
  createdAt: string;
};

export type CleanupCandidate = {
  id: string;
  reason: "abandoned_upload" | "failed_processing" | "temporary_file" | "stale_processing";
  safeAction: "retry" | "archive" | "delete_after_backup";
  detectedAt: string;
};

export type UploadQueueItem = {
  id: string;
  assetId?: string;
  releaseId?: string;
  fileName: string;
  state: "queued" | "uploading" | "retry_available" | "completed" | "failed";
  attempts: number;
  resumable: boolean;
  lastError?: string;
  updatedAt: string;
};

export type CreatorSessionState = {
  id: string;
  releaseId?: string;
  currentStep?: "setup" | "tracks" | "uploads" | "review";
  activeTab?: string;
  openSections: string[];
  scrollPosition?: number;
  unsavedText: Record<string, string>;
  pendingUploadIds: string[];
  focusMode: boolean;
  localPersistence: "idle" | "saving" | "saved" | "restoring";
  cloudPersistence: "queued" | "syncing" | "synced" | "offline";
  recoveryMessage?: "Restoring Draft" | "Upload Recovered" | "Connection Re-established" | "Draft Successfully Restored";
  lastActiveAt: string;
};

export type DraftSnapshotReason =
  | "field_edit"
  | "upload_completed"
  | "step_transition"
  | "schedule_change"
  | "lyrics_edit"
  | "mobile_background"
  | "connection_interrupted"
  | "manual_save";

export type DraftSessionSnapshot = {
  id: string;
  releaseId: string;
  sessionId: string;
  reason: DraftSnapshotReason;
  step?: CreatorSessionState["currentStep"];
  activeTab?: string;
  openSections: string[];
  scrollPosition: number;
  metadata: Record<string, unknown>;
  collaborators: unknown[];
  uploads: Array<{ uploadId: string; state: UploadQueueItem["state"]; assetId?: string; fileName: string }>;
  scheduling: Record<string, unknown>;
  lyrics: Record<string, string>;
  localSavedAt: string;
  cloudSyncedAt?: string;
  recoveryMessage: NonNullable<CreatorSessionState["recoveryMessage"]>;
};

export type CreatorMemory = {
  recentUploadIds: string[];
  recentContributorIds: string[];
  recentTagSlugs: string[];
  preferredGenre?: string;
  preferredTimezone: string;
  defaultVisibility: ReleaseVisibilityState;
};

export type CreatorNotification = {
  id: string;
  type: "upload_completed" | "release_scheduled" | "publish_succeeded" | "sync_failed" | "processing_completed";
  title: string;
  detail: string;
  releaseId?: string;
  assetId?: string;
  importance: "quiet" | "standard" | "urgent";
  createdAt: string;
};

export type CreatorExperienceContract = {
  session: CreatorSessionState;
  memory: CreatorMemory;
  keyboardShortcuts: Array<{ keys: string; action: string; scope: "global" | "release" | "media" }>;
  performanceBudget: {
    reducedMotionReady: boolean;
    mobileFirst: boolean;
    previewAutoplay: "muted_only";
    maxHeroVideoMb: number;
    maxInlinePreviewSeconds: number;
  };
  notificationPolicy: {
    quietByDefault: true;
    batchRoutineUpdates: true;
    urgentOnlyForFailures: true;
  };
};

export type AdaptiveWorkflowRule = {
  id: string;
  label: string;
  visible: boolean;
  reason: string;
};

export type SmartProgressItem = {
  key: "metadata" | "artwork" | "audio" | "credits" | "lyrics" | "publish";
  label: "Metadata Complete" | "Artwork Ready" | "Audio Optimized" | "Credits Complete" | "Lyrics Ready" | "Ready to Publish";
  state: "complete" | "next" | "hidden" | "needs_attention";
  message: string;
};

export type FanPreviewTarget = {
  label: string;
  surface: "mobile_frontend" | "desktop_frontend" | "lyrics_page" | "release_page" | "vault_experience" | "cinematic_transition";
  href: string;
  mode: "private_preview" | "staging";
};

export type MediaIntelligenceProfile = {
  assetId: string;
  aspectRatio?: string;
  orientation?: "square" | "portrait" | "landscape" | "unknown";
  durationSeconds?: number;
  brightness?: "dark" | "balanced" | "bright" | "unknown";
  fileWeight: "light" | "standard" | "heavy";
  responsiveStatus: "needs_mobile_crop" | "mobile_ready" | "needs_probe";
  recommendations: string[];
};

export type ReleaseHealthRecommendation = {
  key: string;
  label: string;
  severity: "calm" | "next" | "important";
  action: string;
};

export type ReleaseMomentPlan = {
  releaseId: string;
  stage: "staged" | "ready" | "scheduled";
  actions: Array<{
    label: string;
    surface: "release_page" | "homepage_hero" | "vault" | "audio_visuals" | "discography";
    state: "waiting" | "ready";
  }>;
};

export type DeploymentEnvironment = "development" | "staging" | "production";
export type FeatureFlag = {
  key: string;
  enabled: boolean;
  environment: DeploymentEnvironment;
  description: string;
};
export type ObservabilityEvent = {
  id: string;
  area: "upload" | "sync" | "processing" | "performance" | "publish" | "api" | "security";
  severity: "info" | "warning" | "error";
  message: string;
  releaseId?: string;
  assetId?: string;
  createdAt: string;
};
export type RateLimitPlan = {
  key: string;
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: string;
  message: string;
};
export type MediaStorageStrategy = {
  assetId: string;
  hotPath: string;
  optimizedPath: string;
  archivePath: string;
  cdnCacheTag: string;
  derivatives: StructuredStoragePlan["variants"];
};
export type RollbackPlan = {
  id: string;
  releaseId: string;
  reason: "publish_failure" | "broken_media" | "accidental_update" | "failed_frontend_sync";
  restorePointId?: string;
  actions: Array<{ label: string; state: "ready" | "waiting" }>;
  createdAt: string;
};
export type MediaRightsAttribution = {
  assetId: string;
  owner: string;
  contributors: Array<{ name: string; role: string; rightsNote?: string }>;
  usage: "release" | "artwork" | "visual" | "vault" | "hero";
  verified: boolean;
};
export type SearchIndexDocument = {
  id: string;
  type: ContentEntityKind | "lyrics" | "metadata" | "tag";
  title: string;
  body: string;
  tags: string[];
  updatedAt: string;
};
export type ProductionHealthStatus = {
  ok: boolean;
  environment: DeploymentEnvironment;
  checks: Array<{ label: string; state: "healthy" | "degraded" | "failed"; detail: string }>;
};
export type GracefulDegradationPlan = {
  area: "uploads" | "processing" | "frontend_sync" | "analytics" | "search";
  fallback: string;
  creatorMessage: string;
  canContinueEditing: boolean;
};

export type DesignGovernanceContract = {
  spacingScale: string[];
  typographyRoles: Array<"caption" | "body" | "title" | "hero">;
  motionDurations: Array<"immediate" | "standard" | "deliberate">;
  interactionHierarchy: Array<"primary" | "secondary" | "quiet" | "destructive">;
  accessibility: {
    reducedMotion: true;
    keyboardNavigable: true;
    touchTargets: "comfortable";
    contrast: "high";
  };
  philosophy: "cinematic_creator_os";
};

export type ComponentGovernanceContract = {
  component: "upload" | "form" | "contributor_editor" | "media_card" | "dropdown" | "scheduler" | "preview" | "modal";
  reusable: true;
  requiredStates: Array<"empty" | "loading" | "error" | "ready" | "disabled">;
  allowedComplexity: "simple_first_progressive_disclosure";
};

export type ContentGovernanceRule = {
  key: string;
  label: string;
  check: "naming" | "metadata" | "media_structure" | "priority" | "localization" | "api_boundary";
  message: string;
};

export type PlatformBoundary = {
  domain: "releases" | "media" | "analytics" | "vault" | "visuals" | "frontend_integrations";
  owns: string[];
  exposes: string[];
  mustNotOwn: string[];
};

const revisions = new Map<string, ReleaseRevisionRecord[]>();
const activity = new Map<string, ReleaseActivityEvent[]>();
const tags = new Map<string, SystemTag>();
const slugOwners = new Map<string, string>();
const mediaDependencies = new Map<string, MediaDependency[]>();
const mediaJobs = new Map<string, MediaOptimizationJob[]>();
const cacheInvalidations: CacheInvalidationPlan[] = [];
const entities = new Map<string, ContentEntityContract>();
const relationships = new Map<string, ContentRelationship>();
const restorePoints = new Map<string, RestorePoint[]>();
const cleanupCandidates = new Map<string, CleanupCandidate>();
const uploadQueue = new Map<string, UploadQueueItem>();
const creatorSessions = new Map<string, CreatorSessionState>();
const creatorNotifications = new Map<string, CreatorNotification>();
const draftSnapshots = new Map<string, DraftSessionSnapshot[]>();
const featureFlags = new Map<string, FeatureFlag>();
const observabilityEvents = new Map<string, ObservabilityEvent>();
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();
const rollbackPlans = new Map<string, RollbackPlan>();
const rightsAttributions = new Map<string, MediaRightsAttribution>();
const searchIndex = new Map<string, SearchIndexDocument>();
const defaultCreatorMemory: CreatorMemory = {
  recentUploadIds: [],
  recentContributorIds: [],
  recentTagSlugs: [],
  preferredTimezone: "America/New_York",
  defaultVisibility: "draft"
};

function completeOrNext(complete: boolean, label: SmartProgressItem["label"], key: SmartProgressItem["key"], message: string): SmartProgressItem {
  return {
    key,
    label,
    state: complete ? "complete" : "next",
    message
  };
}

export function getDeploymentEnvironment(env: Record<string, string | undefined> = process.env): DeploymentEnvironment {
  if (env.VERCEL_ENV === "production" || env.NODE_ENV === "production") return "production";
  if (env.VERCEL_ENV === "preview" || env.CONTROL_SYSTEM_ENV === "staging") return "staging";
  return "development";
}

export function getEnvironmentSafety(env: Record<string, string | undefined> = process.env) {
  const environment = getDeploymentEnvironment(env);
  return {
    environment,
    productionWritesAllowed: environment === "production" && env.ALLOW_PRODUCTION_WRITES === "true",
    requiresDryRun: environment === "production",
    message: environment === "production" ? "Production changes require dry-run confirmation." : "Safe staging lane is active."
  };
}

export function setFeatureFlag(input: FeatureFlag) {
  featureFlags.set(`${input.environment}:${input.key}`, input);
  return input;
}

export function isFeatureEnabled(key: string, environment = getDeploymentEnvironment()) {
  return featureFlags.get(`${environment}:${key}`)?.enabled ?? false;
}

export function recordObservabilityEvent(input: Omit<ObservabilityEvent, "id" | "createdAt">) {
  const event: ObservabilityEvent = {
    ...input,
    id: nextId("obs"),
    createdAt: nowIso()
  };
  observabilityEvents.set(event.id, event);
  return event;
}

export function listObservabilityEvents() {
  return [...observabilityEvents.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function evaluateRateLimit(input: { key: string; limit?: number; windowMs?: number }): RateLimitPlan {
  const limit = input.limit ?? 60;
  const windowMs = input.windowMs ?? 60_000;
  const now = Date.now();
  const bucket = rateLimitBuckets.get(input.key);
  const activeBucket = bucket && bucket.resetAt > now ? bucket : { count: 0, resetAt: now + windowMs };
  activeBucket.count += 1;
  rateLimitBuckets.set(input.key, activeBucket);
  const remaining = Math.max(0, limit - activeBucket.count);
  return {
    key: input.key,
    allowed: activeBucket.count <= limit,
    limit,
    remaining,
    resetAt: new Date(activeBucket.resetAt).toISOString(),
    message: activeBucket.count <= limit ? "Request allowed." : "Too many attempts. Please slow down and try again shortly."
  };
}

export function buildMediaStorageStrategy(input: { assetId: string; storagePlan: StructuredStoragePlan }): MediaStorageStrategy {
  return {
    assetId: input.assetId,
    hotPath: input.storagePlan.canonicalPath,
    optimizedPath: input.storagePlan.variants.find((variant) => variant.label === "desktop")?.path ?? input.storagePlan.canonicalPath,
    archivePath: `archive/${input.storagePlan.canonicalPath}`,
    cdnCacheTag: `asset:${input.assetId}`,
    derivatives: input.storagePlan.variants
  };
}

export function buildRollbackPlan(input: { releaseId: string; reason: RollbackPlan["reason"]; restorePointId?: string }) {
  const plan: RollbackPlan = {
    id: nextId("rollback"),
    releaseId: input.releaseId,
    reason: input.reason,
    restorePointId: input.restorePointId,
    actions: [
      { label: "Restore last safe release data", state: input.restorePointId ? "ready" : "waiting" },
      { label: "Revert frontend sync tags", state: "ready" },
      { label: "Keep draft editing available", state: "ready" },
      { label: "Notify creator calmly", state: "ready" }
    ],
    createdAt: nowIso()
  };
  rollbackPlans.set(plan.id, plan);
  return plan;
}

export function recordMediaRightsAttribution(input: MediaRightsAttribution) {
  rightsAttributions.set(input.assetId, input);
  return input;
}

export function getMediaRightsAttribution(assetId: string) {
  return rightsAttributions.get(assetId) ?? null;
}

export function indexSearchDocument(input: Omit<SearchIndexDocument, "updatedAt">) {
  const document = { ...input, updatedAt: nowIso() };
  searchIndex.set(document.id, document);
  return document;
}

export function searchIndexedDocuments(query: string) {
  const normalized = query.trim().toLowerCase();
  return [...searchIndex.values()].filter((document) =>
    [document.title, document.body, ...document.tags].some((value) => value.toLowerCase().includes(normalized))
  );
}

export function validateReleaseStateGovernance(input: { status: string; visibilityState: ReleaseVisibilityState; scheduledPublishAt?: string; readiness: ReleaseReadinessVector }) {
  const warnings: PublishConflictWarning[] = [];
  if (input.status === "published" && input.visibilityState !== "public" && input.visibilityState !== "unlisted" && input.visibilityState !== "vault_exclusive") {
    warnings.push({ key: "published_visibility", severity: "blocking", message: "Published releases need a public, unlisted, or vault-exclusive visibility state." });
  }
  if (input.status === "scheduled" && !input.scheduledPublishAt) {
    warnings.push({ key: "missing_schedule", severity: "blocking", message: "Scheduled releases need a publish date." });
  }
  if (input.readiness.publishing === "blocked") {
    warnings.push({ key: "publishing_blocked", severity: "blocking", message: "Resolve the calm publishing checks before going live." });
  }
  return {
    ok: warnings.every((warning) => warning.severity !== "blocking"),
    warnings
  };
}

export function buildProductionHealthStatus(environment = getDeploymentEnvironment()): ProductionHealthStatus {
  const events = listObservabilityEvents();
  const hasErrors = events.some((event) => event.severity === "error");
  return {
    ok: !hasErrors,
    environment,
    checks: [
      { label: "Uploads", state: events.some((event) => event.area === "upload" && event.severity === "error") ? "degraded" : "healthy", detail: "Signed upload and retry lanes are available." },
      { label: "Processing", state: events.some((event) => event.area === "processing" && event.severity === "error") ? "degraded" : "healthy", detail: "Media jobs run asynchronously with safe mode fallback." },
      { label: "Frontend Sync", state: events.some((event) => event.area === "sync" && event.severity === "error") ? "degraded" : "healthy", detail: "Cache invalidation and preview contracts are queued." },
      { label: "API", state: events.some((event) => event.area === "api" && event.severity === "error") ? "failed" : "healthy", detail: "Backend contract routes are available." }
    ]
  };
}

export function buildGracefulDegradationPlan(area: GracefulDegradationPlan["area"]): GracefulDegradationPlan {
  const messages: Record<GracefulDegradationPlan["area"], string> = {
    uploads: "Upload paused. Your release details are still saved.",
    processing: "Processing is taking longer. You can keep editing.",
    frontend_sync: "Frontend sync will retry. Your draft is safe.",
    analytics: "Analytics are catching up. Publishing tools are unaffected.",
    search: "Search is refreshing. Direct release pages still work."
  };
  return {
    area,
    fallback: area === "search" ? "direct_navigation" : "safe_mode",
    creatorMessage: messages[area],
    canContinueEditing: true
  };
}

export function buildDesignGovernanceContract(): DesignGovernanceContract {
  return {
    spacingScale: ["xs", "sm", "md", "lg", "xl"],
    typographyRoles: ["caption", "body", "title", "hero"],
    motionDurations: ["immediate", "standard", "deliberate"],
    interactionHierarchy: ["primary", "secondary", "quiet", "destructive"],
    accessibility: {
      reducedMotion: true,
      keyboardNavigable: true,
      touchTargets: "comfortable",
      contrast: "high"
    },
    philosophy: "cinematic_creator_os"
  };
}

export function buildComponentGovernanceContracts(): ComponentGovernanceContract[] {
  return ["upload", "form", "contributor_editor", "media_card", "dropdown", "scheduler", "preview", "modal"].map((component) => ({
    component: component as ComponentGovernanceContract["component"],
    reusable: true,
    requiredStates: ["empty", "loading", "error", "ready", "disabled"],
    allowedComplexity: "simple_first_progressive_disclosure"
  }));
}

export function getContentGovernanceRules(): ContentGovernanceRule[] {
  return [
    { key: "canonical_names", label: "Canonical naming", check: "naming", message: "Use stable slugs, sanitized filenames, and readable labels." },
    { key: "metadata_source", label: "Metadata ownership", check: "metadata", message: "Release metadata stays in the Control System service layer." },
    { key: "structured_media", label: "Structured media", check: "media_structure", message: "Uploads must land in release, artwork, audio, visuals, hero, or vault lanes." },
    { key: "priority_clear", label: "Priority clarity", check: "priority", message: "Only one homepage hero or featured moment should lead a launch surface." },
    { key: "local_ready", label: "Localization ready", check: "localization", message: "Language, timezone, and regional display data stay explicit." },
    { key: "api_first", label: "API boundary", check: "api_boundary", message: "Frontend apps consume structured contracts, not hardcoded Control System internals." }
  ];
}

export function validateContentGovernance(input: { slug?: string; fileName?: string; language?: string; timezone?: string; priorityCount?: number }) {
  const warnings: PublishConflictWarning[] = [];
  if (input.slug && slugify(input.slug) !== input.slug) {
    warnings.push({ key: "slug_format", severity: "warning", message: "Use a stable lowercase release link." });
  }
  if (input.fileName && canonicalFileName({ fileName: input.fileName }) !== input.fileName.toLowerCase()) {
    warnings.push({ key: "file_name", severity: "info", message: "File will be normalized for clean storage." });
  }
  if (!input.language) {
    warnings.push({ key: "language", severity: "warning", message: "Add a language so metadata is ready for future localization." });
  }
  if (!input.timezone) {
    warnings.push({ key: "timezone", severity: "warning", message: "Add a timezone so scheduling stays clear across devices." });
  }
  if ((input.priorityCount ?? 0) > 1) {
    warnings.push({ key: "priority_count", severity: "warning", message: "Keep one lead content priority per surface to avoid clutter." });
  }
  return { ok: warnings.every((warning) => warning.severity !== "warning" && warning.severity !== "blocking"), warnings };
}

export function getPlatformBoundaries(): PlatformBoundary[] {
  return [
    { domain: "releases", owns: ["metadata", "readiness", "publishing stage"], exposes: ["release contracts", "preview links"], mustNotOwn: ["raw storage signing"] },
    { domain: "media", owns: ["upload intents", "storage plan", "derivatives", "dependencies"], exposes: ["media relationship graph", "signed URL policy"], mustNotOwn: ["release metadata"] },
    { domain: "analytics", owns: ["events", "aggregation plans"], exposes: ["insights contracts"], mustNotOwn: ["publishing decisions"] },
    { domain: "vault", owns: ["protected content relationships", "access surfaces"], exposes: ["vault preview contracts"], mustNotOwn: ["public release activation"] },
    { domain: "visuals", owns: ["audio visual records", "embed metadata"], exposes: ["published visual contracts"], mustNotOwn: ["audio masters"] },
    { domain: "frontend_integrations", owns: ["preview contracts", "cache invalidation plans"], exposes: ["stable API shapes"], mustNotOwn: ["Control System edit state"] }
  ];
}

function nowIso() {
  return new Date().toISOString();
}

function nextId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function canonicalFileName(input: { fileName: string; prefix?: string }) {
  const extension = input.fileName.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() ?? "bin";
  const base = input.fileName
    .replace(/\.[a-z0-9]+$/i, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72) || "media";
  const prefix = input.prefix ? `${slugify(input.prefix)}-` : "";
  return `${prefix}${base}.${extension}`;
}

export function reserveStableSlug(input: { desired: string; ownerId: string }) {
  const base = slugify(input.desired) || "untitled";
  let candidate = base;
  let suffix = 2;

  while (slugOwners.has(candidate) && slugOwners.get(candidate) !== input.ownerId) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  slugOwners.set(candidate, input.ownerId);
  return candidate;
}

export function recordReleaseRevision(input: Omit<ReleaseRevisionRecord, "id" | "createdAt" | "actorRole"> & { actorRole?: FutureRoleType }) {
  const row: ReleaseRevisionRecord = {
    ...input,
    id: nextId("rev"),
    actorRole: input.actorRole ?? "admin",
    createdAt: nowIso()
  };
  const rows = revisions.get(input.releaseId) ?? [];
  rows.push(row);
  revisions.set(input.releaseId, rows);
  recordReleaseActivity({
    releaseId: input.releaseId,
    kind: input.kind,
    message: input.label
  });
  return row;
}

export function getLatestUndoableRevision(releaseId: string) {
  return listReleaseRevisions(releaseId).find((revision) => Boolean(revision.before)) ?? null;
}

export function listReleaseRevisions(releaseId: string) {
  return [...(revisions.get(releaseId) ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function recordReleaseActivity(input: Omit<ReleaseActivityEvent, "id" | "createdAt">) {
  const row: ReleaseActivityEvent = {
    ...input,
    id: nextId("activity"),
    createdAt: nowIso()
  };
  const rows = activity.get(input.releaseId) ?? [];
  rows.push(row);
  activity.set(input.releaseId, rows);
  return row;
}

export function listReleaseActivity(releaseId: string) {
  return [...(activity.get(releaseId) ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function uploadReady(value: string) {
  return value === "uploaded" || value === "approved";
}

function areaState(ready: boolean, started: boolean): ContentReadinessState {
  if (ready) return "ready";
  return started ? "in_progress" : "not_started";
}

export function buildReleaseReadinessVector(target: ReleaseLifecycleTarget): ReleaseReadinessVector {
  const audioStarted = target.tracks.some((track) => track.audioState !== "missing") || target.audioAssetsState !== "missing";
  const artworkStarted = target.coverArtState !== "missing";
  const scheduledOrPublic = target.status === "scheduled" || target.status === "published" || Boolean(target.scheduledPublishAt);

  return {
    metadata: areaState(target.metadataComplete, Boolean(target.title)),
    audio: areaState(target.tracks.every((track) => uploadReady(track.audioState)), audioStarted),
    artwork: areaState(uploadReady(target.coverArtState), artworkStarted),
    credits: areaState(target.creditsComplete, target.tracks.length > 0),
    visuals: target.visualsComplete ? "ready" : "not_started",
    publishing: areaState(scheduledOrPublic, target.metadataComplete && target.creditsComplete)
  };
}

export function getPublishingStage(target: ReleaseLifecycleTarget): PublishingStage {
  if (target.status === "published") return "live";
  if (target.status === "scheduled") return "scheduled";
  const readiness = buildReleaseReadinessVector(target);
  return Object.values(readiness).every((state) => state === "ready" || state === "approved") ? "ready" : "draft";
}

export function buildCreatorConfidence(target: ReleaseLifecycleTarget): CreatorConfidence[] {
  const timestamp = target.updatedAt ?? nowIso();
  const audioReady = target.tracks.every((track) => track.audioState === "uploaded" || track.audioState === "approved");
  const artworkReady = target.coverArtState === "uploaded" || target.coverArtState === "approved";
  const frontendReady = target.status === "published";
  const lyricsReady = target.lyricsState === "not_required" || target.lyricsState === "uploaded" || target.lyricsState === "approved";
  return [
    { key: "audio_synced", label: "Audio Synced", state: audioReady ? "ready" : "needs_attention", detail: audioReady ? "Track audio is connected." : "Audio still needs upload or review.", updatedAt: timestamp },
    { key: "frontend_updated", label: "Frontend Updated", state: frontendReady ? "ready" : "syncing", detail: frontendReady ? "Live release data is available." : "Frontend sync will complete after publish.", updatedAt: timestamp },
    { key: "artwork_optimized", label: "Artwork Optimized", state: artworkReady ? "syncing" : "needs_attention", detail: artworkReady ? "Artwork processing jobs are queued." : "Artwork needs a valid replacement.", updatedAt: timestamp },
    { key: "lyrics_published", label: "Lyrics Published", state: lyricsReady ? "ready" : "needs_attention", detail: lyricsReady ? "Lyrics state will travel with release data." : "Lyrics are missing or blocked.", updatedAt: timestamp },
    { key: "vault_updated", label: "Vault Updated", state: "ready", detail: "Vault contracts are ready for protected media.", updatedAt: timestamp },
    { key: "storage_connected", label: "Storage Connected", state: "ready", detail: "Protected-media storage contract is configured.", updatedAt: timestamp },
    { key: "upload_pipeline_healthy", label: "Upload Pipeline Healthy", state: "ready", detail: "Uploads use signed intent and completion confirmation.", updatedAt: timestamp },
    { key: "processing_operational", label: "Processing Operational", state: "syncing", detail: "Heavy media jobs are modeled asynchronously.", updatedAt: timestamp }
  ];
}

export function buildDraftContinueCard(target: ReleaseLifecycleTarget): DraftContinueCard {
  const readiness = buildReleaseReadinessVector(target);
  const values = Object.values(readiness);
  const completed = values.filter((state) => state === "ready" || state === "approved").length;
  const nextAction =
    readiness.metadata !== "ready"
      ? "Finish metadata"
      : readiness.audio !== "ready"
        ? "Upload audio"
        : readiness.artwork !== "ready"
          ? "Replace artwork"
          : readiness.credits !== "ready"
            ? "Finish credits"
            : "Review and schedule";
  return {
    releaseId: target.id,
    title: target.title,
    href: `/releases/${target.id}`,
    nextAction,
    percentComplete: Math.round((completed / values.length) * 100),
    lastModifiedAt: target.updatedAt ?? nowIso(),
    recoveryState: target.archivedAt ? "archived_recoverable" : completed > 0 && completed < values.length ? "interrupted" : "active"
  };
}

export function validatePublishConflicts(target: ReleaseLifecycleTarget, scheduledTargets: Array<{ id: string; scheduledPublishAt?: string; title: string }> = []): PublishConflictWarning[] {
  const warnings: PublishConflictWarning[] = [];
  const readiness = buildReleaseReadinessVector(target);
  Object.entries(readiness).forEach(([area, state]) => {
    if (state === "not_started" || state === "needs_attention" || state === "blocked") {
      warnings.push({
        key: `readiness_${area}`,
        severity: state === "blocked" ? "blocking" : "warning",
        message: `${area.replaceAll("_", " ")} needs attention before publishing.`
      });
    }
  });

  if (target.scheduledPublishAt) {
    const sameDay = target.scheduledPublishAt.slice(0, 10);
    const conflict = scheduledTargets.find((item) => item.id !== target.id && item.scheduledPublishAt?.slice(0, 10) === sameDay);
    if (conflict) {
      warnings.push({
        key: "schedule_conflict",
        severity: "warning",
        message: `${conflict.title} is already scheduled for ${sameDay}.`
      });
    }
  }

  return warnings;
}

export function normalizeScheduledPublishAt(input: { localDate?: string; timezone?: string; iso?: string }) {
  if (input.iso) return new Date(input.iso).toISOString();
  if (!input.localDate) return undefined;
  // Store UTC while retaining the source timezone separately in metadata/UI contracts.
  return new Date(`${input.localDate}T00:00:00.000Z`).toISOString();
}

export function buildStructuredStoragePlan(input: {
  category: string;
  ownerId: string;
  releaseId?: string;
  fileName: string;
  folder: string;
}) {
  const ownerFolder = [input.folder, input.releaseId, input.ownerId].filter(Boolean).map((part) => slugify(String(part))).join("/");
  const canonicalName = canonicalFileName({ fileName: input.fileName, prefix: input.category });
  const canonicalPath = `${ownerFolder}/${canonicalName}`;
  const variantBase = canonicalPath.replace(/\.[a-z0-9]+$/i, "");
  return {
    bucket: R2_BUCKET || "2mrrw-media",
    canonicalPath,
    originalFileName: input.fileName,
    canonicalFileName: canonicalName,
    ownerFolder,
    variants: [
      { label: "source", path: canonicalPath },
      { label: "mobile", path: `${variantBase}.mobile.webp` },
      { label: "desktop", path: `${variantBase}.desktop.webp` },
      { label: "thumbnail", path: `${variantBase}.thumb.webp` },
      { label: "preview", path: `${variantBase}.preview.mp3` },
      { label: "waveform", path: `${variantBase}.waveform.json` }
    ]
  } satisfies StructuredStoragePlan;
}

export function queueCacheInvalidation(input: Omit<CacheInvalidationPlan, "state">) {
  const plan: CacheInvalidationPlan = { ...input, state: "queued" };
  cacheInvalidations.push(plan);
  return plan;
}

export function upsertContentEntity(input: Omit<ContentEntityContract, "ownerArtistId" | "createdAt" | "updatedAt"> & { createdAt?: string; updatedAt?: string }) {
  const existing = entities.get(input.id);
  const timestamp = nowIso();
  const entity: ContentEntityContract = {
    ownerArtistId: "artist_2mrrw",
    createdAt: existing?.createdAt ?? input.createdAt ?? timestamp,
    updatedAt: input.updatedAt ?? timestamp,
    ...input
  };
  entities.set(entity.id, entity);
  return entity;
}

export function getContentEntity(id: string) {
  return entities.get(id) ?? null;
}

export function listContentEntities(kind?: ContentEntityKind) {
  return [...entities.values()].filter((entity) => !kind || entity.kind === kind);
}

export function recordContentRelationship(input: Omit<ContentRelationship, "id" | "createdAt">) {
  const duplicate = [...relationships.values()].find((relationship) =>
    relationship.sourceId === input.sourceId &&
    relationship.targetId === input.targetId &&
    relationship.relationshipKind === input.relationshipKind
  );
  if (duplicate) return duplicate;

  const relationship: ContentRelationship = {
    ...input,
    id: nextId("relship"),
    createdAt: nowIso()
  };
  relationships.set(relationship.id, relationship);
  return relationship;
}

export function listContentRelationships(entityId: string) {
  return [...relationships.values()].filter((relationship) => relationship.sourceId === entityId || relationship.targetId === entityId);
}

export function createRestorePoint(input: Omit<RestorePoint, "id" | "createdAt">) {
  const point: RestorePoint = {
    ...input,
    id: nextId("restore"),
    createdAt: nowIso()
  };
  restorePoints.set(input.releaseId, [point, ...(restorePoints.get(input.releaseId) ?? [])].slice(0, 20));
  recordReleaseRevision({
    releaseId: input.releaseId,
    kind: "restore_point",
    label: input.label,
    after: { restorePointId: point.id }
  });
  return point;
}

export function listRestorePoints(releaseId: string) {
  return [...(restorePoints.get(releaseId) ?? [])];
}

export function buildPublishDryRun(input: {
  target: ReleaseLifecycleTarget;
  warnings: PublishConflictWarning[];
  previewLinks: FrontendPreviewLink[];
  cachePlan: CacheInvalidationPlan[];
  mode?: RuntimeMode;
}): PublishDryRunResult {
  const blocking = input.warnings.some((warning) => warning.severity === "blocking");
  return {
    releaseId: input.target.id,
    mode: input.mode ?? "staging",
    ok: !blocking && input.warnings.every((warning) => warning.severity !== "warning"),
    stage: getPublishingStage(input.target),
    warnings: input.warnings,
    routeChecks: input.previewLinks.map((link) => ({ label: link.label, href: link.href, ok: link.href.includes("preview") || link.surface === "contract" })),
    syncPlan: input.cachePlan
  };
}

export function queueUpload(input: Omit<UploadQueueItem, "id" | "state" | "attempts" | "resumable" | "updatedAt"> & { resumable?: boolean }) {
  const item: UploadQueueItem = {
    ...input,
    id: nextId("upload"),
    state: "queued",
    attempts: 0,
    resumable: input.resumable ?? true,
    updatedAt: nowIso()
  };
  uploadQueue.set(item.id, item);
  return item;
}

export function markUploadQueueItem(id: string, state: UploadQueueItem["state"], lastError?: string) {
  const item = uploadQueue.get(id);
  if (!item) throw new Error("Upload queue item not found");
  item.state = state;
  item.attempts += state === "retry_available" || state === "failed" ? 1 : 0;
  item.lastError = lastError;
  item.updatedAt = nowIso();
  return item;
}

export function listUploadQueueItems() {
  return [...uploadQueue.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function recordCleanupCandidate(input: Omit<CleanupCandidate, "detectedAt">) {
  const candidate: CleanupCandidate = { ...input, detectedAt: nowIso() };
  cleanupCandidates.set(input.id, candidate);
  return candidate;
}

export function listCleanupCandidates() {
  return [...cleanupCandidates.values()];
}

export function upsertCreatorSession(input: Partial<CreatorSessionState> & { id?: string }) {
  const id = input.id ?? "creator_session_2mrrw";
  const existing = creatorSessions.get(id);
  const session: CreatorSessionState = {
    id,
    releaseId: input.releaseId ?? existing?.releaseId,
    currentStep: input.currentStep ?? existing?.currentStep ?? "setup",
    activeTab: input.activeTab ?? existing?.activeTab,
    openSections: input.openSections ?? existing?.openSections ?? [],
    scrollPosition: input.scrollPosition ?? existing?.scrollPosition ?? 0,
    unsavedText: { ...(existing?.unsavedText ?? {}), ...(input.unsavedText ?? {}) },
    pendingUploadIds: input.pendingUploadIds ?? existing?.pendingUploadIds ?? [],
    focusMode: input.focusMode ?? existing?.focusMode ?? false,
    localPersistence: input.localPersistence ?? existing?.localPersistence ?? "saved",
    cloudPersistence: input.cloudPersistence ?? existing?.cloudPersistence ?? "queued",
    recoveryMessage: input.recoveryMessage ?? existing?.recoveryMessage,
    lastActiveAt: nowIso()
  };
  creatorSessions.set(id, session);
  return session;
}

export function getCreatorSession(id = "creator_session_2mrrw") {
  return creatorSessions.get(id) ?? upsertCreatorSession({ id });
}

function recoveryMessageFor(reason: DraftSnapshotReason): DraftSessionSnapshot["recoveryMessage"] {
  if (reason === "upload_completed") return "Upload Recovered";
  if (reason === "connection_interrupted") return "Connection Re-established";
  if (reason === "mobile_background") return "Restoring Draft";
  return "Draft Successfully Restored";
}

export function saveDraftSessionSnapshot(input: {
  releaseId: string;
  sessionId?: string;
  reason: DraftSnapshotReason;
  step?: CreatorSessionState["currentStep"];
  activeTab?: string;
  openSections?: string[];
  scrollPosition?: number;
  metadata?: Record<string, unknown>;
  collaborators?: unknown[];
  uploads?: DraftSessionSnapshot["uploads"];
  scheduling?: Record<string, unknown>;
  lyrics?: Record<string, string>;
  cloudSynced?: boolean;
}) {
  const sessionId = input.sessionId ?? "creator_session_2mrrw";
  const snapshot: DraftSessionSnapshot = {
    id: nextId("snapshot"),
    releaseId: input.releaseId,
    sessionId,
    reason: input.reason,
    step: input.step,
    activeTab: input.activeTab,
    openSections: input.openSections ?? [],
    scrollPosition: input.scrollPosition ?? 0,
    metadata: input.metadata ?? {},
    collaborators: input.collaborators ?? [],
    uploads: input.uploads ?? [],
    scheduling: input.scheduling ?? {},
    lyrics: input.lyrics ?? {},
    localSavedAt: nowIso(),
    cloudSyncedAt: input.cloudSynced ? nowIso() : undefined,
    recoveryMessage: recoveryMessageFor(input.reason)
  };
  draftSnapshots.set(input.releaseId, [snapshot, ...(draftSnapshots.get(input.releaseId) ?? [])].slice(0, 50));
  upsertCreatorSession({
    id: sessionId,
    releaseId: input.releaseId,
    currentStep: input.step,
    activeTab: input.activeTab,
    openSections: input.openSections,
    scrollPosition: input.scrollPosition,
    pendingUploadIds: snapshot.uploads.filter((upload) => upload.state !== "completed").map((upload) => upload.uploadId),
    localPersistence: "saved",
    cloudPersistence: input.cloudSynced ? "synced" : "queued",
    recoveryMessage: snapshot.recoveryMessage
  });
  return snapshot;
}

export function listDraftSessionSnapshots(releaseId: string) {
  return [...(draftSnapshots.get(releaseId) ?? [])];
}

export function restoreDraftSession(input: { releaseId: string; sessionId?: string }) {
  const snapshot = listDraftSessionSnapshots(input.releaseId)[0] ?? null;
  const session = upsertCreatorSession({
    id: input.sessionId,
    releaseId: input.releaseId,
    currentStep: snapshot?.step,
    activeTab: snapshot?.activeTab,
    openSections: snapshot?.openSections,
    scrollPosition: snapshot?.scrollPosition,
    pendingUploadIds: snapshot?.uploads.filter((upload) => upload.state !== "completed").map((upload) => upload.uploadId),
    localPersistence: "restoring",
    cloudPersistence: snapshot?.cloudSyncedAt ? "synced" : "queued",
    recoveryMessage: snapshot?.recoveryMessage ?? "Restoring Draft"
  });
  return {
    session,
    snapshot,
    message: snapshot?.recoveryMessage ?? "Restoring Draft"
  };
}

export function createCreatorNotification(input: Omit<CreatorNotification, "id" | "createdAt">) {
  const notification: CreatorNotification = {
    ...input,
    id: nextId("note"),
    createdAt: nowIso()
  };
  creatorNotifications.set(notification.id, notification);
  return notification;
}

export function listCreatorNotifications() {
  return [...creatorNotifications.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function buildCreatorExperienceContract(sessionId = "creator_session_2mrrw"): CreatorExperienceContract {
  return {
    session: getCreatorSession(sessionId),
    memory: defaultCreatorMemory,
    keyboardShortcuts: [
      { keys: "G then R", action: "Open releases", scope: "global" },
      { keys: "N", action: "Add release", scope: "global" },
      { keys: "Command+S", action: "Save current release", scope: "release" },
      { keys: "U", action: "Open upload studio", scope: "media" },
      { keys: "P", action: "Preview release", scope: "release" }
    ],
    performanceBudget: {
      reducedMotionReady: true,
      mobileFirst: true,
      previewAutoplay: "muted_only",
      maxHeroVideoMb: 70,
      maxInlinePreviewSeconds: 30
    },
    notificationPolicy: {
      quietByDefault: true,
      batchRoutineUpdates: true,
      urgentOnlyForFailures: true
    }
  };
}

export function buildAdaptiveWorkflow(input: {
  releaseType: string;
  lyricsEnabled?: boolean;
  advancedMode?: boolean;
}): AdaptiveWorkflowRule[] {
  const isSingle = input.releaseType === "single";
  return [
    {
      id: "track_count",
      label: "Track count",
      visible: !isSingle,
      reason: isSingle ? "Singles stay focused on one track." : "Multi-track releases need sequencing."
    },
    {
      id: "album_relationships",
      label: "Album relationships",
      visible: !isSingle || Boolean(input.advancedMode),
      reason: isSingle ? "Hidden until you connect this single to a larger project." : "Connect this release to albums, deluxe editions, or remasters."
    },
    {
      id: "lyrics",
      label: "Lyrics",
      visible: input.lyricsEnabled !== false,
      reason: input.lyricsEnabled === false ? "Lyrics are quiet for this release." : "Lyrics can publish with the release when ready."
    },
    {
      id: "advanced_metadata",
      label: "Advanced metadata",
      visible: Boolean(input.advancedMode),
      reason: input.advancedMode ? "Full controls are available." : "Hidden to keep the creative flow clean."
    }
  ];
}

export function buildSmartProgress(input: ReleaseReadinessVector): SmartProgressItem[] {
  return [
    completeOrNext(input.metadata === "ready", "Metadata Complete", "metadata", input.metadata === "ready" ? "Release details are safe." : "Add the few details fans and platforms need."),
    completeOrNext(input.artwork === "ready", "Artwork Ready", "artwork", input.artwork === "ready" ? "Artwork is connected." : "Add artwork that feels right on mobile and desktop."),
    completeOrNext(input.audio === "ready", "Audio Optimized", "audio", input.audio === "ready" ? "Audio is ready for playback contracts." : "Upload or recover the audio when ready."),
    completeOrNext(input.credits === "ready", "Credits Complete", "credits", input.credits === "ready" ? "Credits are protected." : "Add the people who shaped the track."),
    completeOrNext(input.visuals === "ready", "Lyrics Ready", "lyrics", input.visuals === "ready" ? "Lyrics and visuals are prepared." : "Lyrics can stay private until you need them."),
    completeOrNext(input.publishing === "ready", "Ready to Publish", "publish", input.publishing === "ready" ? "Everything is staged for a safe release moment." : "Review the final checks before going live.")
  ];
}

export function buildFanPreviewTargets(input: { releaseId: string; slug: string }): FanPreviewTarget[] {
  const base = `/api/releases/${input.slug}`;
  return [
    { label: "Mobile fan preview", surface: "mobile_frontend", href: `${base}?preview=true&device=mobile`, mode: "private_preview" },
    { label: "Desktop fan preview", surface: "desktop_frontend", href: `${base}?preview=true&device=desktop`, mode: "private_preview" },
    { label: "Lyrics page preview", surface: "lyrics_page", href: `${base}/media?preview=lyrics`, mode: "private_preview" },
    { label: "Release page preview", surface: "release_page", href: `${base}?preview=true`, mode: "private_preview" },
    { label: "Vault experience preview", surface: "vault_experience", href: `/api/admin/releases/manage/${input.releaseId}?preview=vault`, mode: "staging" },
    { label: "Cinematic transition preview", surface: "cinematic_transition", href: `/api/admin/releases/manage/${input.releaseId}?preview=moment`, mode: "staging" }
  ];
}

export function buildMediaIntelligenceProfile(input: { assetId: string; sizeBytes?: number; mimeType?: string; width?: number; height?: number; durationSeconds?: number }): MediaIntelligenceProfile {
  const orientation =
    input.width && input.height
      ? input.width === input.height
        ? "square"
        : input.width > input.height
          ? "landscape"
          : "portrait"
      : "unknown";
  const aspectRatio = input.width && input.height ? `${input.width}:${input.height}` : undefined;
  const fileWeight = !input.sizeBytes || input.sizeBytes < 10 * 1024 * 1024 ? "light" : input.sizeBytes > 70 * 1024 * 1024 ? "heavy" : "standard";
  const responsiveStatus = orientation === "square" || orientation === "portrait" ? "mobile_ready" : orientation === "landscape" ? "needs_mobile_crop" : "needs_probe";
  return {
    assetId: input.assetId,
    aspectRatio,
    orientation,
    durationSeconds: input.durationSeconds,
    brightness: "unknown",
    fileWeight,
    responsiveStatus,
    recommendations: [
      ...(responsiveStatus === "needs_mobile_crop" ? ["Create a mobile-safe crop before featuring this media."] : []),
      ...(fileWeight === "heavy" ? ["Queue a lighter preview for mobile fans."] : []),
      "Generate thumbnail and responsive variants before public featuring."
    ]
  };
}

export function buildReleaseHealthRecommendations(input: ReleaseReadinessVector): ReleaseHealthRecommendation[] {
  return buildSmartProgress(input)
    .filter((item) => item.state !== "complete")
    .map((item) => ({
      key: item.key,
      label: item.label,
      severity: item.key === "publish" ? "important" : "next",
      action: item.message
    }));
}

export function buildReleaseMomentPlan(input: { releaseId: string; readiness: ReleaseReadinessVector; priority?: ContentPriorityKind }): ReleaseMomentPlan {
  const ready = input.readiness.publishing === "ready";
  return {
    releaseId: input.releaseId,
    stage: ready ? "ready" : "staged",
    actions: [
      { label: "Activate release page", surface: "release_page", state: ready ? "ready" : "waiting" },
      { label: "Refresh homepage moment", surface: "homepage_hero", state: input.priority === "homepage_hero" ? "ready" : "waiting" },
      { label: "Prepare vault companion", surface: "vault", state: input.priority === "pinned_vault" ? "ready" : "waiting" },
      { label: "Feature audio visual", surface: "audio_visuals", state: input.priority === "featured_visual" ? "ready" : "waiting" },
      { label: "Update discography", surface: "discography", state: ready ? "ready" : "waiting" }
    ]
  };
}

export function listCacheInvalidationPlans() {
  return [...cacheInvalidations];
}

export function createOrUpdateTag(input: { label: string; scopes?: SystemTagScope[] }) {
  const slug = slugify(input.label);
  if (!slug) {
    throw new Error("Tag label is required");
  }

  const existing = tags.get(slug);
  if (existing) {
    existing.scopes = [...new Set([...existing.scopes, ...(input.scopes ?? [])])];
    return existing;
  }

  const tag: SystemTag = {
    id: nextId("tag"),
    label: input.label.trim(),
    slug,
    scopes: input.scopes?.length ? input.scopes : ["global"],
    createdAt: nowIso()
  };
  tags.set(slug, tag);
  return tag;
}

export function listSystemTags() {
  return [...tags.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export function recordMediaDependency(input: Omit<MediaDependency, "id">) {
  const dependency: MediaDependency = {
    ...input,
    id: nextId("dep")
  };
  const rows = mediaDependencies.get(input.assetId) ?? [];
  rows.push(dependency);
  mediaDependencies.set(input.assetId, rows);
  return dependency;
}

export function listMediaDependencies(assetId: string) {
  return [...(mediaDependencies.get(assetId) ?? [])];
}

export function getMediaDeleteWarning(assetId: string) {
  const dependencies = listMediaDependencies(assetId);
  return {
    assetId,
    canDeletePermanently: dependencies.length === 0,
    safeAction: dependencies.length ? "archive_first" : "delete_allowed",
    message: dependencies.length
      ? "This media is used in release or frontend surfaces. Archive it first so it can be restored."
      : "No active media dependencies were found.",
    dependencies
  };
}

export function enqueueMediaOptimizationJobs(assetId: string, jobTypes: MediaOptimizationJobType[]) {
  const timestamp = nowIso();
  const jobs = jobTypes.map((jobType) => ({
    id: nextId("job"),
    assetId,
    jobType,
    state: "queued" as const,
    retryCount: 0,
    updatedAt: timestamp
  }));
  mediaJobs.set(assetId, [...(mediaJobs.get(assetId) ?? []), ...jobs]);
  return jobs;
}

export function updateMediaOptimizationJob(assetId: string, jobId: string, input: Partial<Pick<MediaOptimizationJob, "state" | "outputPath" | "errorMessage">>) {
  const jobs = mediaJobs.get(assetId) ?? [];
  const job = jobs.find((item) => item.id === jobId);
  if (!job) {
    throw new Error("Media processing job not found");
  }
  Object.assign(job, input, {
    retryCount: input.state === "retry_available" ? job.retryCount + 1 : job.retryCount,
    updatedAt: nowIso()
  });
  return job;
}

export function listMediaOptimizationJobs(assetId: string) {
  return [...(mediaJobs.get(assetId) ?? [])];
}

export function buildFrontendPreviewLinks(input: { releaseId: string; slug: string }) {
  const base = `/api/releases/${input.slug}`;
  return [
    { label: "Release page data", href: `${base}?preview=true`, surface: "release" },
    { label: "Lyrics preview", href: `${base}/media?preview=lyrics`, surface: "lyrics" },
    { label: "Credits preview", href: `/api/admin/releases/manage/${input.releaseId}?preview=credits`, surface: "credits" },
    { label: "Visuals preview", href: `${base}/media?preview=visuals`, surface: "visuals" },
    { label: "Frontend contract", href: `/api/admin/releases/manage/${input.releaseId}?preview=contract`, surface: "contract" }
  ] satisfies FrontendPreviewLink[];
}
