import type { ScheduleParts } from "@/lib/scheduling/releaseScheduleTime";
import {
  normalizePricingTier,
  validateOptionalPriceInCents,
  validateReleasePriceInCents
} from "@/server/commerce/pricingValidation";
import { fetchDurableReleaseById } from "@/server/catalog/releaseCatalogService";
import { artists } from "@/server/data/seedData";
import { hydrateDraftFromCatalogRelease } from "@/server/release-management/releaseCatalogHydrationService";
import { buildSchedulePayload, persistReleaseSchedule, persistReleaseUnpublish } from "@/server/releases/scheduledPublishService";
import { validateDraftCommerceFields, persistDraftCommerceColumns } from "@/server/commerce/releaseCommerceService";
import { isStorefrontSyncPushReady } from "@/server/sync/storefrontSyncConfig";
import { emitAfterSuccessfulAction } from "@/server/events/eventedWriteService";
import { persistSyncEvent } from "@/server/events/syncEventPersistenceService";
import { rememberContributorFromCredit, rememberReleaseMetadata } from "@/server/release-management/contributorDirectoryService";
import { persistReleaseCreditMetadata } from "@/server/release-management/releaseMetadataPersistenceService";
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

import type { CoverArtMediaType } from "@/lib/media/coverArt";

export type GenreSelection = {
  category: string;
  subgenre: string;
};

export type ReleaseManagementTrack = {
  id: string;
  releaseId: string;
  title: string;
  audioFile?: string;
  previewAudioFile?: string;
  fullAudioFile?: string;
  credits?: string;
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
  coverArtType?: CoverArtMediaType;
  csCover?: string;
  csCoverType?: CoverArtMediaType;
  csAudio?: string;
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
  producer?: string;
  mixingEngineer?: string;
  masteringEngineer?: string;
  writtenBy?: string;
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
  coverArtPath?: string;
  motionArtworkPath?: string;
  coverArtType?: CoverArtMediaType;
  csCover?: string;
  csCoverType?: CoverArtMediaType;
  csAudio?: string;
  frontendSyncTargets: string[];
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
  priceInCents?: number | null;
  pricingTier?: "single" | "ep" | "album" | null;
  giftingEnabled?: boolean;
  deluxePriceInCents?: number | null;
  bundlePriceInCents?: number | null;
  perTrackOverrides?: Record<string, unknown> | null;
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

function persistReleaseTracklistSyncEvent(draft: ReleaseManagementDraft, updates: Record<string, unknown>) {
  void persistSyncEvent({
    type: "release.updated",
    entityId: draft.id,
    timestamp: Date.now(),
    data: {
      releaseId: draft.id,
      slug: draft.slug,
      source: "release_management",
      syncScope: "tracklist",
      frontendSyncTargets: draft.frontendSyncTargets,
      trackCount: draft.tracks.length,
      tracklist: draft.tracks.map((track) => ({
        id: track.id,
        title: track.title,
        position: track.position,
        previewAudioFile: track.previewAudioFile,
        fullAudioFile: track.fullAudioFile,
        audioState: track.audioState
      })),
      updates
    }
  });
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

  if (releaseType === "ep" && (trackCount < 0 || trackCount > 6)) {
    throw new Error("EPs can contain up to 6 tracks while drafting");
  }

  if (releaseType === "album" && trackCount < 0) {
    throw new Error("Albums cannot have a negative track count");
  }

  if (releaseType === "feature" && trackCount !== 1) {
    throw new Error("Features must contain exactly 1 track");
  }

  if ((releaseType === "deluxe" || releaseType === "remix_pack") && trackCount < 0) {
    throw new Error("Deluxe editions and remix packs cannot have a negative track count");
  }
}

function makeTrack(releaseId: string, position: number): ReleaseManagementTrack {
  return {
    id: nextId("trk_draft"),
    releaseId,
    title: "",
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

function defaultEmptyTrack(releaseId: string) {
  return makeTrack(releaseId, 1);
}

function normalizeTrackArrayForRelease(draft: ReleaseManagementDraft) {
  if (draft.releaseType === "single" || draft.releaseType === "feature") {
    const firstTrack = draft.tracks[0] ?? defaultEmptyTrack(draft.id);
    firstTrack.position = 1;
    firstTrack.releaseId = draft.id;
    draft.tracks = [firstTrack];
    return draft.tracks;
  }

  draft.tracks = draft.tracks
    .filter(Boolean)
    .map((track, index) => ({
      ...track,
      releaseId: draft.id,
      position: index + 1
    }));
  return draft.tracks;
}

function normalizeTrackArrayForReleaseDraft(draft: ReleaseManagementDraft) {
  normalizeTrackArrayForRelease(draft);
  return draft;
}

function getDraftOrThrow(id: string) {
  const draft = drafts.get(id);
  if (!draft) {
    throw new Error("Release draft not found");
  }

  return draft;
}

/** Hydrate in-memory draft from Supabase when studio opens a catalog release (serverless cold start). */
export async function ensureDraftHydratedFromCatalog(releaseId: string) {
  if (getReleaseDraft(releaseId)) return;
  const release = await fetchDurableReleaseById(releaseId);
  if (!release) {
    throw new Error("Release draft not found");
  }
  hydrateDraftFromCatalogRelease(release);
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
    creditsComplete: checks.some((check) => check.key === "track_credits" && check.passed),
    visualsComplete: draft.tracks.some((track) => track.lyricsState === "uploaded" || track.lyricsState === "approved"),
    archivedAt: draft.archivedAt,
    tags: draft.tags
  });
}

function buildRelationalReleaseMediaObject(draft: ReleaseManagementDraft) {
  const frontendSyncTargets = [...new Set(draft.frontendSyncTargets.length ? draft.frontendSyncTargets : draft.tags.filter((tag) => !tag.startsWith("frontend-import")))];
  return {
    releaseId: draft.id,
    coverArt: draft.coverArtPath,
    motionArtwork: draft.motionArtworkPath,
    metadata: {
      slug: draft.slug,
      title: draft.title,
      artistName: draft.artistName,
      language: draft.language,
      primaryGenre: draft.primaryGenre,
      secondaryGenre: draft.secondaryGenre,
      tags: draft.tags
    },
    tracklist: draft.tracks.map((track) => ({
      trackId: track.id,
      title: track.title,
      position: track.position,
      previewAudio: track.previewAudioFile,
      fullAudio: track.fullAudioFile ?? track.audioFile,
      audioState: track.audioState
    })),
    releaseType: draft.releaseType,
    releaseDate: draft.scheduledPublishAt ?? draft.originalReleaseDate,
    publishState: draft.status,
    frontendSyncTargets
  };
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
      mediaObject: buildRelationalReleaseMediaObject(draft),
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
    ep: 0,
    album: 0,
    feature: 1,
    deluxe: 0,
    remix_pack: 0
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
    frontendSyncTargets: [],
    coverArtState: "missing",
    audioAssetsState: "missing",
    lyricsState: "not_required",
    giftingEnabled: false,
    tracks: Array.from({ length: input.releaseType === "single" ? 1 : trackCount }, (_, index) => makeTrack(id, index + 1)),
    previewLinks: buildFrontendPreviewLinks({ releaseId: id, slug: nextReleaseSlug(title, id) }),
    saveState: "saved",
    timezone: "America/New_York",
    createdAt: timestamp,
    updatedAt: timestamp
  };

  normalizeTrackArrayForRelease(draft);
  refreshLifecycleFields(draft);
  upsertCreatorSession({ releaseId: id, currentStep: "setup", focusMode: true });
  drafts.set(id, draft);
  emitAfterSuccessfulAction({
    type: "release.created",
    entityId: id,
    data: {
      releaseId: id,
      releaseType: draft.releaseType,
      title: draft.title,
      durable: false
    }
  });
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

export function upsertImportedReleaseDraft(input: {
  id: string;
  slug: string;
  title: string;
  releaseType: ReleaseType;
  artistName?: string;
  status?: ReleaseManagementStatus;
  visibilityState?: ReleaseVisibilityState;
  originalReleaseDate?: string;
  scheduledPublishAt?: string;
  timezone?: string;
  tracks: Array<{
    id: string;
    title: string;
    position: number;
    audioFile?: string;
    previewAudioFile?: string;
    fullAudioFile?: string;
    audioState?: UploadReadinessState;
  }>;
  tags?: string[];
  coverArtPath?: string;
  motionArtworkPath?: string;
  coverArtType?: CoverArtMediaType;
  csCover?: string;
  csCoverType?: CoverArtMediaType;
  metadataNotes?: string;
  frontendSections?: string[];
  sourceKey: string;
}) {
  assertReleaseType(input.releaseType);
  const existing = drafts.get(input.id);
  const timestamp = nowIso();
  const artist = artists[0];
  const tracks = input.tracks
    .filter((track) => track.title.trim())
    .sort((a, b) => a.position - b.position)
    .map((track, index) => ({
      id: track.id,
      releaseId: input.id,
      title: track.title.trim(),
      audioFile: track.audioFile,
      previewAudioFile: track.previewAudioFile,
      fullAudioFile: track.fullAudioFile,
      position: index + 1,
      explicit: false,
      isLiveVersion: false,
      compositionType: "original" as const,
      partnerPlatformIds: {},
      producerNames: [],
      audioState: track.audioState ?? "missing",
      lyricsState: "not_required" as const
    }));
  const hasUploadedAudio = tracks.some((track) => track.audioState === "uploaded" || track.audioState === "approved");
  const draft: ReleaseManagementDraft = {
    ...(existing ?? {
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
        releaseId: input.id,
        title: input.title,
        href: `/releases/${input.id}`,
        nextAction: "Review imported metadata",
        percentComplete: 0,
        lastModifiedAt: timestamp,
        recoveryState: "active"
      },
      previewLinks: [],
      createdAt: timestamp
    }),
    id: input.id,
    slug: reserveStableSlug({ desired: input.slug, ownerId: input.id }),
    customSlug: true,
    artistId: artist?.id ?? "artist_2mrrw",
    artistName: input.artistName?.trim() || artist?.name || "2MRRW",
    title: input.title.trim(),
    releaseType: input.releaseType,
    status: input.status ?? existing?.status ?? "published",
    visibilityState: input.visibilityState ?? existing?.visibilityState ?? "public",
    readinessState: existing?.readinessState ?? (input.status === "published" && input.coverArtPath ? "ready_for_review" : "assets_pending"),
    language: existing?.language ?? "en",
    internalUpc: existing?.internalUpc ?? `2MRRW-FRONTEND-${input.slug.toUpperCase()}`,
    copyrightOwner: existing?.copyrightOwner ?? "2MRRW",
    originalReleaseDate: input.originalReleaseDate ?? existing?.originalReleaseDate,
    scheduledPublishAt: input.scheduledPublishAt ?? existing?.scheduledPublishAt,
    timezone: input.timezone ?? existing?.timezone,
    primaryGenre: existing?.primaryGenre ?? { category: "hip-hop-rap", subgenre: "alternative-rap" },
    moodStyles: existing?.moodStyles ?? [],
    famousArtistReferences: existing?.famousArtistReferences ?? [],
    tags: [...new Set([...(input.tags ?? []), ...(input.frontendSections ?? []), "frontend-import"].filter(Boolean))],
    coverArtPath: input.coverArtPath ?? existing?.coverArtPath,
    motionArtworkPath: input.motionArtworkPath ?? existing?.motionArtworkPath,
    coverArtType: input.coverArtType ?? existing?.coverArtType,
    csCover: input.csCover ?? existing?.csCover,
    csCoverType: input.csCoverType ?? existing?.csCoverType,
    frontendSyncTargets: [...new Set([...(existing?.frontendSyncTargets ?? []), ...(input.frontendSections ?? [])])],
    coverArtState: input.coverArtPath || input.csCover || input.motionArtworkPath ? "uploaded" : existing?.coverArtState ?? "missing",
    audioAssetsState: hasUploadedAudio ? "uploaded" : existing?.audioAssetsState ?? "missing",
    lyricsState: existing?.lyricsState ?? "not_required",
    tracks,
    metadataNotes: input.metadataNotes ?? existing?.metadataNotes ?? `Imported from frontend source ${input.sourceKey}.`,
    saveState: "synced",
    updatedAt: timestamp
  };

  normalizeTrackArrayForRelease(draft);
  refreshLifecycleFields(draft);
  drafts.set(input.id, draft);
  recordReleaseRevision({
    releaseId: input.id,
    kind: existing ? "metadata_edit" : "release_revision",
    label: existing ? "Frontend import refreshed" : "Frontend release imported",
    after: {
      slug: draft.slug,
      title: draft.title,
      releaseType: draft.releaseType,
      sourceKey: input.sourceKey,
      frontendSections: input.frontendSections
    }
  });
  emitAfterSuccessfulAction({
    type: existing ? "release.updated" : "release.created",
    entityId: input.id,
    data: {
      releaseId: input.id,
      slug: draft.slug,
      title: draft.title,
      source: "frontend_import",
      durable: false
    }
  });
  return draft;
}

export function listReleaseDrafts() {
  return [...drafts.values()].map(normalizeTrackArrayForReleaseDraft).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getReleaseDraft(id: string) {
  const draft = drafts.get(id) ?? null;
  return draft ? normalizeTrackArrayForReleaseDraft(draft) : null;
}

export function addTrackToReleaseDraft(releaseId: string) {
  const draft = getDraftOrThrow(releaseId);
  normalizeTrackArrayForRelease(draft);
  if (draft.releaseType === "single" || draft.releaseType === "feature") {
    throw new Error("Singles use exactly one track slot");
  }
  if (draft.releaseType === "ep" && draft.tracks.length >= 6) {
    throw new Error("EPs can contain 2-6 tracks");
  }
  draft.saveState = "saving";
  const track = makeTrack(draft.id, draft.tracks.length + 1);
  draft.tracks.push(track);
  draft.updatedAt = nowIso();
  draft.saveState = "saved";
  refreshLifecycleFields(draft);
  emitAfterSuccessfulAction({
    type: "release.updated",
    entityId: releaseId,
    data: {
      releaseId,
      trackId: track.id,
      durable: false,
      updates: { trackAdded: true }
    }
  });
  persistReleaseTracklistSyncEvent(draft, { trackAdded: true, trackId: track.id });
  recordReleaseRevision({
    releaseId,
    kind: "metadata_edit",
    label: "Track slot added",
    after: { trackId: track.id, trackCount: draft.tracks.length }
  });
  return track;
}

export function removeTrackFromReleaseDraft(releaseId: string, trackId: string) {
  const draft = getDraftOrThrow(releaseId);
  normalizeTrackArrayForRelease(draft);
  if (draft.releaseType === "single" || draft.releaseType === "feature") {
    throw new Error("Singles must keep exactly one track slot");
  }
  const beforeCount = draft.tracks.length;
  draft.tracks = draft.tracks.filter((track) => track.id !== trackId);
  if (draft.tracks.length === beforeCount) {
    throw new Error("Track not found");
  }
  normalizeTrackArrayForRelease(draft);
  draft.updatedAt = nowIso();
  draft.saveState = "saved";
  refreshLifecycleFields(draft);
  emitAfterSuccessfulAction({
    type: "release.updated",
    entityId: releaseId,
    data: {
      releaseId,
      trackId,
      durable: false,
      updates: { trackRemoved: true }
    }
  });
  persistReleaseTracklistSyncEvent(draft, { trackRemoved: true, trackId });
  return draft;
}

export function reorderReleaseTracks(releaseId: string, trackIds: string[]) {
  const draft = getDraftOrThrow(releaseId);
  normalizeTrackArrayForRelease(draft);
  if (draft.releaseType === "single" || draft.releaseType === "feature") {
    throw new Error("Singles cannot reorder tracks");
  }
  const byId = new Map(draft.tracks.map((track) => [track.id, track]));
  const reordered = trackIds.map((id) => byId.get(id)).filter((track): track is ReleaseManagementTrack => Boolean(track));
  if (reordered.length !== draft.tracks.length) {
    throw new Error("Track order must include every track exactly once");
  }
  draft.tracks = reordered.map((track, index) => ({ ...track, position: index + 1, releaseId: draft.id }));
  draft.updatedAt = nowIso();
  draft.saveState = "saved";
  refreshLifecycleFields(draft);
  emitAfterSuccessfulAction({
    type: "release.updated",
    entityId: releaseId,
    data: { releaseId, durable: false, updates: { trackOrder: trackIds } }
  });
  persistReleaseTracklistSyncEvent(draft, { trackOrder: trackIds });
  recordReleaseRevision({
    releaseId,
    kind: "metadata_edit",
    label: "Track order updated",
    after: { trackOrder: trackIds }
  });
  return draft;
}

export function updateReleaseMetadata(
  id: string,
  input: Partial<
    Pick<
      ReleaseManagementDraft,
      | "title"
      | "language"
      | "recordLabel"
      | "producer"
      | "mixingEngineer"
      | "masteringEngineer"
      | "writtenBy"
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
      | "coverArtPath"
      | "motionArtworkPath"
      | "coverArtType"
      | "csCover"
      | "csCoverType"
      | "csAudio"
      | "frontendSyncTargets"
      | "priceInCents"
      | "pricingTier"
      | "giftingEnabled"
      | "deluxePriceInCents"
      | "bundlePriceInCents"
      | "perTrackOverrides"
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
    priceInCents?: number | null;
    pricingTier?: "single" | "ep" | "album" | null;
    giftingEnabled?: boolean;
  }
) {
  const draft = getDraftOrThrow(id);
  normalizeTrackArrayForRelease(draft);
  const effectivePrice = input.priceInCents !== undefined ? input.priceInCents : draft.priceInCents;
  const effectiveTier =
    input.pricingTier ?? draft.pricingTier ?? normalizePricingTier(draft.releaseType, null) ?? null;
  if (effectivePrice != null) {
    const priceCheck = validateReleasePriceInCents(effectivePrice, effectiveTier);
    if (!priceCheck.ok) throw new Error(priceCheck.message);
  }
  const nextGiftingFlag = input.giftingEnabled !== undefined ? Boolean(input.giftingEnabled) : Boolean(draft.giftingEnabled);
  if (nextGiftingFlag && effectivePrice == null) {
    throw new Error("Gifting requires a valid storefront price.");
  }
  for (const check of [
    validateOptionalPriceInCents(input.deluxePriceInCents, "deluxePriceInCents"),
    validateOptionalPriceInCents(input.bundlePriceInCents, "bundlePriceInCents")
  ]) {
    if (!check.ok) throw new Error(check.message);
  }
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
  const nextFrontendSyncTargets = input.frontendSyncTargets
    ? [...new Set([...draft.frontendSyncTargets, ...input.frontendSyncTargets])]
    : draft.frontendSyncTargets;

  if ("priceInCents" in input || "pricingTier" in input || "giftingEnabled" in input) {
    const nextPrice = "priceInCents" in input ? input.priceInCents ?? undefined : draft.priceInCents;
    const nextTier =
      "pricingTier" in input
        ? input.pricingTier ?? undefined
        : draft.pricingTier ?? normalizePricingTier(draft.releaseType) ?? undefined;
    const nextGifting = "giftingEnabled" in input ? Boolean(input.giftingEnabled) : Boolean(draft.giftingEnabled);
    const commerceCheck = validateDraftCommerceFields({
      priceInCents: nextPrice,
      pricingTier: nextTier,
      releaseType: draft.releaseType,
      giftingEnabled: nextGifting
    });
    if (!commerceCheck.ok) {
      throw new Error(commerceCheck.message);
    }
    draft.priceInCents = nextPrice;
    draft.pricingTier = nextTier;
    draft.giftingEnabled = nextGifting;
    void persistDraftCommerceColumns(draft);
  }

  Object.assign(draft, {
    ...input,
    ...(input.pricingTier === undefined && input.priceInCents !== undefined ? { pricingTier: effectiveTier } : {}),
    ...(input.title ? { slug: generatedSlug } : {}),
    ...(requestedSlug ? { slug: reserveStableSlug({ desired: requestedSlug, ownerId: draft.id }), customSlug: true } : {}),
    ...(nextReferences ? { famousArtistReferences: nextReferences } : {}),
    ...(input.tags ? { tags: input.tags.map((tag) => createOrUpdateTag({ label: tag, scopes: ["release"] }).slug) } : {}),
    frontendSyncTargets: nextFrontendSyncTargets,
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
  void persistReleaseCreditMetadata(draft.id, {
    producer: draft.producer,
    mixingEngineer: draft.mixingEngineer,
    masteringEngineer: draft.masteringEngineer,
    recordLabel: draft.recordLabel,
    writtenBy: draft.writtenBy
  });
  draft.readinessState = getReadinessSummary(draft.id).ready ? "ready_for_review" : draft.readinessState;
  draft.saveState = "saved";
  refreshLifecycleFields(draft);
  emitAfterSuccessfulAction({
    type: "release.updated",
    entityId: draft.id,
    data: {
      releaseId: draft.id,
      title: draft.title,
      durable: false,
      updates: input
    }
  });
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
      | "audioFile"
      | "credits"
      | "explicit"
      | "lyricsLanguage"
      | "isLiveVersion"
      | "compositionType"
      | "manualIsrc"
      | "generatedIsrc"
      | "partnerPlatformIds"
      | "producerNames"
      | "previewAudioFile"
      | "fullAudioFile"
      | "audioState"
      | "lyricsState"
      | "coverArtType"
      | "csCover"
      | "csCoverType"
      | "csAudio"
    >
  >
) {
  const draft = getDraftOrThrow(releaseId);
  normalizeTrackArrayForRelease(draft);
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
  emitAfterSuccessfulAction({
    type: "release.updated",
    entityId: releaseId,
    data: {
      releaseId,
      trackId: track.id,
      durable: false,
      updates: input
    }
  });
  persistReleaseTracklistSyncEvent(draft, { trackUpdated: true, trackId: track.id, ...input });
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

function isFrontendImportedRelease(draft: Pick<ReleaseManagementDraft, "tags" | "status">) {
  return draft.tags.some((tag) => tag === "frontend-import" || tag === "supabase-catalog");
}

function importedReleaseHasCatalogMedia(draft: ReleaseManagementDraft) {
  const hasCover = draft.coverArtState === "uploaded" || draft.coverArtState === "approved" || Boolean(draft.coverArtPath);
  const hasAudio = draft.tracks.some((track) => track.audioState === "uploaded" || track.audioState === "approved");
  return hasCover && hasAudio;
}

const trackWritingRoles = new Set(["songwriter", "composer", "lyricist", "music", "lyrics", "both"]);
const trackProductionRoles = new Set(["producer", "co_producer", "executive_producer"]);

function trackAudioReady(track: ReleaseManagementTrack) {
  return track.audioState === "uploaded" || track.audioState === "approved";
}

function coverArtReady(draft: ReleaseManagementDraft) {
  return draft.coverArtState === "uploaded" || draft.coverArtState === "approved" || Boolean(draft.coverArtPath?.trim());
}

function releaseDateReady(draft: ReleaseManagementDraft) {
  return Boolean(draft.originalReleaseDate?.trim() || draft.scheduledPublishAt?.trim());
}

function trackHasProducer(track: ReleaseManagementTrack) {
  if (track.producerNames.some((name) => name.trim())) return true;
  return listTrackContributions(track.id).some((row) => trackProductionRoles.has(row.contributionType));
}

function trackHasWrittenBy(track: ReleaseManagementTrack) {
  if (track.credits?.trim()) return true;
  return listTrackContributions(track.id).some((row) => trackWritingRoles.has(row.contributionType));
}

function trackIsPublishComplete(track: ReleaseManagementTrack, importedPublished: boolean) {
  if (!track.title.trim()) return false;
  if (!trackAudioReady(track)) return false;
  if (importedPublished) return true;
  return trackHasProducer(track) && trackHasWrittenBy(track);
}

function tracksNumberedInOrder(tracks: ReleaseManagementTrack[]) {
  if (!tracks.length) return false;
  return tracks.every((track, index) => track.position === index + 1);
}

function trackCountRule(releaseType: ReleaseType, count: number) {
  if (releaseType === "single" || releaseType === "feature") {
    return { passed: count === 1, message: "Single requires exactly 1 track with uploaded audio" };
  }
  if (releaseType === "ep") {
    return {
      passed: count >= 2 && count <= 6,
      message: "EP requires 2–6 tracks, each with uploaded audio"
    };
  }
  if (releaseType === "album" || releaseType === "deluxe") {
    return {
      passed: count >= 7,
      message: releaseType === "deluxe"
        ? "Deluxe album requires at least 7 tracks, each with uploaded audio"
        : "Album requires at least 7 tracks, each with uploaded audio"
    };
  }
  return { passed: count >= 1, message: "Release requires at least 1 track with uploaded audio" };
}

export function validateReleaseStructure(draft: ReleaseManagementDraft): ReadinessCheck[] {
  const normalizedTracks = normalizeTrackArrayForRelease(draft);
  const importedPublished = isFrontendImportedRelease(draft) && importedReleaseHasCatalogMedia(draft);
  const trackCountRuleResult = trackCountRule(draft.releaseType, normalizedTracks.length);
  const allTracksHaveAudio =
    importedPublished || (normalizedTracks.length > 0 && normalizedTracks.every((track) => trackAudioReady(track)));
  const incompleteTracks = importedPublished
    ? normalizedTracks.filter((track) => !track.title.trim())
    : normalizedTracks.filter((track) => !trackIsPublishComplete(track, false));
  const metadataFields = [
    Boolean(draft.title?.trim()),
    releaseDateReady(draft),
    Boolean(draft.producer?.trim()),
    Boolean(draft.recordLabel?.trim()),
    Boolean(draft.mixingEngineer?.trim())
  ];
  const metadataPassed = metadataFields.every(Boolean);

  return [
    {
      key: "track_count",
      passed: trackCountRuleResult.passed && allTracksHaveAudio,
      message: trackCountRuleResult.passed
        ? allTracksHaveAudio
          ? trackCountRuleResult.message
          : "Every track needs uploaded audio before publish"
        : trackCountRuleResult.message
    },
    {
      key: "metadata",
      passed: metadataPassed,
      message: "Required: title, release date, producer, record label, and mixing engineer"
    },
    {
      key: "cover_art",
      passed: importedPublished || coverArtReady(draft),
      message: "Cover art (cover_art_url) is required before publish"
    },
    {
      key: "audio",
      passed: allTracksHaveAudio,
      message: "Every track needs uploaded audio"
    },
    {
      key: "track_credits",
      passed: incompleteTracks.length === 0,
      message:
        incompleteTracks.length === 0
          ? "Every track has title, audio, producer, and written-by credits"
          : "Each track must be complete: title, audio, producer, and written by (no half-filled tracks)"
    },
    {
      key: "track_sequence",
      passed: tracksNumberedInOrder(normalizedTracks),
      message: "Track numbers must run 1…n with no gaps"
    },
    {
      key: "pricing",
      passed: (() => {
        if (draft.giftingEnabled && draft.priceInCents == null) return false;
        if (draft.priceInCents != null) {
          return validateDraftCommerceFields(draft).ok;
        }
        return true;
      })(),
      message:
        draft.giftingEnabled && draft.priceInCents == null
          ? "Gifting requires a valid storefront price"
          : draft.priceInCents != null
            ? "Price must match the selected tier band"
            : "Storefront price is optional"
    },
    {
      key: "storefront_sync",
      passed: draft.priceInCents == null || isStorefrontSyncPushReady(),
      message:
        "Paid releases require STOREFRONT_SYNC_URL and ADMIN_SEED_SECRET so the storefront catalog can sync"
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
  emitAfterSuccessfulAction({
    type: "release_deleted",
    entityId: releaseId,
    data: {
      releaseId,
      archivedAt: draft.archivedAt,
      durable: false
    }
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

export async function scheduleReleaseDraft(releaseId: string, parts: ScheduleParts) {
  await ensureDraftHydratedFromCatalog(releaseId);
  const draft = getDraftOrThrow(releaseId);
  const readiness = getReadinessSummary(releaseId);
  const importedWithMedia =
    draft.tags.some((tag) => tag === "frontend-import" || tag === "supabase-catalog") &&
    Boolean(draft.coverArtPath || draft.coverArtState === "uploaded" || draft.coverArtState === "approved") &&
    draft.tracks.some((track) => track.audioState === "uploaded" || track.audioState === "approved");
  if (!readiness.ready && !importedWithMedia) {
    throw new Error("Release is not ready to schedule — complete metadata, cover, and audio first");
  }

  const schedule = buildSchedulePayload(parts);
  const before = {
    status: draft.status,
    scheduledPublishAt: draft.scheduledPublishAt,
    timezone: draft.timezone
  };

  draft.scheduledPublishAt = schedule.scheduledPublishAt;
  draft.originalReleaseDate = schedule.releaseDate;
  draft.timezone = schedule.publishTimezone;
  draft.status = "scheduled";
  draft.visibilityState = "scheduled";
  draft.readinessState = "ready_for_review";
  draft.updatedAt = nowIso();
  draft.saveState = "syncing";
  refreshLifecycleFields(draft);

  const persisted = await persistReleaseSchedule(releaseId, {
    scheduledPublishAt: schedule.scheduledPublishAt,
    releaseDate: schedule.releaseDate,
    releaseTime: schedule.releaseTime,
    publishTimezone: schedule.publishTimezone,
    status: "scheduled"
  });

  draft.saveState = persisted.persisted ? "synced" : "failed";
  recordReleaseRevision({
    releaseId,
    kind: "status_change",
    label: "Global drop scheduled",
    before,
    after: {
      status: draft.status,
      scheduledPublishAt: draft.scheduledPublishAt,
      timezone: draft.timezone,
      releaseDate: schedule.releaseDate
    }
  });
  recordReleaseActivity({
    releaseId,
    kind: "processing",
    message: `Scheduled for ${schedule.releaseDate} (${schedule.publishTimezone})`
  });
  emitAfterSuccessfulAction({
    type: "release.updated",
    entityId: releaseId,
    data: {
      releaseId,
      status: "scheduled",
      scheduledPublishAt: schedule.scheduledPublishAt,
      publishTimezone: schedule.publishTimezone,
      durable: persisted.persisted
    }
  });
  if (!persisted.persisted) {
    throw new Error(persisted.error ?? "Could not persist schedule to database");
  }
  return {
    releaseId,
    status: draft.status,
    scheduledPublishAt: schedule.scheduledPublishAt,
    releaseDate: schedule.releaseDate,
    releaseTime: schedule.releaseTime,
    publishTimezone: schedule.publishTimezone
  };
}

export async function unpublishReleaseDraft(releaseId: string) {
  const draft = getDraftOrThrow(releaseId);
  if (draft.status !== "published" && draft.status !== "scheduled") {
    throw new Error("Only published or scheduled releases can be unpublished");
  }
  const before = { status: draft.status, visibilityState: draft.visibilityState, scheduledPublishAt: draft.scheduledPublishAt };
  draft.status = "draft";
  draft.visibilityState = "private";
  draft.scheduledPublishAt = undefined;
  draft.updatedAt = nowIso();
  draft.saveState = "synced";
  refreshLifecycleFields(draft);
  const persisted = await persistReleaseUnpublish(releaseId);
  if (!persisted.persisted) {
    throw new Error(persisted.error ?? "Could not unpublish release in database");
  }
  recordReleaseRevision({
    releaseId,
    kind: "status_change",
    label: "Release unpublished (removed from public surfaces)",
    before,
    after: { status: draft.status, visibilityState: draft.visibilityState, scheduledPublishAt: draft.scheduledPublishAt }
  });
  recordReleaseActivity({ releaseId, kind: "status_change", message: "Release unpublished and set to private draft" });
  emitAfterSuccessfulAction({
    type: "release.updated",
    entityId: releaseId,
    data: { releaseId, status: draft.status, visibilityState: draft.visibilityState, durable: true }
  });
  return draft;
}

export function duplicateReleaseDraft(releaseId: string) {
  const source = getDraftOrThrow(releaseId);
  const id = nextId("rel_draft");
  const timestamp = nowIso();
  const title = `${source.title} (Copy)`;
  const slug = nextReleaseSlug(title, id);
  const tracks = source.tracks.map((track, index) => ({
    ...track,
    id: nextId("trk_draft"),
    releaseId: id,
    position: index + 1
  }));

  const draft: ReleaseManagementDraft = {
    ...source,
    id,
    slug,
    customSlug: false,
    title,
    status: "metadata_incomplete",
    visibilityState: "draft",
    readinessState: "metadata_incomplete",
    archivedAt: undefined,
    archiveReason: undefined,
    deletedAt: undefined,
    recoveryAvailableUntil: undefined,
    scheduledPublishAt: undefined,
    tracks,
    tags: [...new Set([...source.tags, "duplicate"])],
    continueCard: {
      releaseId: id,
      title,
      href: `/releases/${id}`,
      nextAction: "Review duplicated release",
      percentComplete: 0,
      lastModifiedAt: timestamp,
      recoveryState: "active"
    },
    previewLinks: buildFrontendPreviewLinks({ releaseId: id, slug }),
    saveState: "saved",
    createdAt: timestamp,
    updatedAt: timestamp,
    internalUpc: `2MRRW-${Date.now()}`
  };

  normalizeTrackArrayForRelease(draft);
  refreshLifecycleFields(draft);
  drafts.set(id, draft);
  recordReleaseRevision({
    releaseId: id,
    kind: "release_revision",
    label: `Duplicated from ${source.title}`,
    after: { sourceReleaseId: releaseId, title: draft.title, slug: draft.slug }
  });
  recordReleaseActivity({ releaseId: id, kind: "metadata_edit", message: `Duplicated from release ${source.title}` });
  emitAfterSuccessfulAction({
    type: "release.created",
    entityId: id,
    data: { releaseId: id, sourceReleaseId: releaseId, slug: draft.slug, durable: false }
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
