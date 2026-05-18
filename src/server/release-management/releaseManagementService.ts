import { artists } from "@/server/data/seedData";
import {
  compositionTypes,
  contributionTypes,
  coverArtPolicy,
  lyricReadinessStates,
  releaseTypes,
  type CompositionType,
  type ContributionType,
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
  artistId: string;
  artistName: string;
  title: string;
  releaseType: ReleaseType;
  status: ReleaseManagementStatus;
  readinessState: "metadata_incomplete" | "assets_pending" | "rights_pending" | "ready_for_review";
  language: string;
  recordLabel?: string;
  copyrightOwner?: string;
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
  coverArtState: UploadReadinessState;
  audioAssetsState: UploadReadinessState;
  lyricsState: LyricReadinessState;
  tracks: ReleaseManagementTrack[];
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

  if ((releaseType === "album" || releaseType === "ep") && trackCount < 2) {
    throw new Error("Albums and EPs must contain at least 2 tracks");
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

export function createReleaseDraft(input: {
  releaseType: ReleaseType;
  title?: string;
  artistName?: string;
  trackCount?: number;
}) {
  assertReleaseType(input.releaseType);
  const trackCount = input.trackCount ?? (input.releaseType === "single" ? 1 : 2);
  assertTrackCount(input.releaseType, trackCount);

  const title = input.title?.trim() || (input.releaseType === "single" ? "Untitled Single" : "Untitled Release");
  const id = nextId("rel_draft");
  const timestamp = nowIso();
  const artist = artists[0];
  const draft: ReleaseManagementDraft = {
    id,
    slug: `${slugify(title) || "untitled"}-${id.slice(-4)}`,
    artistId: artist?.id ?? "artist_2mrrw",
    artistName: input.artistName?.trim() || artist?.name || "2MRRW",
    title,
    releaseType: input.releaseType,
    status: "metadata_incomplete",
    readinessState: "metadata_incomplete",
    language: "en",
    internalUpc: `2MRRW-${Date.now()}`,
    moodStyles: [],
    famousArtistReferences: [],
    coverArtState: "missing",
    audioAssetsState: "missing",
    lyricsState: "not_required",
    tracks: Array.from({ length: trackCount }, (_, index) => makeTrack(id, index + 1)),
    createdAt: timestamp,
    updatedAt: timestamp
  };

  drafts.set(id, draft);
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
    >
  > & {
    moodStyles?: string[];
    famousArtistReferences?: string[];
    coverArtState?: UploadReadinessState;
    audioAssetsState?: UploadReadinessState;
    lyricsState?: LyricReadinessState;
  }
) {
  const draft = getDraftOrThrow(id);
  const nextReferences = input.famousArtistReferences?.filter(Boolean).slice(0, 3);
  Object.assign(draft, {
    ...input,
    ...(input.title ? { slug: `${slugify(input.title)}-${draft.id.slice(-4)}` } : {}),
    ...(nextReferences ? { famousArtistReferences: nextReferences } : {}),
    updatedAt: nowIso()
  });
  draft.readinessState = getReadinessSummary(draft.id).ready ? "ready_for_review" : draft.readinessState;
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
  const track = draft.tracks.find((item) => item.id === trackId);
  if (!track) {
    throw new Error("Track not found");
  }

  if (input.compositionType && !compositionTypes.includes(input.compositionType)) {
    throw new Error("Unsupported composition type");
  }

  Object.assign(track, input);
  draft.audioAssetsState = draft.tracks.every((item) => item.audioState === "approved" || item.audioState === "uploaded")
    ? "uploaded"
    : draft.tracks.some((item) => item.audioState !== "missing")
      ? "partial"
      : "missing";
  draft.updatedAt = nowIso();
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
  return row;
}

export function listTrackContributions(trackId: string) {
  return contributions.get(trackId) ?? [];
}

export function validateTrackSplits(trackId: string) {
  const counted = listTrackContributions(trackId).filter((row) => row.contributionType !== "producer");
  const total = counted.reduce((sum, row) => sum + row.ownershipSplit, 0);
  return {
    passed: Math.abs(total - 100) < 0.001,
    total,
    message: total === 100 ? "Songwriter splits total exactly 100%" : `Songwriter splits total ${total}%`
  };
}

export function validateReleaseStructure(draft: ReleaseManagementDraft): ReadinessCheck[] {
  return [
    {
      key: "track_count",
      passed: draft.releaseType === "single" ? draft.tracks.length === 1 : draft.tracks.length >= 2,
      message: draft.releaseType === "single" ? "Single has exactly 1 track" : "Album/EP has at least 2 tracks"
    },
    {
      key: "metadata",
      passed: Boolean(draft.title && draft.language && draft.copyrightOwner && draft.primaryGenre),
      message: "Title, language, copyright owner, and primary genre are required"
    },
    {
      key: "cover_art",
      passed: draft.coverArtState === "uploaded" || draft.coverArtState === "approved",
      message: `Cover art accepts ${coverArtPolicy.allowedExtensions.join(", ")} with ${coverArtPolicy.targetSizeMb.min}-${coverArtPolicy.targetSizeMb.max}MB target metadata`
    },
    {
      key: "audio",
      passed: draft.tracks.every((track) => track.audioState === "uploaded" || track.audioState === "approved"),
      message: "Every track needs an uploaded or approved audio asset"
    },
    {
      key: "track_information",
      passed: draft.tracks.every((track) => Boolean(track.title && track.compositionType)),
      message: "Every track needs title and composition metadata"
    },
    {
      key: "splits",
      passed: draft.tracks.every((track) => validateTrackSplits(track.id).passed),
      message: "Every track needs non-producer songwriter splits totaling exactly 100%"
    }
  ];
}

export function getReadinessSummary(releaseId: string) {
  const draft = getDraftOrThrow(releaseId);
  const checks = validateReleaseStructure(draft);
  const ready = checks.every((check) => check.passed);
  return {
    releaseId,
    ready,
    status: ready ? "ready_for_review" : draft.status,
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
    addNewRelease: releaseTypes,
    incompleteReleases: rows.filter((draft) => !getReadinessSummary(draft.id).ready),
    allReleases: rows
  };
}

createReleaseDraft({ releaseType: "single", title: "Tomorrow Control Draft", trackCount: 1 });
