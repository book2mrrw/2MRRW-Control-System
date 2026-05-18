import { getServerSupabase } from "@/server/supabase/client";
import { emitAfterSuccessfulAction } from "@/server/events/eventedWriteService";
import {
  resolveContentDestinations,
  type FrontendDestination,
  type MediaDestination,
  type RoutedMediaType
} from "@/services/sync/contentRouting";
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
  "single_cover_art",
  "album_cover_art",
  "audio_preview",
  "audio_full_song",
  "lyrics",
  "signal_asset",
  "radio_asset",
  "collector_card_asset",
  "vault_asset"
] as const;
export type MediaUploadCategory = (typeof mediaUploadCategories)[number];

export const releaseUploadAssetTypes = ["master_audio", "preview_audio", "artwork", "loop_video", "lyrics"] as const;
export type ReleaseUploadAssetType = (typeof releaseUploadAssetTypes)[number];

type UploadPolicy = {
  bucket: "protected-media";
  folder: "singles" | "albums" | "masters" | "previews" | "lyrics" | "signal" | "radio" | "collectors" | "vault";
  maxSizeMb: number;
  mimeTypes: readonly string[];
  extensions: readonly string[];
  ownerField: "releaseId" | "trackId" | "signalId" | "radioId" | "collectorId" | "vaultContentId";
  requiresRelease?: boolean;
  requiresTrack?: boolean;
  audioQualityTarget?: {
    bitDepth: 24;
    sampleRateHz: 44100;
    validation: "metadata_required";
  };
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
} & MediaUploadOwnerInput;

export type MediaUploadIntent = {
  ok: true;
  bucket: "protected-media";
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
  bucket: "protected-media";
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
  storagePlan: ReturnType<typeof buildStructuredStoragePlan>;
  mediaIntelligence: ReturnType<typeof buildMediaIntelligenceProfile>;
  retryOfAssetId?: string;
  updatedAt: string;
};

const MB = 1024 * 1024;
const imageMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp"] as const;
const mp4MimeTypes = ["video/mp4"] as const;
const motionCoverMimeTypes = [...mp4MimeTypes, "video/quicktime", "video/webm"] as const;
const coverMimeTypes = [...imageMimeTypes, ...motionCoverMimeTypes] as const;
const coverExtensions = [...imageExtensions, "mp4", "mov", "webm"] as const;
const audioMimeTypes = ["audio/wav", "audio/x-wav", "audio/mpeg", "audio/mp3", "audio/flac", "audio/aiff", "audio/x-aiff"] as const;
const audioExtensions = ["wav", "mp3", "flac", "aif", "aiff"] as const;
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
  if (category === "signal_asset") return "hero";
  if (category === "vault_asset") return "vault";
  if (category === "radio_asset" || category === "collector_card_asset") return "audio_visuals";
  return "release_media";
}

function releaseCategoryForUpload(category: MediaUploadCategory) {
  if (category === "single_cover_art") return "single" as const;
  if (category === "album_cover_art") return "album" as const;
  return undefined;
}

function mediaTypeForUpload(category: MediaUploadCategory, mimeType?: string): RoutedMediaType {
  if (category === "audio_full_song" || category === "audio_preview") return "audio";
  if (category === "lyrics") return "document";
  if (mimeType?.startsWith("video/")) return "video";
  if (mimeType?.startsWith("audio/")) return "audio";
  if (mimeType?.startsWith("image/")) return "image";
  return "document";
}

const UPLOAD_POLICIES: Record<MediaUploadCategory, UploadPolicy> = {
  single_cover_art: {
    bucket: "protected-media",
    folder: "singles",
    maxSizeMb: 70,
    mimeTypes: coverMimeTypes,
    extensions: coverExtensions,
    ownerField: "releaseId",
    requiresRelease: true,
    artworkQualityTarget: coverArtworkTarget
  },
  album_cover_art: {
    bucket: "protected-media",
    folder: "albums",
    maxSizeMb: 70,
    mimeTypes: coverMimeTypes,
    extensions: coverExtensions,
    ownerField: "releaseId",
    requiresRelease: true,
    artworkQualityTarget: coverArtworkTarget
  },
  audio_preview: {
    bucket: "protected-media",
    folder: "previews",
    maxSizeMb: 70,
    mimeTypes: audioMimeTypes,
    extensions: audioExtensions,
    ownerField: "trackId",
    requiresRelease: true,
    requiresTrack: true
  },
  audio_full_song: {
    bucket: "protected-media",
    folder: "masters",
    maxSizeMb: 250,
    mimeTypes: audioMimeTypes,
    extensions: audioExtensions,
    ownerField: "trackId",
    requiresRelease: true,
    requiresTrack: true,
    audioQualityTarget: {
      bitDepth: 24,
      sampleRateHz: 44100,
      validation: "metadata_required"
    }
  },
  lyrics: {
    bucket: "protected-media",
    folder: "lyrics",
    maxSizeMb: 10,
    mimeTypes: docMimeTypes,
    extensions: docExtensions,
    ownerField: "trackId",
    requiresRelease: true,
    requiresTrack: true
  },
  signal_asset: {
    bucket: "protected-media",
    folder: "signal",
    maxSizeMb: 70,
    mimeTypes: [...imageMimeTypes, ...mp4MimeTypes, ...audioMimeTypes],
    extensions: [...imageExtensions, "mp4", ...audioExtensions],
    ownerField: "signalId"
  },
  radio_asset: {
    bucket: "protected-media",
    folder: "radio",
    maxSizeMb: 70,
    mimeTypes: [...imageMimeTypes, ...mp4MimeTypes, ...audioMimeTypes],
    extensions: [...imageExtensions, "mp4", ...audioExtensions],
    ownerField: "radioId"
  },
  collector_card_asset: {
    bucket: "protected-media",
    folder: "collectors",
    maxSizeMb: 70,
    mimeTypes: coverMimeTypes,
    extensions: coverExtensions,
    ownerField: "collectorId"
  },
  vault_asset: {
    bucket: "protected-media",
    folder: "vault",
    maxSizeMb: 70,
    mimeTypes: [...imageMimeTypes, ...mp4MimeTypes, ...audioMimeTypes, ...docMimeTypes],
    extensions: [...imageExtensions, "mp4", ...audioExtensions, ...docExtensions],
    ownerField: "vaultContentId"
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
    category === "audio_preview" || category === "audio_full_song" || category === "lyrics"
      ? `${policy.folder}/${releaseId}/${sanitizedOwnerId}/`
      : category === "single_cover_art" || category === "album_cover_art"
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

  if (!policy.mimeTypes.includes(input.mimeType)) {
    throw new Error(`Unsupported MIME type for ${category}`);
  }

  const maxSizeBytes = policy.maxSizeMb * MB;
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0 || input.sizeBytes > maxSizeBytes) {
    throw new Error(`${category} uploads must be ${policy.maxSizeMb}MB or smaller`);
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

  if (category === "audio_preview" || category === "audio_full_song" || category === "lyrics") {
    return `${policy.folder}/${sanitizePathPart(input.releaseId ?? "release")}/${sanitizePathPart(ownerId)}/${stampedName}`;
  }

  if (category === "single_cover_art" || category === "album_cover_art") {
    return `${policy.folder}/${sanitizePathPart(ownerId)}/cover/${stampedName}`;
  }

  return `${policy.folder}/${sanitizePathPart(ownerId)}/${stampedName}`;
}

export function buildReleaseUploadPath(input: MediaUploadIntentInput) {
  return buildMediaUploadPath(input);
}

export async function createMediaUploadIntent(input: MediaUploadIntentInput): Promise<MediaUploadIntent> {
  const { category, policy, maxSizeBytes } = validateMediaUploadIntent(input);
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
    category: releaseCategoryForUpload(category),
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
      signedUploadUrl: `https://signed-upload.local/${policy.bucket}/${path}`,
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

  const storage = supabase.storage.from(policy.bucket) as unknown as {
    createSignedUploadUrl: (path: string) => Promise<{
      data?: { signedUrl?: string; token?: string };
      error?: { message?: string };
    }>;
  };
  const { data, error } = await storage.createSignedUploadUrl(path);

  if (error || !data?.signedUrl) {
    markUploadQueueItem(queuedUpload.id, "retry_available", error?.message ?? "Unable to create signed upload URL");
    throw new Error(error?.message ?? "Unable to create signed upload URL");
  }

  return {
    ok: true,
    bucket: policy.bucket,
    path,
    category,
    uploadMethod: "direct-to-storage",
    signedUploadUrl: data.signedUrl,
    token: data.token,
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
  if (category === "single_cover_art" || category === "album_cover_art") return "release";
  if (category === "audio_preview" || category === "audio_full_song" || category === "lyrics") return "track";
  if (category === "signal_asset") return "signal";
  if (category === "radio_asset") return "radio";
  if (category === "collector_card_asset") return "collector";
  return "vault_content";
}

function accessFor(category: MediaUploadCategory): ManagedMediaAssetRecord["access"] {
  if (category === "single_cover_art" || category === "album_cover_art" || category === "audio_preview" || category === "signal_asset" || category === "radio_asset") {
    return "public";
  }
  if (category === "collector_card_asset" || category === "vault_asset") return "entitled";
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
  retryOfAssetId?: string;
}) {
  const category = normalizeUploadCategory(input);
  const policy = UPLOAD_POLICIES[category];
  validateReleaseContext(input, policy);
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
    category === "audio_full_song" || category === "audio_preview"
      ? ["waveform_preview", "optimized_preview", "compressed_delivery"]
      : category === "single_cover_art" || category === "album_cover_art" || category === "collector_card_asset"
        ? ["thumbnail", "responsive_image", "image_optimization"]
        : category === "signal_asset" || category === "radio_asset" || category === "vault_asset"
          ? ["thumbnail", "optimized_preview"]
          : []
  );
  const mediaType = input.mediaType ?? mediaTypeForUpload(category);
  const routing = resolveContentDestinations({
    category: releaseCategoryForUpload(category),
    destination: input.destination ?? defaultDestinationFor(category),
    mediaType,
    relatedReleaseId: input.releaseId
  });
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
    storagePlan: { ...storagePlan, canonicalPath: input.path },
    mediaIntelligence: buildMediaIntelligenceProfile({
      assetId: recordId
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
    slot: category === "audio_full_song" || category === "audio_preview" ? "track_audio" : category,
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

  if ((category === "single_cover_art" || category === "album_cover_art") && input.releaseId) {
    updateReleaseMetadata(input.releaseId, { coverArtState: "uploaded" });
    recordReleaseActivity({ releaseId: input.releaseId, kind: "processing", message: "Artwork optimization queued" });
  }

  if ((category === "audio_full_song" || category === "audio_preview") && input.releaseId && input.trackId) {
    updateTrackInformation(input.releaseId, input.trackId, { audioState: "uploaded" });
    recordReleaseActivity({ releaseId: input.releaseId, kind: "processing", message: "Audio waveform and preview jobs queued" });
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

export function listConfirmedMediaAssets() {
  return [...confirmedMediaAssets.values()];
}
