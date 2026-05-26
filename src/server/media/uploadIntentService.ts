import { getServerSupabase } from "@/server/supabase/client";
import {
  R2_BUCKET,
  R2_PREFIX,
  buildR2Key,
  createR2SignedPutUrl,
  r2MockSignedUrl
} from "@/lib/storage/r2";
import { emitAfterSuccessfulAction } from "@/server/events/eventedWriteService";
import {
  resolveContentDestinations,
  type FrontendDestination,
  type MediaDestination,
  type RoutedMediaType
} from "@/services/sync/contentRouting";
import {
  canonicalAudioFormatForExtension,
  isPermissiveAudioMimeType,
  isSupportedAudioExtension,
  isSupportedAudioMimeType,
  permissiveAudioMimeTypes,
  professionalAudioExtensions,
  professionalAudioMimeTypes,
  professionalAudioQualityTarget,
  validateAudioUploadMetadata,
  type AudioAssetRole,
  type AudioPreviewGenerationState,
  type AudioUploadMetadata
} from "@/services/media/audioSupport";
import {
  coverArtExtensions,
  coverArtMimeTypes,
  coverArtTypeForPath,
  coverMaxSizeMbForExtension,
  isCoverVideoPath
} from "@/lib/media/coverArt";
import {
  persistReleaseCoverArtColumns,
  persistTrackMediaColumns
} from "@/server/release-management/coverArtPersistenceService";
import {
  getReleaseDraft,
  updateReleaseMetadata,
  updateTrackInformation
} from "@/server/release-management/releaseManagementService";
import {
  buildStructuredStoragePlan,
  buildMediaIntelligenceProfile,
  createCreatorNotification,
  enqueueMediaOptimizationJobs,
  markUploadQueueItem,
  queueCacheInvalidation,
  queueUpload,
  recordMediaDependency,
  recordReleaseActivity,
  type MediaOptimizationJob
} from "@/server/release-management/releaseLifecycleService";

export const mediaUploadCategories = [
  "release_cover",
  "track_audio",
  "hero_media",
  "vault_media",
  "audio_visual",
  "collectible_media",
  "merch_media",
  "latest_singles",
  "albums",
  "features",
  "preview_snippets",
  "full_song_files",
  "single_cover_art",
  "album_cover_art",
  "audio_preview",
  "audio_full_song",
  "lyrics",
  "signal_asset",
  "radio_asset",
  "collector_card_asset",
  "vault_asset",
  "cs_cover",
  "cs_audio"
] as const;
export type MediaUploadCategory = (typeof mediaUploadCategories)[number];

export const releaseUploadAssetTypes = ["master_audio", "preview_audio", "artwork", "loop_video", "lyrics"] as const;
export type ReleaseUploadAssetType = (typeof releaseUploadAssetTypes)[number];

type UploadPolicy = {
  bucket: string;
  folder: "singles" | "albums" | "masters" | "previews" | "lyrics" | "signal" | "radio" | "collectors" | "vault" | "features" | "merch";
  maxSizeMb: number;
  mimeTypes: readonly string[];
  extensions: readonly string[];
  ownerField: "releaseId" | "trackId" | "signalId" | "radioId" | "collectorId" | "vaultContentId";
  requiresRelease?: boolean;
  requiresTrack?: boolean;
  audioQualityTarget?: typeof professionalAudioQualityTarget;
  artworkQualityTarget?: {
    minimumDimensions: { width: 1400; height: 1400 };
    recommendedDimensions: { width: 3000; height: 3000 };
    aspectRatio: "1:1";
    validation: "metadata_required";
    helperText: "Upload square cover artwork. Minimum size: 1400x1400. Recommended size: 3000x3000.";
  };
};

type MediaUploadOwnerInput = {
  releaseId?: string;
  trackId?: string;
  signalId?: string;
  radioId?: string;
  collectorId?: string;
  vaultContentId?: string;
};

export type MediaUploadIntentInput = {
  category?: MediaUploadCategory;
  assetType?: ReleaseUploadAssetType;
  destination?: MediaDestination | FrontendDestination | Array<MediaDestination | FrontendDestination>;
  mediaType?: RoutedMediaType;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  audioMetadata?: AudioUploadMetadata;
} & MediaUploadOwnerInput;

export type MediaUploadIntent = {
  ok: true;
  bucket: string;
  path: string;
  category: MediaUploadCategory;
  uploadMethod: "direct-to-storage";
  signedUploadUrl: string;
  token?: string;
  maxSizeBytes: number;
  acceptedMimeTypes: readonly string[];
  acceptedExtensions: readonly string[];
  audioQualityTarget?: UploadPolicy["audioQualityTarget"];
  artworkQualityTarget?: UploadPolicy["artworkQualityTarget"];
  storagePlan: ReturnType<typeof buildStructuredStoragePlan>;
  destination?: MediaUploadIntentInput["destination"];
  mediaType: RoutedMediaType;
  frontendDestinations: FrontendDestination[];
  expiresIn: number;
  mocked: boolean;
};

export type ManagedMediaAssetRecord = {
  id: string;
  bucket: string;
  path: string;
  category: MediaUploadCategory;
  ownerId: string;
  ownerType: "release" | "track" | "signal" | "radio" | "collector" | "vault_content";
  releaseId?: string;
  trackId?: string;
  destination?: MediaUploadIntentInput["destination"];
  mediaType: RoutedMediaType;
  frontendDestinations: FrontendDestination[];
  access: "public" | "entitled" | "admin";
  status: "uploaded" | "processing" | "optimized" | "synced" | "published" | "archived" | "failed" | "retry_available";
  processingJobs: MediaOptimizationJob[];
  audioAssetRole?: AudioAssetRole;
  audioMetadata?: AudioUploadMetadata;
  previewGeneration?: {
    state: AudioPreviewGenerationState;
    sourcePath: string;
    optimizedPreviewPath?: string;
    waveformPath?: string;
    worker: "pending_transcoder_worker" | "uploaded_preview_asset" | "not_audio";
  };
  transcodingCompatibility?: {
    originalMasterPreserved: boolean;
    destructiveCompression: false;
    supportedPreviewFormats: readonly ["aac", "mp3"];
    supportedBitDepths: typeof professionalAudioQualityTarget.supportedBitDepths;
    supportedSampleRatesHz: typeof professionalAudioQualityTarget.supportedSampleRatesHz;
  };
  playbackHandling?: {
    masterDelivery: "signed_url_lazy_load";
    previewDelivery: "streaming_preview_preferred";
    frontendPerformance: "do_not_inline_master";
  };
  audioRelationships?: {
    previewAudio: boolean;
    fullAudio: boolean;
    subscriberOnlyAudio: boolean;
    collectorCardAudio: boolean;
    purchasedTrackAudio: boolean;
  };
  storagePlan: ReturnType<typeof buildStructuredStoragePlan>;
  mediaIntelligence: ReturnType<typeof buildMediaIntelligenceProfile>;
  retryOfAssetId?: string;
  updatedAt: string;
};

const MB = 1024 * 1024;
const imageMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp"] as const;
const mp4MimeTypes = ["video/mp4"] as const;
const coverMimeTypes = coverArtMimeTypes;
const coverExtensions = coverArtExtensions;
const videoMimeTypes = ["video/mp4", "video/quicktime", "video/webm"] as const;
const audioMimeTypes = [...professionalAudioMimeTypes, ...permissiveAudioMimeTypes] as const;
const audioExtensions = professionalAudioExtensions;
const docMimeTypes = ["text/plain", "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"] as const;
const docExtensions = ["txt", "pdf", "docx"] as const;
const coverArtworkTarget = {
  minimumDimensions: { width: 1400, height: 1400 },
  recommendedDimensions: { width: 3000, height: 3000 },
  aspectRatio: "1:1",
  validation: "metadata_required",
  helperText: "Upload square cover artwork. Minimum size: 1400x1400. Recommended size: 3000x3000."
} as const;

function defaultDestinationFor(category: MediaUploadCategory): MediaDestination {
  if (category === "hero_media" || category === "signal_asset") return "hero";
  if (category === "vault_media" || category === "vault_asset") return "vault";
  if (category === "audio_visual" || category === "radio_asset" || category === "collector_card_asset") return "audio_visuals";
  if (category === "audio_preview" || category === "preview_snippets") return "preview_snippets";
  if (category === "audio_full_song" || category === "full_song_files") return "full_song_files";
  if (category === "track_audio") return "audio_files";
  return "release_media";
}

function releaseCategoryForUpload(category: MediaUploadCategory) {
  if (category === "single_cover_art" || category === "latest_singles") return "single" as const;
  if (category === "album_cover_art" || category === "albums") return "album" as const;
  if (category === "features") return "feature" as const;
  return undefined;
}

function releaseCategoryForDraft(draft: ReturnType<typeof getReleaseDraft>) {
  if (!draft) return undefined;
  if (draft.releaseType === "single") return "single" as const;
  if (draft.releaseType === "album" || draft.releaseType === "ep" || draft.releaseType === "deluxe" || draft.releaseType === "remix_pack") return "album" as const;
  return undefined;
}

function mediaTypeForUpload(category: MediaUploadCategory, mimeType?: string): RoutedMediaType {
  if (category === "audio_full_song" || category === "audio_preview" || category === "track_audio" || category === "preview_snippets" || category === "full_song_files") return "audio";
  if (category === "lyrics") return "document";
  if (mimeType?.startsWith("video/")) return "video";
  if (mimeType?.startsWith("audio/")) return "audio";
  if (mimeType?.startsWith("image/")) return "image";
  return "document";
}

function isAudioUploadCategory(category: MediaUploadCategory) {
  return category === "audio_full_song" || category === "audio_preview" || category === "track_audio" || category === "preview_snippets" || category === "full_song_files" || category === "cs_audio";
}

function isCsCoverUploadCategory(category: MediaUploadCategory) {
  return category === "cs_cover";
}

function audioAssetRoleFor(category: MediaUploadCategory): AudioAssetRole | undefined {
  if (category === "audio_full_song" || category === "track_audio" || category === "full_song_files") return "master_audio";
  if (category === "audio_preview" || category === "preview_snippets") return "preview_audio";
  return undefined;
}

function buildAudioMetadata(extension: string, metadata?: AudioUploadMetadata): AudioUploadMetadata | undefined {
  const format = metadata?.format ?? canonicalAudioFormatForExtension(extension);
  if (!format && !metadata) return undefined;
  return {
    ...metadata,
    format
  };
}

function buildPreviewGeneration(input: { role?: AudioAssetRole; sourcePath: string; storagePlan: ReturnType<typeof buildStructuredStoragePlan> }) {
  if (!input.role) return undefined;
  const previewVariant = input.storagePlan.variants.find((variant) => variant.label === "preview")?.path;
  const waveformVariant = input.storagePlan.variants.find((variant) => variant.label === "waveform")?.path;
  if (input.role === "preview_audio") {
    return {
      state: "ready" as const,
      sourcePath: input.sourcePath,
      optimizedPreviewPath: input.sourcePath,
      waveformPath: waveformVariant,
      worker: "uploaded_preview_asset" as const
    };
  }
  return {
    state: "pending" as const,
    sourcePath: input.sourcePath,
    optimizedPreviewPath: previewVariant,
    waveformPath: waveformVariant,
    worker: "pending_transcoder_worker" as const
  };
}

function buildAudioTranscodingCompatibility(role?: AudioAssetRole) {
  if (!role) return undefined;
  return {
    originalMasterPreserved: role === "master_audio",
    destructiveCompression: false as const,
    supportedPreviewFormats: ["aac", "mp3"] as const,
    supportedBitDepths: professionalAudioQualityTarget.supportedBitDepths,
    supportedSampleRatesHz: professionalAudioQualityTarget.supportedSampleRatesHz
  };
}

function buildAudioPlaybackHandling(role?: AudioAssetRole) {
  if (!role) return undefined;
  return {
    masterDelivery: "signed_url_lazy_load" as const,
    previewDelivery: "streaming_preview_preferred" as const,
    frontendPerformance: "do_not_inline_master" as const
  };
}

function buildAudioRelationships(role?: AudioAssetRole) {
  if (!role) return undefined;
  return {
    previewAudio: role === "preview_audio",
    fullAudio: role === "master_audio",
    subscriberOnlyAudio: role === "master_audio",
    collectorCardAudio: role === "master_audio",
    purchasedTrackAudio: role === "master_audio"
  };
}

function isMotionArtworkPath(path: string) {
  return isCoverVideoPath(path);
}

function coverArtworkMaxSizeMb(extension: string) {
  return isReleaseArtworkExtension(extension) ? coverMaxSizeMbForExtension(extension) : 70;
}

function isReleaseArtworkExtension(extension: string) {
  return coverExtensions.includes(extension as (typeof coverExtensions)[number]);
}

function isReleaseArtworkCategory(category: MediaUploadCategory) {
  return category === "single_cover_art" || category === "album_cover_art" || category === "release_cover" || category === "latest_singles" || category === "albums" || category === "features";
}

const UPLOAD_POLICIES: Record<MediaUploadCategory, UploadPolicy> = {
  release_cover: {
    bucket: R2_BUCKET || "2mrrw-media",
    folder: "singles",
    maxSizeMb: 70,
    mimeTypes: coverMimeTypes,
    extensions: coverExtensions,
    ownerField: "releaseId",
    requiresRelease: true,
    artworkQualityTarget: coverArtworkTarget
  },
  track_audio: {
    bucket: R2_BUCKET || "2mrrw-media",
    folder: "masters",
    maxSizeMb: 250,
    mimeTypes: audioMimeTypes,
    extensions: audioExtensions,
    ownerField: "trackId",
    requiresRelease: true,
    requiresTrack: true,
    audioQualityTarget: professionalAudioQualityTarget
  },
  hero_media: {
    bucket: R2_BUCKET || "2mrrw-media",
    folder: "signal",
    maxSizeMb: 500,
    mimeTypes: [...imageMimeTypes, ...videoMimeTypes, ...audioMimeTypes],
    extensions: [...imageExtensions, "mp4", "mov", "webm", ...audioExtensions],
    ownerField: "signalId"
  },
  vault_media: {
    bucket: R2_BUCKET || "2mrrw-media",
    folder: "vault",
    maxSizeMb: 500,
    mimeTypes: [...imageMimeTypes, ...videoMimeTypes, ...audioMimeTypes],
    extensions: [...imageExtensions, "mp4", "mov", "webm", ...audioExtensions],
    ownerField: "vaultContentId"
  },
  audio_visual: {
    bucket: R2_BUCKET || "2mrrw-media",
    folder: "radio",
    maxSizeMb: 500,
    mimeTypes: [...imageMimeTypes, ...videoMimeTypes, ...audioMimeTypes],
    extensions: [...imageExtensions, "mp4", "mov", "webm", ...audioExtensions],
    ownerField: "radioId"
  },
  collectible_media: {
    bucket: R2_BUCKET || "2mrrw-media",
    folder: "collectors",
    maxSizeMb: 500,
    mimeTypes: [...imageMimeTypes, ...videoMimeTypes, ...audioMimeTypes],
    extensions: [...imageExtensions, "mp4", "mov", "webm", ...audioExtensions],
    ownerField: "collectorId"
  },
  merch_media: {
    bucket: R2_BUCKET || "2mrrw-media",
    folder: "merch",
    maxSizeMb: 500,
    mimeTypes: [...imageMimeTypes, ...videoMimeTypes],
    extensions: [...imageExtensions, "mp4", "mov", "webm"],
    ownerField: "collectorId"
  },
  latest_singles: {
    bucket: R2_BUCKET || "2mrrw-media",
    folder: "singles",
    maxSizeMb: 500,
    mimeTypes: [...coverMimeTypes, ...audioMimeTypes],
    extensions: [...coverExtensions, ...audioExtensions],
    ownerField: "releaseId",
    requiresRelease: true
  },
  albums: {
    bucket: R2_BUCKET || "2mrrw-media",
    folder: "albums",
    maxSizeMb: 500,
    mimeTypes: [...coverMimeTypes, ...audioMimeTypes],
    extensions: [...coverExtensions, ...audioExtensions],
    ownerField: "releaseId",
    requiresRelease: true
  },
  features: {
    bucket: R2_BUCKET || "2mrrw-media",
    folder: "features",
    maxSizeMb: 500,
    mimeTypes: [...coverMimeTypes, ...audioMimeTypes],
    extensions: [...coverExtensions, ...audioExtensions],
    ownerField: "releaseId",
    requiresRelease: true
  },
  preview_snippets: {
    bucket: R2_BUCKET || "2mrrw-media",
    folder: "previews",
    maxSizeMb: 70,
    mimeTypes: audioMimeTypes,
    extensions: audioExtensions,
    ownerField: "trackId",
    requiresRelease: true,
    requiresTrack: true
  },
  full_song_files: {
    bucket: R2_BUCKET || "2mrrw-media",
    folder: "masters",
    maxSizeMb: 250,
    mimeTypes: audioMimeTypes,
    extensions: audioExtensions,
    ownerField: "trackId",
    requiresRelease: true,
    requiresTrack: true,
    audioQualityTarget: professionalAudioQualityTarget
  },
  single_cover_art: {
    bucket: R2_BUCKET || "2mrrw-media",
    folder: "singles",
    maxSizeMb: 70,
    mimeTypes: coverMimeTypes,
    extensions: coverExtensions,
    ownerField: "releaseId",
    requiresRelease: true,
    artworkQualityTarget: coverArtworkTarget
  },
  album_cover_art: {
    bucket: R2_BUCKET || "2mrrw-media",
    folder: "albums",
    maxSizeMb: 70,
    mimeTypes: coverMimeTypes,
    extensions: coverExtensions,
    ownerField: "releaseId",
    requiresRelease: true,
    artworkQualityTarget: coverArtworkTarget
  },
  audio_preview: {
    bucket: R2_BUCKET || "2mrrw-media",
    folder: "previews",
    maxSizeMb: 70,
    mimeTypes: audioMimeTypes,
    extensions: audioExtensions,
    ownerField: "trackId",
    requiresRelease: true,
    requiresTrack: true
  },
  audio_full_song: {
    bucket: R2_BUCKET || "2mrrw-media",
    folder: "masters",
    maxSizeMb: 250,
    mimeTypes: audioMimeTypes,
    extensions: audioExtensions,
    ownerField: "trackId",
    requiresRelease: true,
    requiresTrack: true,
    audioQualityTarget: professionalAudioQualityTarget
  },
  lyrics: {
    bucket: R2_BUCKET || "2mrrw-media",
    folder: "lyrics",
    maxSizeMb: 10,
    mimeTypes: docMimeTypes,
    extensions: docExtensions,
    ownerField: "trackId",
    requiresRelease: true,
    requiresTrack: true
  },
  signal_asset: {
    bucket: R2_BUCKET || "2mrrw-media",
    folder: "signal",
    maxSizeMb: 70,
    mimeTypes: [...imageMimeTypes, ...mp4MimeTypes, ...audioMimeTypes],
    extensions: [...imageExtensions, "mp4", ...audioExtensions],
    ownerField: "signalId"
  },
  radio_asset: {
    bucket: R2_BUCKET || "2mrrw-media",
    folder: "radio",
    maxSizeMb: 70,
    mimeTypes: [...imageMimeTypes, ...mp4MimeTypes, ...audioMimeTypes],
    extensions: [...imageExtensions, "mp4", ...audioExtensions],
    ownerField: "radioId"
  },
  collector_card_asset: {
    bucket: R2_BUCKET || "2mrrw-media",
    folder: "collectors",
    maxSizeMb: 70,
    mimeTypes: coverMimeTypes,
    extensions: coverExtensions,
    ownerField: "collectorId"
  },
  vault_asset: {
    bucket: R2_BUCKET || "2mrrw-media",
    folder: "vault",
    maxSizeMb: 70,
    mimeTypes: [...imageMimeTypes, ...mp4MimeTypes, ...audioMimeTypes, ...docMimeTypes],
    extensions: [...imageExtensions, "mp4", ...audioExtensions, ...docExtensions],
    ownerField: "vaultContentId"
  },
  cs_cover: {
    bucket: R2_BUCKET || "2mrrw-media",
    folder: "singles",
    maxSizeMb: 70,
    mimeTypes: coverMimeTypes,
    extensions: coverExtensions,
    ownerField: "trackId",
    requiresRelease: true,
    requiresTrack: true,
    artworkQualityTarget: coverArtworkTarget
  },
  cs_audio: {
    bucket: R2_BUCKET || "2mrrw-media",
    folder: "masters",
    maxSizeMb: 250,
    mimeTypes: audioMimeTypes,
    extensions: audioExtensions,
    ownerField: "trackId",
    requiresRelease: true,
    requiresTrack: true,
    audioQualityTarget: professionalAudioQualityTarget
  }
};

const legacyCategoryByAssetType: Record<ReleaseUploadAssetType, MediaUploadCategory> = {
  master_audio: "audio_full_song",
  preview_audio: "audio_preview",
  artwork: "single_cover_art",
  loop_video: "single_cover_art",
  lyrics: "lyrics"
};

const confirmedMediaAssets = new Map<string, ManagedMediaAssetRecord>();

function nowIso() {
  return new Date().toISOString();
}

function sanitizePathPart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

function extensionFor(fileName: string) {
  const match = /\.([a-z0-9]+)$/i.exec(fileName.trim());
  return match?.[1]?.toLowerCase() ?? "";
}

export function normalizeUploadCategory(input: Pick<MediaUploadIntentInput, "category" | "assetType">): MediaUploadCategory {
  if (input.category) return input.category;
  if (input.assetType) return legacyCategoryByAssetType[input.assetType];
  throw new Error("Upload category is required");
}

export function getMediaUploadPolicy(category: MediaUploadCategory) {
  return UPLOAD_POLICIES[category];
}

export function getReleaseUploadPolicy(assetType: ReleaseUploadAssetType) {
  return UPLOAD_POLICIES[legacyCategoryByAssetType[assetType]];
}

function ownerIdFor(input: MediaUploadOwnerInput, policy: UploadPolicy) {
  const ownerId = input[policy.ownerField];
  if (!ownerId) {
    throw new Error(`${policy.ownerField} is required for this upload category`);
  }
  return ownerId;
}

function validateReleaseContext(input: MediaUploadOwnerInput, policy: UploadPolicy) {
  if (!policy.requiresRelease) return { draft: null, track: null };
  if (!input.releaseId) throw new Error("releaseId is required for release uploads");

  const draft = getReleaseDraft(input.releaseId);
  if (!draft) throw new Error("Release draft not found");

  const track = input.trackId ? draft.tracks.find((item) => item.id === input.trackId) : null;
  if (policy.requiresTrack && !track) {
    throw new Error("Track context is required for this upload category");
  }

  return { draft, track };
}

function assertSafeStoragePath(path: string) {
  if (path.startsWith("/") || path.includes("..") || path.includes("\\") || path.includes("//")) {
    throw new Error("Invalid storage path");
  }
}

function assertCompletionPath(input: MediaUploadOwnerInput & { path: string }, category: MediaUploadCategory, policy: UploadPolicy, ownerId: string) {
  assertSafeStoragePath(input.path);
  const extension = extensionFor(input.path);
  if (!policy.extensions.includes(extension)) {
    throw new Error(`Unsupported completed file extension for ${category}`);
  }

  const releaseId = sanitizePathPart(input.releaseId ?? "release");
  const sanitizedOwnerId = sanitizePathPart(ownerId);
  const expectedPrefix =
    category === "cs_cover"
      ? `${policy.folder}/${releaseId}/${sanitizedOwnerId}/cs-cover/`
      : category === "cs_audio"
        ? `${policy.folder}/${releaseId}/${sanitizedOwnerId}/cs-audio/`
        : category === "audio_preview" || category === "audio_full_song" || category === "track_audio" || category === "preview_snippets" || category === "full_song_files" || category === "lyrics"
          ? `${policy.folder}/${releaseId}/${sanitizedOwnerId}/`
          : category === "single_cover_art" || category === "album_cover_art" || category === "release_cover"
            ? `${policy.folder}/${sanitizedOwnerId}/cover/`
            : `${policy.folder}/${sanitizedOwnerId}/`;

  if (!input.path.startsWith(expectedPrefix)) {
    throw new Error(`Completed upload path must start with ${expectedPrefix}`);
  }
}

export function validateMediaUploadIntent(input: MediaUploadIntentInput) {
  const category = normalizeUploadCategory(input);
  const policy = UPLOAD_POLICIES[category];
  const releaseContext = validateReleaseContext(input, policy);
  const ownerId = ownerIdFor(input, policy);
  const extension = extensionFor(input.fileName);

  if (!policy.extensions.includes(extension)) {
    throw new Error(`Unsupported file extension for ${category}`);
  }

  const normalizedMimeType = input.mimeType.toLowerCase();
  const isSupportedPolicyMime = policy.mimeTypes.includes(normalizedMimeType as (typeof policy.mimeTypes)[number]);
  const isPermissiveAudioFallback = isSupportedAudioExtension(extension) && isPermissiveAudioMimeType(normalizedMimeType) && policy.extensions.includes(extension);
  const isSupportedAudioMime = isSupportedAudioExtension(extension) && isSupportedAudioMimeType(normalizedMimeType) && policy.extensions.includes(extension);
  if (!isSupportedPolicyMime && !isPermissiveAudioFallback && !isSupportedAudioMime) {
    throw new Error(`Unsupported MIME type for ${category}`);
  }

  if (isAudioUploadCategory(category) || isSupportedAudioExtension(extension)) {
    validateAudioUploadMetadata(input.audioMetadata);
  }

  const maxSizeMb = isReleaseArtworkCategory(category) ? coverArtworkMaxSizeMb(extension) : policy.maxSizeMb;
  const maxSizeBytes = maxSizeMb * MB;
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0 || input.sizeBytes > maxSizeBytes) {
    throw new Error(`${category} uploads must be ${maxSizeMb}MB or smaller`);
  }

  return { category, policy, ownerId, extension, maxSizeBytes, ...releaseContext };
}

export function validateReleaseUploadIntent(input: MediaUploadIntentInput) {
  return validateMediaUploadIntent(input);
}

export function buildMediaUploadPath(input: MediaUploadIntentInput) {
  const { category, policy, ownerId, extension } = validateMediaUploadIntent(input);
  const storagePlan = buildStructuredStoragePlan({
    category,
    ownerId,
    releaseId: input.releaseId,
    fileName: input.fileName,
    folder: policy.folder
  });
  const stampedName = `${Date.now()}-${storagePlan.canonicalFileName.replace(/\.[a-z0-9]+$/i, "")}.${extension}`;

  if (category === "cs_cover") {
    return `${policy.folder}/${sanitizePathPart(input.releaseId ?? "release")}/${sanitizePathPart(ownerId)}/cs-cover/${stampedName}`;
  }

  if (category === "cs_audio") {
    return `${policy.folder}/${sanitizePathPart(input.releaseId ?? "release")}/${sanitizePathPart(ownerId)}/cs-audio/${stampedName}`;
  }

  if (category === "audio_preview" || category === "audio_full_song" || category === "track_audio" || category === "preview_snippets" || category === "full_song_files" || category === "lyrics") {
    return `${policy.folder}/${sanitizePathPart(input.releaseId ?? "release")}/${sanitizePathPart(ownerId)}/${stampedName}`;
  }

  if (category === "single_cover_art" || category === "album_cover_art" || category === "release_cover") {
    return `${policy.folder}/${sanitizePathPart(ownerId)}/cover/${stampedName}`;
  }

  return `${policy.folder}/${sanitizePathPart(ownerId)}/${stampedName}`;
}

export function buildReleaseUploadPath(input: MediaUploadIntentInput) {
  return buildMediaUploadPath(input);
}

export async function createMediaUploadIntent(input: MediaUploadIntentInput): Promise<MediaUploadIntent> {
  const { category, policy, maxSizeBytes, draft } = validateMediaUploadIntent(input);
  const path = buildMediaUploadPath(input);
  const ownerId = ownerIdFor(input, policy);
  const storagePlan = buildStructuredStoragePlan({
    category,
    ownerId,
    releaseId: input.releaseId,
    fileName: input.fileName,
    folder: policy.folder
  });
  const mediaType = input.mediaType ?? mediaTypeForUpload(category, input.mimeType);
  const routing = resolveContentDestinations({
    category: releaseCategoryForUpload(category) ?? releaseCategoryForDraft(draft),
    releaseType: draft?.releaseType,
    destination: input.destination ?? defaultDestinationFor(category),
    mediaType,
    relatedReleaseId: input.releaseId
  });
  const supabase = getServerSupabase();
  const queuedUpload = queueUpload({
    releaseId: input.releaseId,
    fileName: input.fileName
  });

  if (!supabase) {
    return {
      ok: true,
      bucket: policy.bucket,
      path,
      category,
      uploadMethod: "direct-to-storage",
      signedUploadUrl: r2MockSignedUrl(buildR2Key(R2_PREFIX.PROTECTED_MEDIA, path)),
      maxSizeBytes,
      acceptedMimeTypes: policy.mimeTypes,
      acceptedExtensions: policy.extensions,
      audioQualityTarget: policy.audioQualityTarget,
      artworkQualityTarget: policy.artworkQualityTarget,
      storagePlan: { ...storagePlan, canonicalPath: path },
      destination: routing.destination,
      mediaType,
      frontendDestinations: routing.frontendDestinations,
      expiresIn: 300,
      mocked: true
    };
  }

  const r2Key = buildR2Key(R2_PREFIX.PROTECTED_MEDIA, path);
  let signedUploadUrl: string;
  try {
    signedUploadUrl = await createR2SignedPutUrl(r2Key, input.mimeType, 300);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to create signed upload URL";
    markUploadQueueItem(queuedUpload.id, "retry_available", message);
    throw new Error(message);
  }

  return {
    ok: true,
    bucket: policy.bucket,
    path,
    category,
    uploadMethod: "direct-to-storage",
    signedUploadUrl,
    token: undefined,
    maxSizeBytes,
    acceptedMimeTypes: policy.mimeTypes,
    acceptedExtensions: policy.extensions,
    audioQualityTarget: policy.audioQualityTarget,
    artworkQualityTarget: policy.artworkQualityTarget,
    storagePlan: { ...storagePlan, canonicalPath: path },
    destination: routing.destination,
    mediaType,
    frontendDestinations: routing.frontendDestinations,
    expiresIn: 300,
    mocked: false
  };
}

export function createReleaseMediaUploadIntent(input: MediaUploadIntentInput) {
  return createMediaUploadIntent(input);
}

function ownerTypeFor(category: MediaUploadCategory): ManagedMediaAssetRecord["ownerType"] {
  if (category === "single_cover_art" || category === "album_cover_art" || category === "release_cover" || category === "latest_singles" || category === "albums" || category === "features") return "release";
  if (category === "audio_preview" || category === "audio_full_song" || category === "track_audio" || category === "preview_snippets" || category === "full_song_files" || category === "lyrics" || category === "cs_cover" || category === "cs_audio") return "track";
  if (category === "signal_asset" || category === "hero_media") return "signal";
  if (category === "radio_asset" || category === "audio_visual") return "radio";
  if (category === "collector_card_asset" || category === "collectible_media" || category === "merch_media") return "collector";
  return "vault_content";
}

function accessFor(category: MediaUploadCategory): ManagedMediaAssetRecord["access"] {
  if (category === "single_cover_art" || category === "album_cover_art" || category === "release_cover" || category === "audio_preview" || category === "preview_snippets" || category === "signal_asset" || category === "hero_media" || category === "radio_asset" || category === "audio_visual" || category === "latest_singles" || category === "albums" || category === "features") {
    return "public";
  }
  return "admin";
}

export function confirmMediaUpload(input: {
  category?: MediaUploadCategory;
  assetType?: ReleaseUploadAssetType;
  releaseId?: string;
  trackId?: string;
  signalId?: string;
  radioId?: string;
  collectorId?: string;
  vaultContentId?: string;
  destination?: MediaUploadIntentInput["destination"];
  mediaType?: RoutedMediaType;
  path: string;
  audioMetadata?: AudioUploadMetadata;
  retryOfAssetId?: string;
}) {
  const category = normalizeUploadCategory(input);
  const policy = UPLOAD_POLICIES[category];
  const releaseContext = validateReleaseContext(input, policy);
  const ownerId = ownerIdFor(input, policy);
  assertCompletionPath(input, category, policy, ownerId);
  const recordId = `asset_${sanitizePathPart(category)}_${sanitizePathPart(ownerId)}`;
  const existing = confirmedMediaAssets.get(recordId);
  if (existing && existing.path === input.path && !input.retryOfAssetId) {
    throw new Error("This media upload has already been confirmed");
  }
  const storagePlan = buildStructuredStoragePlan({
    category,
    ownerId,
    releaseId: input.releaseId,
    fileName: input.path.split("/").pop() ?? "media",
    folder: policy.folder
  });
  const processingJobs = enqueueMediaOptimizationJobs(
    recordId,
    category === "audio_full_song" || category === "audio_preview" || category === "track_audio" || category === "preview_snippets" || category === "full_song_files" || category === "cs_audio"
      ? ["waveform_preview", "optimized_preview", "compressed_delivery"]
      : category === "single_cover_art" || category === "album_cover_art" || category === "release_cover" || category === "cs_cover" || category === "latest_singles" || category === "albums" || category === "features" || category === "collector_card_asset" || category === "collectible_media" || category === "merch_media"
        ? ["thumbnail", "responsive_image", "image_optimization"]
        : category === "signal_asset" || category === "hero_media" || category === "radio_asset" || category === "audio_visual" || category === "vault_asset" || category === "vault_media"
          ? ["thumbnail", "optimized_preview"]
          : []
  );
  const mediaType = input.mediaType ?? mediaTypeForUpload(category);
  const extension = extensionFor(input.path);
  const audioAssetRole = audioAssetRoleFor(category);
  const audioMetadata = buildAudioMetadata(extension, input.audioMetadata);
  validateAudioUploadMetadata(audioMetadata);
  const routing = resolveContentDestinations({
    category: releaseCategoryForUpload(category) ?? releaseCategoryForDraft(releaseContext.draft),
    releaseType: releaseContext.draft?.releaseType,
    destination: input.destination ?? defaultDestinationFor(category),
    mediaType,
    relatedReleaseId: input.releaseId
  });
  const previewGeneration = buildPreviewGeneration({ role: audioAssetRole, sourcePath: input.path, storagePlan: { ...storagePlan, canonicalPath: input.path } });
  const record: ManagedMediaAssetRecord = {
    id: recordId,
    bucket: policy.bucket,
    path: input.path,
    category,
    ownerId,
    ownerType: ownerTypeFor(category),
    releaseId: input.releaseId,
    trackId: input.trackId,
    destination: routing.destination,
    mediaType,
    frontendDestinations: routing.frontendDestinations,
    access: accessFor(category),
    status: processingJobs.length ? "processing" : "uploaded",
    processingJobs,
    audioAssetRole,
    audioMetadata,
    previewGeneration,
    transcodingCompatibility: buildAudioTranscodingCompatibility(audioAssetRole),
    playbackHandling: buildAudioPlaybackHandling(audioAssetRole),
    audioRelationships: buildAudioRelationships(audioAssetRole),
    storagePlan: { ...storagePlan, canonicalPath: input.path },
    mediaIntelligence: buildMediaIntelligenceProfile({
      assetId: recordId,
      durationSeconds: audioMetadata?.durationSeconds
    }),
    retryOfAssetId: input.retryOfAssetId,
    updatedAt: nowIso()
  };
  confirmedMediaAssets.set(record.id, record);
  const mediaEventData = {
    url: record.path,
    type: category,
    assetId: record.id,
    ownerId,
    ownerType: record.ownerType,
    releaseId: input.releaseId,
    trackId: input.trackId,
    mediaType,
    destination: routing.destination,
    frontendDestinations: routing.frontendDestinations,
    audioAssetRole,
    audioMetadata,
    previewGeneration,
    transcodingCompatibility: buildAudioTranscodingCompatibility(audioAssetRole),
    playbackHandling: buildAudioPlaybackHandling(audioAssetRole),
    audioRelationships: buildAudioRelationships(audioAssetRole),
    slot: category === "audio_full_song" || category === "audio_preview" || category === "track_audio" || category === "preview_snippets" || category === "full_song_files" ? "track_audio" : category,
    durable: false
  };
  emitAfterSuccessfulAction({
    type: "media.uploaded",
    entityId: input.releaseId ?? input.trackId ?? ownerId,
    data: mediaEventData
  });
  if (input.retryOfAssetId || category === "audio_full_song" || category === "audio_preview") {
    emitAfterSuccessfulAction({
      type: "media.replaced",
      entityId: input.releaseId ?? input.trackId ?? ownerId,
      data: { ...mediaEventData, newAudioUrl: record.path }
    });
  }
  if (routing.frontendDestinations.includes("hero")) {
    emitAfterSuccessfulAction({
      type: "hero.updated",
      entityId: "homepage_hero",
      data: mediaEventData
    });
  }
  if (routing.frontendDestinations.includes("vault")) {
    emitAfterSuccessfulAction({
      type: "vault.updated",
      entityId: ownerId,
      data: mediaEventData
    });
  }
  if (routing.frontendDestinations.includes("audio_visuals")) {
    emitAfterSuccessfulAction({
      type: "audio_visuals.updated",
      entityId: ownerId,
      data: mediaEventData
    });
  }
  createCreatorNotification({
    type: "upload_completed",
    title: "Upload connected",
    detail: `${category.replaceAll("_", " ")} is saved and processing in the background.`,
    releaseId: input.releaseId,
    assetId: record.id,
    importance: "standard"
  });

  const releaseId = input.releaseId;
  queueCacheInvalidation({
    releaseId,
    assetId: record.id,
    tags: [releaseId ? `release:${releaseId}` : `owner:${ownerId}`, `asset:${record.id}`, category],
    paths: releaseId ? [`/releases/${releaseId}`, `/api/admin/releases/manage/${releaseId}`] : [record.path],
    reason: input.retryOfAssetId ? "Media replacement confirmed" : "Media upload confirmed"
  });
  recordMediaDependency({
    assetId: record.id,
    surfaceType: record.ownerType === "release" ? "release" : record.ownerType === "track" ? "track" : record.ownerType === "vault_content" ? "vault_section" : "frontend_page",
    surfaceId: ownerId,
    releaseId,
    trackId: input.trackId,
    label: category.replaceAll("_", " "),
    visibility: record.access === "public" ? "public" : record.access === "entitled" ? "vault_exclusive" : "private"
  });

  if (isReleaseArtworkCategory(category) && input.releaseId) {
    const coverType = coverArtTypeForPath(record.path);
    updateReleaseMetadata(input.releaseId, {
      coverArtState: "uploaded",
      csCover: record.path,
      coverArtType: coverType,
      csCoverType: coverType,
      ...(coverType === "video" ? { motionArtworkPath: record.path } : { coverArtPath: record.path }),
      frontendSyncTargets: record.frontendDestinations
    });
    void persistReleaseCoverArtColumns(input.releaseId, {
      csCover: record.path,
      coverArtType: coverType,
      csCoverType: coverType
    });
    recordReleaseActivity({ releaseId: input.releaseId, kind: "processing", message: "Artwork optimization queued" });
  }

  if ((category === "audio_full_song" || category === "audio_preview" || category === "track_audio" || category === "preview_snippets" || category === "full_song_files") && input.releaseId && input.trackId) {
    updateTrackInformation(input.releaseId, input.trackId, {
      audioState: "uploaded",
      audioFile: record.path,
      ...(audioAssetRole === "preview_audio" ? { previewAudioFile: record.path } : { fullAudioFile: record.path })
    });
    recordReleaseActivity({ releaseId: input.releaseId, kind: "processing", message: previewGeneration?.state === "pending" ? "Audio waveform and preview generation queued" : "Audio preview and waveform metadata recorded" });
  }

  if (isCsCoverUploadCategory(category) && input.releaseId && input.trackId) {
    const coverType = coverArtTypeForPath(record.path);
    updateTrackInformation(input.releaseId, input.trackId, {
      csCover: record.path,
      csCoverType: coverType
    });
    void persistTrackMediaColumns(input.releaseId, input.trackId, {
      csCover: record.path,
      csCoverType: coverType
    });
    recordReleaseActivity({ releaseId: input.releaseId, kind: "processing", message: "CS cover saved to track" });
  }

  if (category === "cs_audio" && input.releaseId && input.trackId) {
    updateTrackInformation(input.releaseId, input.trackId, {
      csAudio: record.path
    });
    void persistTrackMediaColumns(input.releaseId, input.trackId, { csAudio: record.path });
    recordReleaseActivity({ releaseId: input.releaseId, kind: "processing", message: "CS audio saved to track" });
  }

  if (category === "lyrics" && input.releaseId && input.trackId) {
    updateTrackInformation(input.releaseId, input.trackId, { lyricsState: "uploaded" });
    updateReleaseMetadata(input.releaseId, { lyricsState: "uploaded" });
  }

  return record;
}

export function confirmReleaseMediaUpload(input: Parameters<typeof confirmMediaUpload>[0]) {
  return confirmMediaUpload(input);
}

export function upsertImportedMediaAsset(input: {
  id: string;
  category: MediaUploadCategory;
  path: string;
  releaseId?: string;
  trackId?: string;
  mediaType?: RoutedMediaType;
  destination?: MediaUploadIntentInput["destination"];
  sourcePath?: string;
}) {
  const policy = UPLOAD_POLICIES[input.category];
  const ownerType = ownerTypeFor(input.category);
  const ownerId =
    ownerType === "track"
      ? input.trackId
      : ownerType === "release"
        ? input.releaseId
        : input.releaseId ?? input.trackId ?? input.id;
  if (!ownerId) {
    throw new Error("Imported media asset requires an owner");
  }

  const mediaType = input.mediaType ?? mediaTypeForUpload(input.category);
  const draft = input.releaseId ? getReleaseDraft(input.releaseId) : null;
  const routing = resolveContentDestinations({
    category: releaseCategoryForUpload(input.category),
    releaseType: draft?.releaseType,
    destination: input.destination ?? defaultDestinationFor(input.category),
    mediaType,
    relatedReleaseId: input.releaseId
  });
  const storagePlan = buildStructuredStoragePlan({
    category: input.category,
    ownerId,
    releaseId: input.releaseId,
    fileName: input.path.split("/").pop() ?? "media",
    folder: policy.folder
  });
  const audioAssetRole = audioAssetRoleFor(input.category);
  const audioMetadata = buildAudioMetadata(extensionFor(input.path));
  const previewGeneration = buildPreviewGeneration({
    role: audioAssetRole,
    sourcePath: input.path,
    storagePlan: { ...storagePlan, canonicalPath: input.path }
  });
  const record: ManagedMediaAssetRecord = {
    id: input.id,
    bucket: policy.bucket,
    path: input.path,
    category: input.category,
    ownerId,
    ownerType,
    releaseId: input.releaseId,
    trackId: input.trackId,
    destination: routing.destination,
    mediaType,
    frontendDestinations: routing.frontendDestinations,
    access: accessFor(input.category),
    status: "synced",
    processingJobs: [],
    audioAssetRole,
    audioMetadata,
    previewGeneration,
    transcodingCompatibility: buildAudioTranscodingCompatibility(audioAssetRole),
    playbackHandling: buildAudioPlaybackHandling(audioAssetRole),
    storagePlan: {
      ...storagePlan,
      canonicalPath: input.path,
      originalFileName: input.sourcePath ?? storagePlan.originalFileName
    },
    mediaIntelligence: buildMediaIntelligenceProfile({ assetId: input.id }),
    updatedAt: nowIso()
  };

  confirmedMediaAssets.set(record.id, record);
  if (isReleaseArtworkCategory(input.category) && input.releaseId) {
    const coverType = coverArtTypeForPath(record.path);
    updateReleaseMetadata(input.releaseId, {
      coverArtState: "uploaded",
      csCover: record.path,
      coverArtType: coverType,
      csCoverType: coverType,
      ...(coverType === "video" ? { motionArtworkPath: record.path } : { coverArtPath: record.path }),
      frontendSyncTargets: record.frontendDestinations
    });
    void persistReleaseCoverArtColumns(input.releaseId, {
      csCover: record.path,
      coverArtType: coverType,
      csCoverType: coverType
    });
  }
  if ((input.category === "audio_full_song" || input.category === "audio_preview" || input.category === "track_audio" || input.category === "preview_snippets" || input.category === "full_song_files") && input.releaseId && input.trackId) {
    updateTrackInformation(input.releaseId, input.trackId, {
      audioState: "uploaded",
      audioFile: record.path,
      csAudio: record.path,
      ...(audioAssetRole === "preview_audio" ? { previewAudioFile: record.path } : { fullAudioFile: record.path })
    });
    void persistTrackMediaColumns(input.releaseId, input.trackId, { csAudio: record.path });
  }
  emitAfterSuccessfulAction({
    type: "media.uploaded",
    entityId: input.releaseId ?? input.trackId ?? ownerId,
    data: {
      assetId: record.id,
      url: record.path,
      type: input.category,
      ownerId,
      ownerType,
      releaseId: input.releaseId,
      trackId: input.trackId,
      source: "frontend_import",
      durable: false
    }
  });
  return record;
}

export function listConfirmedMediaAssets() {
  return [...confirmedMediaAssets.values()];
}
