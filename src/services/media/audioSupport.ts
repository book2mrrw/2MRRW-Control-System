export const professionalAudioFormats = ["mp3", "wav", "aiff", "flac", "aac", "m4a"] as const;
export type ProfessionalAudioFormat = (typeof professionalAudioFormats)[number];

export const supportedAudioBitDepths = [16, 24, "32_float"] as const;
export type SupportedAudioBitDepth = (typeof supportedAudioBitDepths)[number];

export const supportedAudioSampleRatesHz = [44100, 48000, 88200, 96000] as const;
export type SupportedAudioSampleRateHz = (typeof supportedAudioSampleRatesHz)[number];

export const audioPreviewGenerationStates = ["not_required", "pending", "ready", "failed"] as const;
export type AudioPreviewGenerationState = (typeof audioPreviewGenerationStates)[number];

export const audioAssetRoles = ["master_audio", "preview_audio", "streaming_preview", "supporting_audio"] as const;
export type AudioAssetRole = (typeof audioAssetRoles)[number];

export type AudioUploadMetadata = {
  format?: ProfessionalAudioFormat;
  bitDepth?: SupportedAudioBitDepth | "unknown";
  sampleRateHz?: SupportedAudioSampleRateHz | "unknown";
  channels?: number | "unknown";
  durationSeconds?: number;
};

export const professionalAudioMimeTypes = [
  "audio/mpeg",
  "audio/mp3",
  "audio/mpeg3",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/vnd.wave",
  "audio/aiff",
  "audio/x-aiff",
  "audio/flac",
  "audio/x-flac",
  "application/x-flac",
  "audio/aac",
  "audio/aacp",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a"
] as const;

export const professionalAudioExtensions = ["mp3", "wav", "aif", "aiff", "flac", "aac", "m4a"] as const;

export const permissiveAudioMimeTypes = ["application/octet-stream", "binary/octet-stream"] as const;

export const professionalAudioQualityTarget = {
  supportedFormats: professionalAudioFormats,
  supportedBitDepths: supportedAudioBitDepths,
  supportedSampleRatesHz: supportedAudioSampleRatesHz,
  validation: "metadata_optional" as const,
  preservesOriginalMaster: true,
  acceptsUnknownBrowserMetadata: true,
  helperText: "Supports MP3, WAV, AIFF, FLAC, AAC, and M4A at 44.1-96kHz, including 16-bit, 24-bit, and 32-bit float masters where supported."
};

export function canonicalAudioFormatForExtension(extension: string): ProfessionalAudioFormat | undefined {
  const normalized = extension.toLowerCase();
  if (normalized === "aif") return "aiff";
  if (professionalAudioFormats.includes(normalized as ProfessionalAudioFormat)) return normalized as ProfessionalAudioFormat;
  return undefined;
}

export function isSupportedAudioExtension(extension: string) {
  return professionalAudioExtensions.includes(extension.toLowerCase() as (typeof professionalAudioExtensions)[number]);
}

export function isSupportedAudioMimeType(mimeType: string) {
  return professionalAudioMimeTypes.includes(mimeType.toLowerCase() as (typeof professionalAudioMimeTypes)[number]);
}

export function isPermissiveAudioMimeType(mimeType: string) {
  return permissiveAudioMimeTypes.includes(mimeType.toLowerCase() as (typeof permissiveAudioMimeTypes)[number]);
}

export function validateAudioUploadMetadata(metadata?: AudioUploadMetadata) {
  if (!metadata) return;

  if (metadata.format && !professionalAudioFormats.includes(metadata.format)) {
    throw new Error("Unsupported audio format metadata");
  }

  if (metadata.bitDepth && metadata.bitDepth !== "unknown" && !supportedAudioBitDepths.includes(metadata.bitDepth)) {
    throw new Error("Unsupported audio bit depth metadata");
  }

  if (metadata.sampleRateHz && metadata.sampleRateHz !== "unknown" && !supportedAudioSampleRatesHz.includes(metadata.sampleRateHz)) {
    throw new Error("Unsupported audio sample rate metadata");
  }

  if (typeof metadata.channels === "number" && (!Number.isInteger(metadata.channels) || metadata.channels < 1 || metadata.channels > 64)) {
    throw new Error("Unsupported audio channel metadata");
  }

  if (metadata.durationSeconds !== undefined && (!Number.isFinite(metadata.durationSeconds) || metadata.durationSeconds <= 0)) {
    throw new Error("Invalid audio duration metadata");
  }
}
