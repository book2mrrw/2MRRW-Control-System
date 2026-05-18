import { artists } from "@/server/data/seedData";
import { rememberContributorFromCredit, rememberReleaseMetadata } from "@/server/release-management/contributorDirectoryService";
import {
  buildFrontendPreviewLinks,
  buildPublishDryRun,
  buildCreatorExperienceContract,
  buildCreatorConfidence,
  buildAdaptiveWorkflow,
  buildFanPreviewTargets,
  buildReleaseHealthRecommendations,
  buildReleaseMomentPlan,
  buildSmartProgress,
  buildDraftContinueCard,
  createRestorePoint,
  buildReleaseReadinessVector,
  getPublishingStage,
  getLatestUndoableRevision,
  listCacheInvalidationPlans,
  validatePublishConflicts,
  listReleaseActivity,
  listReleaseRevisions,
  listRestorePoints,
  listContentRelationships,
  listCreatorNotifications,
  recordReleaseActivity,
  recordContentRelationship,
  recordReleaseRevision,
  reserveStableSlug,
  createOrUpdateTag,
  upsertContentEntity,
  upsertCreatorSession,
  type CreatorConfidence,
  type DraftContinueCard,
  type FrontendPreviewLink,
  type ReleaseReadinessVector
} from "@/server/release-management/releaseLifecycleService";
import {
  compositionTypes,
  contributionTypes,
  coverArtPolicy,
  lyricReadinessStates,
  releaseTypes,
  type CompositionType,
  type ContributionType,
  type ReleaseVisibilityState,
  type LyricReadinessState,
  type ReleaseManagementStatus,
  type ReleaseType,
  type UploadReadinessState
} from "@/server/release-management/taxonomies";

export type GenreSelection = {
  category: string;
  subgenre: string;
};

export type ReleaseManagementTrack = {
  id: string;
  releaseId: string;
  title: string;
  position: number;
  explicit: boolean;
  lyricsLanguage?: string;
  isLiveVersion: boolean;
  compositionType: CompositionType;
  manualIsrc?: string;
  generatedIsrc?: string;
  partnerPlatformIds: Record<string, string>;
  producerNames: string[];
  audioState: UploadReadinessState;
  lyricsState: LyricReadinessState;
};

export type SongwriterProfile = {
  id: string;
  legalName: string;
  displayName?: string;
  society?: string;
  ipiCaeNumber?: string;
  publisherName?: string;
};

export type TrackContribution = {
  id: string;
  trackId: string;
  songwriterProfileId?: string;
  contributorName: string;
  contributionType: ContributionType;
  isPublisher: boolean;
  ownershipSplit: number;
  publisherName?: string;
};

export type ReleaseManagementDraft = {
  id: string;
  slug: string;
  customSlug?: boolean;
  artistId: string;
  artistName: string;
  title: string;
  releaseType: ReleaseType;
  status: ReleaseManagementStatus;
  visibilityState: ReleaseVisibilityState;
  readinessState: "metadata_incomplete" | "assets_pending" | "rights_pending" | "ready_for_review";
  contentReadiness: ReleaseReadinessVector;
  creatorConfidence: CreatorConfidence[];
  publishingStage: ReturnType<typeof getPublishingStage>;
  continueCard: DraftContinueCard;
  language: string;
  recordLabel?: string;
  copyrightOwner?: string;
  publisherName?: string;
  recordingLocation?: string;
  originalReleaseDate?: string;
  catalogNumber?: string;
  metadataNotes?: string;
  upc?: string;
  internalUpc: string;
  scheduledPublishAt?: string;
  primaryGenre?: GenreSelection;
  secondaryGenre?: GenreSelection;
  moodStyles: string[];
  artistLocation?: {
    city?: string;
    region?: string;
    countryCode?: string;
    territory?: string;
  };
  famousArtistReferences: string[];
  tags: string[];
  coverArtState: UploadReadinessState;
  audioAssetsState: UploadReadinessState;
  lyricsState: LyricReadinessState;
  tracks: ReleaseManagementTrack[];
  archivedAt?: string;
  archiveReason?: string;
  deletedAt?: string;
  recoveryAvailableUntil?: string;
  previewLinks: FrontendPreviewLink[];
  parentReleaseId?: string;
  relationshipType?: "single_to_album" | "deluxe_parent" | "remaster_of" | "alternate_version";
  priority?: "featured_release" | "homepage_hero" | "pinned_vault" | "featured_visual";
  lastSyncedAt?: string;
  saveState: "saving" | "saved" | "syncing" | "synced" | "publishing" | "published" | "failed";
  timezone?: string;
  createdAt: string;
  updatedAt: string;
};

export type ReadinessCheck = {
  key: string;
  passed: boolean;
  message: string;
};

const drafts = new Map<string, ReleaseManagementDraft>();
const songwriterBank = new Map<string, SongwriterProfile>();
const contributions = new Map<string, TrackContribution[]>();

function nowIso() {
  return new Date().toISOString();
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function nextReleaseSlug(title: string, id: string) {
  return reserveStableSlug({
    desired: `${slugify(title) || "untitled"}-${id.slice(-4)}`,
    ownerId: id
  });
}

function nextId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function assertReleaseType(releaseType: ReleaseType) {
  if (!releaseTypes.includes(releaseType)) {
    throw new Error("Unsupported release type");
  }
}

function assertTrackCount(releaseType: ReleaseType, trackCount: number) {
  if (releaseType === "single" && trackCount !== 1) {
    throw new Error("Singles must contain exactly 1 track");
  }

  if (releaseType !== "single" && trackCount < 2) {
    throw new Error("Albums, EPs, deluxe editions, and remix packs must contain at least 2 tracks");
  }
}

function makeTrack(releaseId: string, position: number): ReleaseManagementTrack {
  return {
    id: nextId("trk_draft"),
    releaseId,
    title: `Track ${position}`,
    position,
    explicit: false,
    isLiveVersion: false,
    compositionType: "original",
    partnerPlatformIds: {},
    producerNames: [],
    audioState: "missing",
    lyricsState: "not_required"
  };
}

function getDraftOrThrow(id: string) {
  const draft = drafts.get(id);
  if (!draft) {
    throw new Error("Release draft not found");
  }

  return draft;
}

function summarizeDraftForReadiness(draft: ReleaseManagementDraft) {
  const checks = validateReleaseStructure(draft);
  return buildReleaseReadinessVector({
    id: draft.id,
    slug: draft.slug,
    title: draft.title,
    status: draft.status,
    scheduledPublishAt: draft.scheduledPublishAt,
    updatedAt: draft.updatedAt,
    coverArtState: draft.coverArtState,
    audioAssetsState: draft.audioAssetsState,
    lyricsState: draft.lyricsState,
    tracks: draft.tracks,
    metadataComplete: checks.some((check) => check.key === "metadata" && check.passed),
    creditsComplete: checks.some((check) => check.key === "splits" && check.passed),
    visualsComplete: draft.tracks.some((track) => track.lyricsState === "uploaded" || track.lyricsState === "approved"),
    archivedAt: draft.archivedAt,
    tags: draft.tags
  });
}

function refreshLifecycleFields(draft: ReleaseManagementDraft) {
  draft.contentReadiness = summarizeDraftForReadiness(draft);
  draft.previewLinks = buildFrontendPreviewLinks({ releaseId: draft.id, slug: draft.slug });
  const target = {
    id: draft.id,
    slug: draft.slug,
    title: draft.title,
    status: draft.status,
    scheduledPublishAt: draft.scheduledPublishAt,
    updatedAt: draft.updatedAt,
    coverArtState: draft.coverArtState,
    audioAssetsState: draft.audioAssetsState,
    lyricsState: draft.lyricsState,
    tracks: draft.tracks,
    metadataComplete: draft.contentReadiness.metadata === "ready",
    creditsComplete: draft.contentReadiness.credits === "ready",
    visualsComplete: draft.contentReadiness.visuals === "ready",
    archivedAt: draft.archivedAt,
    tags: draft.tags
  };
  draft.creatorConfidence = buildCreatorConfidence(target);
  draft.publishingStage = getPublishingStage(target);
  draft.continueCard = buildDraftContinueCard(target);
  upsertContentEntity({
    id: draft.id,
    kind: "release",
    title: draft.title,
    slug: draft.slug,
    publishState: draft.publishingStage,
    syncState: draft.saveState,
    parentIds: draft.parentReleaseId ? [draft.parentReleaseId] : [],
    childIds: [],
    relationshipIds: listContentRelationships(draft.id).map((relationship) => relationship.id),
    metadata: {
      releaseType: draft.releaseType,
      visibilityState: draft.visibilityState,
      priority: draft.priority,
      readiness: draft.contentReadiness,
      previewLinks: draft.previewLinks,
      adaptiveWorkflow: buildAdaptiveWorkflow({
        releaseType: draft.releaseType,
        lyricsEnabled: draft.lyricsState !== "not_required",
        advancedMode: Boolean(draft.parentReleaseId || draft.metadataNotes)
      })
    },
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt
  });
  return draft;
}

export function createReleaseDraft(input: {
  releaseType: ReleaseType;
  title?: string;
  artistName?: string;
  trackCount?: number;
}) {
  assertReleaseType(input.releaseType);
  const defaultTrackCounts: Record<ReleaseType, number> = {
    single: 1,
    ep: 4,
    album: 10,
    deluxe: 15,
    remix_pack: 5
  };
  const trackCount = input.trackCount ?? defaultTrackCounts[input.releaseType];
  assertTrackCount(input.releaseType, trackCount);

  const title = input.title?.trim() || (input.releaseType === "single" ? "Untitled Single" : "Untitled Release");
  const id = nextId("rel_draft");
  const timestamp = nowIso();
  const artist = artists[0];
  const draft: ReleaseManagementDraft = {
    id,
    slug: nextReleaseSlug(title, id),
    artistId: artist?.id ?? "artist_2mrrw",
    artistName: input.artistName?.trim() || artist?.name || "2MRRW",
    title,
    releaseType: input.releaseType,
    status: "metadata_incomplete",
    visibilityState: "draft",
    readinessState: "metadata_incomplete",
    contentReadiness: {
      metadata: "not_started",
      audio: "not_started",
      artwork: "not_started",
      credits: "not_started",
      visuals: "not_started",
      publishing: "not_started"
    },
    creatorConfidence: [],
    publishingStage: "draft",
    continueCard: {
      releaseId: id,
      title,
      href: `/releases/${id}`,
      nextAction: "Finish metadata",
      percentComplete: 0,
      lastModifiedAt: timestamp,
      recoveryState: "active"
    },
    language: "en",
    internalUpc: `2MRRW-${Date.now()}`,
    moodStyles: [],
    famousArtistReferences: [],
    tags: [],
    coverArtState: "missing",
    audioAssetsState: "missing",
    lyricsState: "not_required",
    tracks: Array.from({ length: trackCount }, (_, index) => makeTrack(id, index + 1)),
    previewLinks: buildFrontendPreviewLinks({ releaseId: id, slug: nextReleaseSlug(title, id) }),
    saveState: "saved",
    timezone: "America/New_York",
    createdAt: timestamp,
    updatedAt: timestamp
  };

  refreshLifecycleFields(draft);
  upsertCreatorSession({ releaseId: id, currentStep: "setup", focusMode: true });
  drafts.set(id, draft);
  recordReleaseRevision({
    releaseId: id,
    kind: "release_revision",
    label: "Release draft created",
    after: { title: draft.title, releaseType: draft.releaseType, slug: draft.slug }
  });
  createRestorePoint({
    releaseId: id,
    label: "Initial draft restore point",
    snapshot: draft
  });
  return draft;
}

export function listReleaseDrafts() {
  return [...drafts.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getReleaseDraft(id: string) {
  return drafts.get(id) ?? null;
}

export function updateReleaseMetadata(
  id: string,
  input: Partial<
    Pick<
      ReleaseManagementDraft,
      | "title"
      | "language"
      | "recordLabel"
      | "copyrightOwner"
      | "upc"
      | "scheduledPublishAt"
      | "primaryGenre"
      | "secondaryGenre"
      | "artistLocation"
      | "slug"
      | "visibilityState"
      | "parentReleaseId"
      | "relationshipType"
      | "priority"
      | "timezone"
    >
  > & {
    moodStyles?: string[];
    famousArtistReferences?: string[];
    publisherName?: string;
    recordingLocation?: string;
    originalReleaseDate?: string;
    catalogNumber?: string;
    metadataNotes?: string;
    coverArtState?: UploadReadinessState;
    audioAssetsState?: UploadReadinessState;
    lyricsState?: LyricReadinessState;
    tags?: string[];
  }
) {
  const draft = getDraftOrThrow(id);
  draft.saveState = "saving";
  upsertCreatorSession({ releaseId: id, currentStep: "setup" });
  const before = {
    title: draft.title,
    slug: draft.slug,
    visibilityState: draft.visibilityState,
    coverArtState: draft.coverArtState,
    audioAssetsState: draft.audioAssetsState,
    lyricsState: draft.lyricsState
  };
  const nextReferences = input.famousArtistReferences?.filter(Boolean).slice(0, 3);
  const requestedSlug = input.slug?.trim();
  const slugChanged = Boolean(requestedSlug && requestedSlug !== draft.slug);
  const generatedSlug = input.title && !draft.customSlug ? nextReleaseSlug(input.title, draft.id) : draft.slug;
  Object.assign(draft, {
    ...input,
    ...(input.title ? { slug: generatedSlug } : {}),
    ...(requestedSlug ? { slug: reserveStableSlug({ desired: requestedSlug, ownerId: draft.id }), customSlug: true } : {}),
    ...(nextReferences ? { famousArtistReferences: nextReferences } : {}),
    ...(input.tags ? { tags: input.tags.map((tag) => createOrUpdateTag({ label: tag, scopes: ["release"] }).slug) } : {}),
    updatedAt: nowIso()
  });
  if (draft.parentReleaseId && draft.relationshipType) {
    recordContentRelationship({
      sourceId: draft.id,
      sourceKind: "release",
      targetId: draft.parentReleaseId,
      targetKind: "release",
      relationshipKind: draft.relationshipType,
      label: `${draft.title} relationship`
    });
  }
  rememberReleaseMetadata({
    artistName: draft.artistName,
    featuredArtists: draft.famousArtistReferences,
    recordLabel: draft.recordLabel,
    copyrightOwner: draft.copyrightOwner,
    publisherName: draft.publisherName,
    recordingLocation: draft.recordingLocation
  });
  draft.readinessState = getReadinessSummary(draft.id).ready ? "ready_for_review" : draft.readinessState;
  draft.saveState = "saved";
  refreshLifecycleFields(draft);
  recordReleaseRevision({
    releaseId: draft.id,
    kind: slugChanged ? "slug_change" : input.coverArtState ? "artwork_replacement" : "metadata_edit",
    label: slugChanged ? "Release link updated" : input.coverArtState ? "Artwork readiness updated" : "Release details saved",
    before,
    after: {
      title: draft.title,
      slug: draft.slug,
      visibilityState: draft.visibilityState,
      coverArtState: draft.coverArtState,
      audioAssetsState: draft.audioAssetsState,
      lyricsState: draft.lyricsState
    }
  });
  createRestorePoint({
    releaseId: draft.id,
    label: "Before latest metadata save",
    snapshot: before
  });
  return draft;
}

export function updateTrackInformation(
  releaseId: string,
  trackId: string,
  input: Partial<
    Pick<
      ReleaseManagementTrack,
      | "title"
      | "explicit"
      | "lyricsLanguage"
      | "isLiveVersion"
      | "compositionType"
      | "manualIsrc"
      | "generatedIsrc"
      | "partnerPlatformIds"
      | "producerNames"
      | "audioState"
      | "lyricsState"
    >
  >
) {
  const draft = getDraftOrThrow(releaseId);
  draft.saveState = "saving";
  upsertCreatorSession({ releaseId, currentStep: "tracks" });
  const track = draft.tracks.find((item) => item.id === trackId);
  if (!track) {
    throw new Error("Track not found");
  }

  if (input.compositionType && !compositionTypes.includes(input.compositionType)) {
    throw new Error("Unsupported composition type");
  }

  Object.assign(track, input);
  input.producerNames?.forEach((producerName) => {
    rememberContributorFromCredit({
      contributorName: producerName,
      contributionType: "producer"
    });
  });
  draft.audioAssetsState = draft.tracks.every((item) => item.audioState === "approved" || item.audioState === "uploaded")
    ? "uploaded"
    : draft.tracks.some((item) => item.audioState !== "missing")
      ? "partial"
      : "missing";
  draft.updatedAt = nowIso();
  draft.saveState = "saved";
  refreshLifecycleFields(draft);
  recordReleaseRevision({
    releaseId,
    kind: input.audioState ? "audio_replacement" : "metadata_edit",
    label: input.audioState ? `${track.title} audio readiness updated` : `${track.title} track information saved`,
    before: { trackId, audioState: track.audioState },
    after: { trackId, title: track.title, audioState: track.audioState, lyricsState: track.lyricsState }
  });
  return track;
}

export function createSongwriterProfile(input: Omit<SongwriterProfile, "id">) {
  const legalName = input.legalName.trim();
  if (!legalName) {
    throw new Error("Songwriter legal name is required");
  }

  const profile = { ...input, legalName, id: nextId("writer") };
  songwriterBank.set(profile.id, profile);
  return profile;
}

export function listSongwriterProfiles() {
  return [...songwriterBank.values()].sort((a, b) => a.legalName.localeCompare(b.legalName));
}

export function attachTrackContribution(
  releaseId: string,
  trackId: string,
  input: Omit<TrackContribution, "id" | "trackId">
) {
  getDraftOrThrow(releaseId);
  if (!contributionTypes.includes(input.contributionType)) {
    throw new Error("Unsupported contribution type");
  }

  if (input.ownershipSplit < 0 || input.ownershipSplit > 100) {
    throw new Error("Ownership split must be between 0 and 100");
  }

  const row = { ...input, trackId, id: nextId("contrib") };
  const rows = contributions.get(trackId) ?? [];
  rows.push(row);
  contributions.set(trackId, rows);
  rememberContributorFromCredit({
    contributorName: input.contributorName,
    contributionType: input.contributionType,
    publisherName: input.publisherName
  });
  const draft = getDraftOrThrow(releaseId);
  draft.saveState = "saved";
  draft.updatedAt = nowIso();
  refreshLifecycleFields(draft);
  recordReleaseActivity({
    releaseId,
    kind: "metadata_edit",
    message: `${input.contributorName} added to ${draft.tracks.find((track) => track.id === trackId)?.title ?? "track"} credits`
  });
  return row;
}

export function listTrackContributions(trackId: string) {
  return contributions.get(trackId) ?? [];
}

export function validateTrackSplits(trackId: string) {
  const total = listTrackContributions(trackId).reduce((sum, row) => sum + row.ownershipSplit, 0);
  return {
    passed: Math.abs(total - 100) < 0.001,
    total,
    message: total === 100 ? "Contributor splits are complete." : `You still need ${Math.max(0, 100 - total)}% remaining before continuing.`
  };
}

export function validateReleaseStructure(draft: ReleaseManagementDraft): ReadinessCheck[] {
  return [
    {
      key: "track_count",
      passed: draft.releaseType === "single" ? draft.tracks.length === 1 : draft.tracks.length >= 2,
      message: draft.releaseType === "single" ? "Single has exactly 1 track" : "Multi-track release has at least 2 tracks"
    },
    {
      key: "metadata",
      passed: Boolean(draft.title && draft.language && draft.copyrightOwner && draft.primaryGenre),
      message: "Release details still need completion"
    },
    {
      key: "cover_art",
      passed: draft.coverArtState === "uploaded" || draft.coverArtState === "approved",
      message: "Cover artwork must meet 2MRRW quality requirements."
    },
    {
      key: "audio",
      passed: draft.tracks.every((track) => track.audioState === "uploaded" || track.audioState === "approved"),
      message: "Every track needs uploaded audio"
    },
    {
      key: "track_information",
      passed: draft.tracks.every((track) => Boolean(track.title && track.compositionType)),
      message: "Every track needs a title and track details"
    },
    {
      key: "splits",
      passed: draft.tracks.every((track) => validateTrackSplits(track.id).passed),
      message: "Every track needs contributor splits totaling exactly 100%"
    }
  ];
}

export function getReadinessSummary(releaseId: string) {
  const draft = getDraftOrThrow(releaseId);
  refreshLifecycleFields(draft);
  const checks = validateReleaseStructure(draft);
  const ready = checks.every((check) => check.passed);
  const conflicts = validatePublishConflicts(
    {
      id: draft.id,
      slug: draft.slug,
      title: draft.title,
      status: draft.status,
      scheduledPublishAt: draft.scheduledPublishAt,
      updatedAt: draft.updatedAt,
      coverArtState: draft.coverArtState,
      audioAssetsState: draft.audioAssetsState,
      lyricsState: draft.lyricsState,
      tracks: draft.tracks,
      metadataComplete: draft.contentReadiness.metadata === "ready",
      creditsComplete: draft.contentReadiness.credits === "ready",
      visualsComplete: draft.contentReadiness.visuals === "ready",
      archivedAt: draft.archivedAt,
      tags: draft.tags
    },
    listReleaseDrafts().map((item) => ({ id: item.id, title: item.title, scheduledPublishAt: item.scheduledPublishAt }))
  );
  return {
    releaseId,
    ready,
    status: ready ? "ready_for_review" : draft.status,
    contentReadiness: draft.contentReadiness,
    creatorConfidence: draft.creatorConfidence,
    publishingStage: draft.publishingStage,
    conflicts,
    checks
  };
}

export function getReleaseManagementOverview() {
  const rows = listReleaseDrafts();
  return {
    accountDashboard: {
      drafts: rows.length,
      incomplete: rows.filter((draft) => !getReadinessSummary(draft.id).ready).length,
      readyForReview: rows.filter((draft) => getReadinessSummary(draft.id).ready).length,
      published: rows.filter((draft) => draft.status === "published").length
    },
    missionControl: {
      addReleaseHref: "/releases/new",
      scheduledReleases: rows.filter((draft) => draft.status === "scheduled"),
      draftReleases: rows.filter((draft) => ["draft", "metadata_incomplete", "assets_pending", "rights_pending", "ready_for_review"].includes(draft.status)),
      recentlyUpdated: rows.slice(0, 6),
      continueCards: rows.map((draft) => refreshLifecycleFields(draft).continueCard),
      systemConfidence: rows[0]?.creatorConfidence ?? [],
      creatorExperience: buildCreatorExperienceContract(),
      notifications: listCreatorNotifications().slice(0, 6)
    },
    addNewRelease: releaseTypes,
    incompleteReleases: rows.filter((draft) => !getReadinessSummary(draft.id).ready),
    allReleases: rows
  };
}

export function dryRunReleasePublish(releaseId: string, options: { recordActivity?: boolean } = { recordActivity: true }) {
  const draft = getDraftOrThrow(releaseId);
  const summary = getReadinessSummary(releaseId);
  const cachePlan = listCacheInvalidationPlans().filter((plan) => plan.releaseId === releaseId);
  const result = buildPublishDryRun({
    target: {
      id: draft.id,
      slug: draft.slug,
      title: draft.title,
      status: draft.status,
      scheduledPublishAt: draft.scheduledPublishAt,
      updatedAt: draft.updatedAt,
      coverArtState: draft.coverArtState,
      audioAssetsState: draft.audioAssetsState,
      lyricsState: draft.lyricsState,
      tracks: draft.tracks,
      metadataComplete: draft.contentReadiness.metadata === "ready",
      creditsComplete: draft.contentReadiness.credits === "ready",
      visualsComplete: draft.contentReadiness.visuals === "ready",
      archivedAt: draft.archivedAt,
      tags: draft.tags
    },
    warnings: summary.conflicts,
    previewLinks: draft.previewLinks,
    cachePlan,
    mode: draft.visibilityState === "public" ? "production" : "staging"
  });
  if (options.recordActivity !== false) {
    recordReleaseActivity({ releaseId, kind: "dry_run", message: result.ok ? "Publish dry run passed" : "Publish dry run found items to review" });
  }
  return result;
}

export function undoLastReleaseChange(releaseId: string) {
  const draft = getDraftOrThrow(releaseId);
  const revision = getLatestUndoableRevision(releaseId);
  if (!revision || typeof revision.before !== "object" || revision.before === null) {
    throw new Error("No reversible release change is available");
  }
  const before = { ...draft };
  Object.assign(draft, revision.before, {
    updatedAt: nowIso(),
    saveState: "saved"
  });
  refreshLifecycleFields(draft);
  recordReleaseRevision({
    releaseId,
    kind: "undo",
    label: `Undo applied: ${revision.label}`,
    before,
    after: revision.before
  });
  return draft;
}

export function archiveReleaseDraft(releaseId: string, reason = "Archived from Control System") {
  const draft = getDraftOrThrow(releaseId);
  const before = { status: draft.status, visibilityState: draft.visibilityState };
  draft.status = "archived";
  draft.visibilityState = "private";
  draft.archivedAt = nowIso();
  draft.archiveReason = reason;
  draft.recoveryAvailableUntil = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  draft.updatedAt = nowIso();
  draft.saveState = "synced";
  refreshLifecycleFields(draft);
  recordReleaseRevision({
    releaseId,
    kind: "archive",
    label: "Release archived with recovery available",
    before,
    after: { status: draft.status, visibilityState: draft.visibilityState, recoveryAvailableUntil: draft.recoveryAvailableUntil }
  });
  return draft;
}

export function recoverReleaseDraft(releaseId: string) {
  const draft = getDraftOrThrow(releaseId);
  if (!draft.archivedAt) return draft;
  const before = { status: draft.status, archivedAt: draft.archivedAt };
  draft.status = "metadata_incomplete";
  draft.visibilityState = "draft";
  draft.archivedAt = undefined;
  draft.archiveReason = undefined;
  draft.deletedAt = undefined;
  draft.updatedAt = nowIso();
  draft.saveState = "saved";
  refreshLifecycleFields(draft);
  recordReleaseRevision({
    releaseId,
    kind: "recovery",
    label: "Release recovered from archive",
    before,
    after: { status: draft.status, visibilityState: draft.visibilityState }
  });
  return draft;
}

export function markReleaseForDeletion(releaseId: string) {
  const draft = archiveReleaseDraft(releaseId, "Marked for deletion; archived first");
  draft.deletedAt = nowIso();
  recordReleaseRevision({
    releaseId,
    kind: "archive",
    label: "Release marked for deletion after archive",
    after: { deletedAt: draft.deletedAt, recoveryAvailableUntil: draft.recoveryAvailableUntil }
  });
  return draft;
}

export function bulkUpdateReleaseDrafts(input: {
  releaseIds: string[];
  action: "archive" | "tag" | "publish_visibility" | "private_visibility";
  tags?: string[];
}) {
  return input.releaseIds.map((releaseId) => {
    const draft = getDraftOrThrow(releaseId);
    if (input.action === "archive") return archiveReleaseDraft(releaseId, "Bulk archived");
    if (input.action === "tag") {
      const nextTags = [...new Set([...draft.tags, ...(input.tags ?? []).map((tag) => createOrUpdateTag({ label: tag, scopes: ["release"] }).slug)])];
      draft.tags = nextTags;
    }
    if (input.action === "publish_visibility") draft.visibilityState = "public";
    if (input.action === "private_visibility") draft.visibilityState = "private";
    draft.updatedAt = nowIso();
    refreshLifecycleFields(draft);
    recordReleaseActivity({ releaseId, kind: "bulk_action", message: `Bulk action applied: ${input.action.replaceAll("_", " ")}` });
    return draft;
  });
}

export function getReleaseLifecycle(releaseId: string) {
  const draft = getDraftOrThrow(releaseId);
  refreshLifecycleFields(draft);
  return {
    releaseId,
    readiness: draft.contentReadiness,
    visibilityState: draft.visibilityState,
    revisions: listReleaseRevisions(releaseId),
    activity: listReleaseActivity(releaseId),
    previewLinks: draft.previewLinks,
    fanPreviewTargets: buildFanPreviewTargets({ releaseId: draft.id, slug: draft.slug }),
    smartProgress: buildSmartProgress(draft.contentReadiness),
    healthRecommendations: buildReleaseHealthRecommendations(draft.contentReadiness),
    adaptiveWorkflow: buildAdaptiveWorkflow({
      releaseType: draft.releaseType,
      lyricsEnabled: draft.lyricsState !== "not_required",
      advancedMode: Boolean(draft.parentReleaseId || draft.metadataNotes)
    }),
    releaseMomentPlan: buildReleaseMomentPlan({
      releaseId,
      readiness: draft.contentReadiness,
      priority: draft.priority
    }),
    publishDryRun: dryRunReleasePublish(releaseId, { recordActivity: false }),
    tags: draft.tags,
    relationships: listContentRelationships(releaseId),
    restorePoints: listRestorePoints(releaseId),
    creatorExperience: buildCreatorExperienceContract()
  };
}
