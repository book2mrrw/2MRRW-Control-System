export type MediaUploadKind = "images" | "audio" | "mp4_loops" | "press_photos" | "hero_media" | "vault_assets";

export type MediaValidationConfig = {
  kind: MediaUploadKind;
  acceptedTypes: string;
  maxSizeMb: number;
  requiresSquare?: boolean;
  videoDuration?: { minSeconds: number; maxSeconds: number };
};

export const mediaValidationConfigs: Record<MediaUploadKind, MediaValidationConfig> = {
  images: {
    kind: "images",
    acceptedTypes: ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp",
    maxSizeMb: 70,
    requiresSquare: true
  },
  audio: {
    kind: "audio",
    acceptedTypes: ".mp3,.wav,.flac,.aif,.aiff,audio/mpeg,audio/wav,audio/x-wav,audio/flac,audio/aiff,audio/x-aiff",
    maxSizeMb: 250
  },
  mp4_loops: {
    kind: "mp4_loops",
    acceptedTypes: ".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm",
    maxSizeMb: 70,
    videoDuration: { minSeconds: 3, maxSeconds: 90 }
  },
  press_photos: {
    kind: "press_photos",
    acceptedTypes: ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp",
    maxSizeMb: 70
  },
  hero_media: {
    kind: "hero_media",
    acceptedTypes: ".jpg,.jpeg,.png,.webp,.mp4,.mov,.webm,image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm",
    maxSizeMb: 70,
    videoDuration: { minSeconds: 3, maxSeconds: 90 }
  },
  vault_assets: {
    kind: "vault_assets",
    acceptedTypes: ".jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.wav,.mp3,.flac,.aif,.aiff,.pdf,.docx,image/*,video/*,audio/*",
    maxSizeMb: 250
  }
};

export function extensionFor(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export function mediaKindFromFile(file: File): MediaUploadKind {
  const extension = extensionFor(file.name);
  if (file.type.startsWith("audio/") || ["mp3", "wav", "flac", "aif", "aiff"].includes(extension)) return "audio";
  if (file.type.startsWith("video/") || ["mp4", "mov", "webm"].includes(extension)) return "mp4_loops";
  return "images";
}

export function validateMediaFile(file: File, config: MediaValidationConfig) {
  const maxBytes = config.maxSizeMb * 1024 * 1024;
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > maxBytes) {
    return `${config.kind} uploads must be ${config.maxSizeMb}MB or smaller.`;
  }
  return null;
}
