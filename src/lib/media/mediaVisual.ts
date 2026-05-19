export type DetectedMediaKind = "image" | "video_loop" | "gif" | "audio" | "embed" | "unknown";

const VIDEO_EXT = new Set(["mp4", "mov", "webm", "m4v"]);
const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp"]);
const GIF_EXT = new Set(["gif"]);
const AUDIO_EXT = new Set(["mp3", "wav", "flac", "aac", "m4a", "aiff"]);

export function extensionFromPath(path?: string | null) {
  if (!path) return "";
  const clean = path.split("?")[0] ?? path;
  const parts = clean.split(".");
  return (parts[parts.length - 1] ?? "").toLowerCase();
}

export function detectMediaKind(pathOrUrl?: string | null): DetectedMediaKind {
  if (!pathOrUrl) return "unknown";
  if (/youtube\.com|youtu\.be|vimeo\.com/i.test(pathOrUrl)) return "embed";
  const ext = extensionFromPath(pathOrUrl);
  if (GIF_EXT.has(ext)) return "gif";
  if (VIDEO_EXT.has(ext)) return "video_loop";
  if (IMAGE_EXT.has(ext)) return "image";
  if (AUDIO_EXT.has(ext)) return "audio";
  return "unknown";
}

export function isMotionMedia(pathOrUrl?: string | null) {
  const kind = detectMediaKind(pathOrUrl);
  return kind === "video_loop" || kind === "gif";
}

export function pickCardVisual(input: { coverUrl?: string | null; loopUrl?: string | null }) {
  if (input.loopUrl && isMotionMedia(input.loopUrl)) {
    return { kind: detectMediaKind(input.loopUrl), url: input.loopUrl } as const;
  }
  if (input.coverUrl) {
    return { kind: detectMediaKind(input.coverUrl), url: input.coverUrl } as const;
  }
  return { kind: "unknown" as const, url: null };
}

export const coverArtHints = "Square cover: 1400×1400 min · 3000×3000 recommended · loops max 90s (MP4/MOV/WebM/GIF).";
