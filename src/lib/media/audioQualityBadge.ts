import type { AudioUploadMetadata } from "@/services/media/audioSupport";

export type AudioQualityBadge = "premium" | "standard" | "mp3";

export function resolveAudioQualityBadge(input?: {
  format?: string | null;
  bitDepth?: number | string | null;
  mimeType?: string | null;
}): AudioQualityBadge | null {
  const format = String(input?.format || input?.mimeType || "")
    .toLowerCase()
    .replace(/^audio\//, "");
  const depth = input?.bitDepth;

  if (format === "mp3" || format === "mpeg") return "mp3";
  if (depth === 24 || depth === "24" || depth === "32_float") return "premium";
  if (depth === 16 || depth === "16") return "standard";
  if (format === "wav" || format === "aiff" || format === "flac") return "standard";
  return null;
}

export function audioQualityBadgeFromMetadata(metadata?: Record<string, unknown>): AudioQualityBadge | null {
  const audio = (metadata?.audioQuality || metadata?.audio_quality || metadata?.audioMetadata) as
    | AudioUploadMetadata
    | undefined;
  return resolveAudioQualityBadge({
    format: audio?.format ?? (metadata?.audioFormat as string | undefined),
    bitDepth: audio?.bitDepth ?? (metadata?.bitDepth as number | undefined),
    mimeType: metadata?.mimeType as string | undefined
  });
}

export function audioQualityBadgeLabel(badge: AudioQualityBadge | null) {
  if (badge === "premium") return "Premium (24/32-bit WAV)";
  if (badge === "standard") return "Standard (16-bit)";
  if (badge === "mp3") return "MP3";
  return null;
}
