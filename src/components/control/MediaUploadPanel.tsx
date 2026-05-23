"use client";

import { useEffect, useMemo, useState, type DragEvent } from "react";
import { StudioMediaUpload } from "@/components/control/StudioMediaUpload";
import {
  coverArtAccept,
  coverImageMaxBytes,
  coverVideoMaxBytes,
  isAllowedCoverArtFile,
  isCoverVideoFile
} from "@/lib/media/coverArt";
import { professionalAudioExtensions, professionalAudioMimeTypes, type AudioUploadMetadata } from "@/services/media/audioSupport";
import { enqueueUpload, patchUploadQueue } from "@/hooks/sync/useUploadQueue";
import type { MediaDestination, RoutedMediaType } from "@/services/sync/contentRouting";

type DraftTrack = { id: string; title: string; position: number };
type Draft = { id: string; title: string; tracks: DraftTrack[] };
type ArtworkState = "idle" | "uploading" | "processing" | "approved" | "needs_replacement";
type ArtworkValidation = {
  state: ArtworkState;
  message: string;
  width?: number;
  height?: number;
  warnings: string[];
};

type UploadCategory =
  | "release_cover"
  | "track_audio"
  | "hero_media"
  | "vault_media"
  | "audio_visual"
  | "collectible_media"
  | "merch_media"
  | "latest_singles"
  | "albums"
  | "features"
  | "preview_snippets"
  | "full_song_files"
  | "single_cover_art"
  | "album_cover_art"
  | "audio_preview"
  | "audio_full_song"
  | "lyrics"
  | "signal_asset"
  | "radio_asset"
  | "collector_card_asset"
  | "vault_asset";

const professionalAudioAccept = [
  ...professionalAudioExtensions.map((extension) => `.${extension}`),
  ...professionalAudioMimeTypes
].join(",");
const coverAccept = ".jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.webm,image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm";
const coverArtOnlyAccept = coverArtAccept;
const visualAccept = `${coverAccept},${professionalAudioAccept}`;
const mediaSectionOptions: Array<{ value: MediaDestination; label: string }> = [
  { value: "hero", label: "HERO SECTION" },
  { value: "release_media", label: "LATEST SINGLES" },
  { value: "release_media", label: "ALBUMS" },
  { value: "release_media", label: "FEATURES" },
  { value: "audio_visuals", label: "AUDIO VISUALS" },
  { value: "vault", label: "VAULT MEDIA" },
  { value: "audio_files", label: "AUDIO FILES" },
  { value: "cover_art", label: "COVER ART" },
  { value: "preview_snippets", label: "PREVIEW SNIPPETS" },
  { value: "full_song_files", label: "FULL SONG FILES" }
];

const uploadOptions: Array<{
  value: UploadCategory;
  label: string;
  accept: string;
  ownerField: "releaseId" | "trackId" | "signalId" | "radioId" | "collectorId" | "vaultContentId";
  note: string;
}> = [
  {
    value: "hero_media",
    label: "Hero Section",
    accept: visualAccept,
    ownerField: "signalId",
    note: "Hero media syncs to homepage and landing hero surfaces."
  },
  {
    value: "latest_singles",
    label: "Latest Singles",
    accept: visualAccept,
    ownerField: "releaseId",
    note: "Latest singles sync to homepage, music tab, singles tab, and carousel surfaces."
  },
  {
    value: "albums",
    label: "Albums",
    accept: visualAccept,
    ownerField: "releaseId",
    note: "Album media syncs to album pages, carousels, music tabs, and featured album areas."
  },
  {
    value: "features",
    label: "Features",
    accept: visualAccept,
    ownerField: "releaseId",
    note: "Feature media syncs to collaborator, feature, and carousel surfaces."
  },
  {
    value: "audio_visual",
    label: "Audio Visuals",
    accept: visualAccept,
    ownerField: "radioId",
    note: "Audio visuals sync music videos, cinematic loops, visualizers, and uploaded motion assets."
  },
  {
    value: "vault_media",
    label: "Vault Media",
    accept: visualAccept,
    ownerField: "vaultContentId",
    note: "Vault media syncs to vault previews and cinematic vault assets."
  },
  {
    value: "track_audio",
    label: "Audio Files",
    accept: professionalAudioAccept,
    ownerField: "trackId",
    note: "Audio files stay linked to exact tracks and release metadata."
  },
  {
    value: "release_cover",
    label: "Cover Art",
    accept: coverArtOnlyAccept,
    ownerField: "releaseId",
    note: "Cover art is tied to the exact release."
  },
  {
    value: "preview_snippets",
    label: "Preview Snippets",
    accept: professionalAudioAccept,
    ownerField: "trackId",
    note: "Preview audio is tied to the exact track."
  },
  {
    value: "full_song_files",
    label: "Full Song Files",
    accept: professionalAudioAccept,
    ownerField: "trackId",
    note: "Full audio is tied to the exact track."
  },
  {
    value: "lyrics",
    label: "Lyrics",
    accept: ".txt,.lrc,.pdf,.doc,.docx,text/plain,application/pdf",
    ownerField: "trackId",
    note: "Lyrics documents stay linked to the exact track."
  }
];

const defaultsByMode: Record<string, UploadCategory> = {
  all: "hero_media",
  artwork: "release_cover",
  audio: "track_audio",
  videos: "hero_media",
  loops: "audio_visual",
  hero: "hero_media",
  vault: "vault_media",
  visual: "hero_media"
};

const routingDefaultsByCategory: Record<UploadCategory, { destination: MediaDestination; mediaType: RoutedMediaType }> = {
  release_cover: { destination: "cover_art", mediaType: "image" },
  track_audio: { destination: "audio_files", mediaType: "audio" },
  hero_media: { destination: "hero", mediaType: "video" },
  vault_media: { destination: "vault", mediaType: "video" },
  audio_visual: { destination: "audio_visuals", mediaType: "video" },
  collectible_media: { destination: "release_media", mediaType: "image" },
  merch_media: { destination: "release_media", mediaType: "image" },
  latest_singles: { destination: "release_media", mediaType: "image" },
  albums: { destination: "release_media", mediaType: "image" },
  features: { destination: "release_media", mediaType: "image" },
  preview_snippets: { destination: "preview_snippets", mediaType: "audio" },
  full_song_files: { destination: "full_song_files", mediaType: "audio" },
  single_cover_art: { destination: "cover_art", mediaType: "image" },
  album_cover_art: { destination: "cover_art", mediaType: "image" },
  audio_preview: { destination: "preview_snippets", mediaType: "audio" },
  audio_full_song: { destination: "full_song_files", mediaType: "audio" },
  lyrics: { destination: "release_media", mediaType: "document" },
  signal_asset: { destination: "hero", mediaType: "image" },
  radio_asset: { destination: "audio_visuals", mediaType: "video" },
  collector_card_asset: { destination: "release_media", mediaType: "image" },
  vault_asset: { destination: "vault", mediaType: "video" }
};

const coverArtworkHelperText = "Upload square cover artwork. Minimum size: 1400x1400. Recommended size: 3000x3000. MP4 animated covers: max 50MB, no resolution requirement.";
const studioAudioFormats = [
  "16-bit / 44.1kHz",
  "16-bit / 48kHz",
  "24-bit / 44.1kHz",
  "24-bit / 48kHz",
  "32-bit / 44.1kHz",
  "32-bit / 48kHz"
] as const;

function parseStudioAudioFormat(value: string): Pick<AudioUploadMetadata, "bitDepth" | "sampleRateHz"> {
  const bitDepth = value.includes("32-bit") ? "32_float" : value.includes("24-bit") ? 24 : 16;
  const sampleRateHz = value.includes("48kHz") ? 48000 : 44100;
  return { bitDepth, sampleRateHz };
}

function isCoverCategory(category: UploadCategory) {
  return category === "release_cover" || category === "single_cover_art" || category === "album_cover_art";
}

function isAudioCategory(category: UploadCategory) {
  return category === "track_audio" || category === "audio_full_song" || category === "audio_preview" || category === "preview_snippets" || category === "full_song_files";
}

function extensionFor(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function isVideoArtwork(file: File) {
  return isCoverVideoFile(file);
}

function audioFormatFor(fileName: string): AudioUploadMetadata["format"] {
  const extension = extensionFor(fileName);
  if (extension === "aif") return "aiff";
  if (extension === "mp3" || extension === "wav" || extension === "aiff" || extension === "flac" || extension === "aac" || extension === "m4a") return extension;
  return undefined;
}

function statusLabel(state: ArtworkState) {
  return {
    idle: "Select artwork",
    uploading: "Uploading artwork",
    processing: "Processing artwork",
    approved: "Artwork approved",
    needs_replacement: "Artwork needs replacement"
  }[state];
}

function ownershipLabel(ownerField?: string) {
  if (ownerField === "releaseId") return "Release owner";
  if (ownerField === "trackId") return "Track owner";
  if (ownerField === "signalId") return "Hero owner";
  if (ownerField === "vaultContentId") return "Vault panel owner";
  if (ownerField === "collectorId") return "Media group owner";
  if (ownerField === "radioId") return "Audiovisual section owner";
  return "Media owner";
}

export function MediaUploadPanel({
  draft,
  mode = "all",
  fixedCategory,
  compact = false,
  studioLayout = false,
  acceptOverride,
  onUploadComplete
}: {
  draft: Draft | null;
  mode?: string;
  fixedCategory?: UploadCategory;
  compact?: boolean;
  studioLayout?: boolean;
  acceptOverride?: string;
  onUploadComplete?: () => void;
}) {
  const resolvedDefault = fixedCategory ?? defaultsByMode[mode] ?? "single_cover_art";
  const [category, setCategory] = useState<UploadCategory>(resolvedDefault);
  const [trackId, setTrackId] = useState(draft?.tracks[0]?.id ?? "");
  const [externalOwnerId, setExternalOwnerId] = useState("");
  const [sectionAssignment, setSectionAssignment] = useState<MediaDestination>(routingDefaultsByCategory[resolvedDefault].destination);
  const [mediaTypeAssignment, setMediaTypeAssignment] = useState<RoutedMediaType>(routingDefaultsByCategory[resolvedDefault].mediaType);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [videoDurationReady, setVideoDurationReady] = useState(true);
  const [audioDurationSeconds, setAudioDurationSeconds] = useState<number | undefined>();
  const [audioFormat, setAudioFormat] = useState<string>(studioAudioFormats[0]);
  const [status, setStatus] = useState("Drop a file or click to prepare an upload.");
  const [artworkValidation, setArtworkValidation] = useState<ArtworkValidation>({
    state: "idle",
    message: coverArtworkHelperText,
    warnings: []
  });
  const selectedOption = useMemo(() => uploadOptions.find((option) => option.value === category), [category]);
  const needsTrack = selectedOption?.ownerField === "trackId";
  const usesDraftRelease = selectedOption?.ownerField === "releaseId" || needsTrack;
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (fixedCategory) setCategory(fixedCategory);
  }, [fixedCategory]);

  useEffect(() => {
    const defaults = routingDefaultsByCategory[category];
    setSectionAssignment(defaults.destination);
    setMediaTypeAssignment(defaults.mediaType);
    setDeleteConfirmOpen(false);
    setStatus("Drop a file or click to prepare an upload.");
  }, [category]);

  useEffect(() => {
    if (!file || !isVideoArtwork(file) || isCoverCategory(category)) {
      setVideoDurationReady(true);
      return;
    }
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const seconds = video.duration;
      const valid = Number.isFinite(seconds) && seconds >= 4 && seconds <= 90;
      setVideoDurationReady(valid);
      setStatus(valid ? `Video duration verified: ${Math.round(seconds)}s.` : "Video duration should be between 4s and 90s for frontend loops.");
      URL.revokeObjectURL(url);
    };
    video.onerror = () => {
      setVideoDurationReady(false);
      setStatus("Video duration could not be read. Replace the file before upload.");
      URL.revokeObjectURL(url);
    };
    video.src = url;
  }, [file]);

  useEffect(() => {
    if (!file || !isAudioCategory(category)) {
      setAudioDurationSeconds(undefined);
      return;
    }
    const url = URL.createObjectURL(file);
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const seconds = audio.duration;
      setAudioDurationSeconds(Number.isFinite(seconds) && seconds > 0 ? seconds : undefined);
      setStatus(Number.isFinite(seconds) && seconds > 0 ? `Audio metadata detected: ${Math.round(seconds)}s. Master quality will be preserved.` : "Audio selected. Server probing will retain quality metadata when available.");
      URL.revokeObjectURL(url);
    };
    audio.onerror = () => {
      setAudioDurationSeconds(undefined);
      setStatus("Audio selected. Local metadata could not be read, so server-side probing will handle quality metadata later.");
      URL.revokeObjectURL(url);
    };
    audio.src = url;
  }, [category, file]);

  useEffect(() => {
    if (!file || !isCoverCategory(category)) {
      setArtworkValidation({ state: "idle", message: coverArtworkHelperText, warnings: [] });
      return;
    }

    const warnings: string[] = [];
    const videoCover = isCoverVideoFile(file);
    if (!isAllowedCoverArtFile(file)) {
      setArtworkValidation({
        state: "needs_replacement",
        message: "Artwork needs replacement: JPG, PNG, WEBP, and MP4 are the supported cover formats.",
        warnings: []
      });
      return;
    }

    const maxBytes = videoCover ? coverVideoMaxBytes : coverImageMaxBytes;
    if (!Number.isFinite(file.size) || file.size <= 0 || file.size > maxBytes) {
      setArtworkValidation({
        state: "needs_replacement",
        message: videoCover
          ? "Artwork needs replacement: MP4 cover files must be greater than 0 and 50MB or smaller."
          : "Artwork needs replacement: file size must be greater than 0 and 70MB or smaller.",
        warnings: []
      });
      return;
    }

    if (videoCover) {
      setArtworkValidation({ state: "processing", message: "Processing artwork", warnings: [] });
      const url = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        setArtworkValidation({
          state: "approved",
          message: "Artwork approved: MP4 animated cover ready for upload.",
          warnings: []
        });
        URL.revokeObjectURL(url);
      };
      video.onerror = () => {
        setArtworkValidation({
          state: "needs_replacement",
          message: "Artwork needs replacement: this MP4 cover could not be read and may be corrupted.",
          warnings: []
        });
        URL.revokeObjectURL(url);
      };
      video.src = url;
      return;
    }

    setArtworkValidation({ state: "processing", message: "Processing artwork", warnings: [] });
    const url = URL.createObjectURL(file);
    const applyDimensions = (width: number, height: number) => {
      if (!width || !height) {
        setArtworkValidation({ state: "needs_replacement", message: "Artwork needs replacement: resolution could not be read.", warnings: [] });
        URL.revokeObjectURL(url);
        return;
      }
      if (width !== height) {
        setArtworkValidation({
          state: "needs_replacement",
          message: `Artwork needs replacement: detected ${width}x${height}, but artwork must be perfectly square.`,
          width,
          height,
          warnings: []
        });
        URL.revokeObjectURL(url);
        return;
      }
      if (width < 1400 || height < 1400) {
        setArtworkValidation({
          state: "needs_replacement",
          message: `Artwork needs replacement: detected ${width}x${height}. Minimum size is 1400x1400.`,
          width,
          height,
          warnings: []
        });
        URL.revokeObjectURL(url);
        return;
      }
      if (width < 3000 || height < 3000) {
        warnings.push("3000x3000 is recommended for the highest-quality 2MRRW presentation.");
      }
      setArtworkValidation({
        state: "approved",
        message: `Artwork approved: detected ${width}x${height}.`,
        width,
        height,
        warnings
      });
      URL.revokeObjectURL(url);
    };

    const image = new Image();
    image.onload = () => applyDimensions(image.naturalWidth, image.naturalHeight);
    image.onerror = () => {
      setArtworkValidation({
        state: "needs_replacement",
        message: "Artwork needs replacement: this image could not be read and may be corrupted.",
        warnings: []
      });
      URL.revokeObjectURL(url);
    };
    image.src = url;
  }, [category, file]);

  function captureDroppedFile(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setFile(event.dataTransfer.files?.[0] ?? null);
    setDeleteConfirmOpen(false);
  }

  function clearSelectedFile() {
    setFile(null);
    setDeleteConfirmOpen(false);
    setStatus("Media selection removed. Frontend sync remains unchanged until a replacement is uploaded.");
  }

  async function requestUploadIntent() {
    if (!file || (usesDraftRelease && !draft)) return;
    if (!videoDurationReady) {
      setStatus("Video duration should be between 4s and 90s before upload.");
      return;
    }
    if (isCoverCategory(category) && artworkValidation.state !== "approved") {
      setStatus("Artwork needs replacement before upload can be prepared.");
      return;
    }
    setArtworkValidation((current) => isCoverCategory(category) ? { ...current, state: "uploading", message: "Uploading artwork" } : current);
    setStatus(isCoverCategory(category) ? "Uploading artwork" : "Preparing upload...");
    const queueId = enqueueUpload({
      label: `${category}${draft?.title ? ` · ${draft.title}` : ""}`,
      releaseId: draft?.id,
      category,
      status: "uploading"
    });
    const ownerPayload = selectedOption?.ownerField && selectedOption.ownerField !== "releaseId" && selectedOption.ownerField !== "trackId"
      ? { [selectedOption.ownerField]: externalOwnerId }
      : {};
    const selectedAudioFormat = parseStudioAudioFormat(audioFormat);
    const audioMetadata = audioSelected && file ? {
      format: audioFormatFor(file.name),
      bitDepth: selectedAudioFormat.bitDepth,
      sampleRateHz: selectedAudioFormat.sampleRateHz,
      channels: "unknown",
      durationSeconds: audioDurationSeconds
    } satisfies AudioUploadMetadata : undefined;
    const resolvedMediaType: RoutedMediaType =
      coverSelected && file && isCoverVideoFile(file) ? "video" : mediaTypeAssignment;
    const intentResponse = await fetch("/api/admin/media/upload-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category,
        releaseId: usesDraftRelease ? draft?.id : undefined,
        trackId: needsTrack ? trackId : undefined,
        ...ownerPayload,
        destination: sectionAssignment,
        mediaType: resolvedMediaType,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        ...(audioMetadata ? { audioMetadata } : {})
      })
    });
    const intentPayload = await intentResponse.json().catch(() => null);
    const intent = intentPayload?.data;
    if (!intentResponse.ok || !intent?.signedUploadUrl) {
      patchUploadQueue(queueId, { status: "failed", error: intentPayload?.error?.message || "Upload intent rejected" });
      setStatus(intentPayload?.error?.message || "This file does not meet the upload requirements.");
      setArtworkValidation((current) => isCoverCategory(category) ? { ...current, state: "needs_replacement", message: intentPayload?.error?.message || "Artwork needs replacement." } : current);
      return;
    }
    if (intent.mocked) {
      await fetch("/api/admin/media/upload-complete", {
        method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category,
        releaseId: usesDraftRelease ? draft?.id : undefined,
        trackId: needsTrack ? trackId : undefined,
        ...ownerPayload,
        destination: sectionAssignment,
        mediaType: resolvedMediaType,
        path: intent.path,
        ...(audioMetadata ? { audioMetadata } : {})
      })
    });
    patchUploadQueue(queueId, { status: "complete", path: intent.path });
    onUploadComplete?.();
    setStatus(`Upload metadata synced for ${intent.path}. Connect live media storage to send file bytes.`);
      setArtworkValidation((current) => isCoverCategory(category) ? { ...current, state: "approved", message: `${current.message} Final media checks are still modeled as validation metadata until probing is wired.` } : current);
      return;
    }
    setStatus(isCoverCategory(category) ? "Uploading artwork" : "Uploading media...");
    const uploadResponse = await fetch(intent.signedUploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file
    });
    if (!uploadResponse.ok) {
      patchUploadQueue(queueId, { status: "failed", error: "Storage upload failed" });
      setStatus("Upload failed. No completed media was recorded.");
      setArtworkValidation((current) => isCoverCategory(category) ? { ...current, state: "needs_replacement", message: "Artwork needs replacement: storage upload failed." } : current);
      return;
    }
    setArtworkValidation((current) => isCoverCategory(category) ? { ...current, state: "processing", message: "Processing artwork" } : current);
    await fetch("/api/admin/media/upload-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category,
        releaseId: usesDraftRelease ? draft?.id : undefined,
        trackId: needsTrack ? trackId : undefined,
        ...ownerPayload,
        destination: sectionAssignment,
        mediaType: resolvedMediaType,
        path: intent.path,
        ...(audioMetadata ? { audioMetadata } : {})
      })
    });
    patchUploadQueue(queueId, { status: "complete", path: intent.path });
    onUploadComplete?.();
    setStatus(`Upload confirmed at ${intent.path}.`);
    setArtworkValidation((current) => isCoverCategory(category) ? { ...current, state: "approved", message: `${current.message} Final server media probing is still modeled as metadata validation until that service is wired.` } : current);
  }

  async function requestAudioVisualEmbed() {
    if (category !== "audio_visual" || !youtubeUrl.trim()) return;
    setStatus("Saving YouTube audio visual...");
    const response = await fetch("/api/admin/audio-visuals", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin": "true" },
      body: JSON.stringify({
        title: draft?.title ? `${draft.title} Visual` : externalOwnerId || "Audio Visual",
        youtubeUrl,
        releaseId: draft?.id,
        status: "published",
        metadata: {
          frontendSection: "audio_visuals",
          mediaType: "embed",
          destination: sectionAssignment || "audio_visuals"
        }
      })
    });
    const payload = await response.json().catch(() => null);
    setStatus(response.ok ? "YouTube audio visual published to the frontend audio visual section." : payload?.error?.message || "YouTube audio visual could not be saved.");
  }

  const coverSelected = isCoverCategory(category);
  const audioSelected = isAudioCategory(category);
  const embedSelected = category === "audio_visual" && mediaTypeAssignment === "embed";
  const externalOwnerReady = selectedOption?.ownerField === "releaseId" || selectedOption?.ownerField === "trackId" || externalOwnerId.trim().length > 0;
  const relationalAssignmentReady = Boolean(sectionAssignment && mediaTypeAssignment && externalOwnerReady);
  const canRequestUpload = Boolean(file && relationalAssignmentReady && videoDurationReady && (!usesDraftRelease || draft) && (!coverSelected || artworkValidation.state === "approved"));
  const selectedTrack = draft?.tracks.find((track) => track.id === trackId);
  const ownerValue = selectedOption?.ownerField === "releaseId"
    ? draft?.title
    : selectedOption?.ownerField === "trackId"
      ? selectedTrack ? `${selectedTrack.position}. ${selectedTrack.title}` : "Choose a track"
      : externalOwnerId || "Choose owner";

  const fileAccept = acceptOverride ?? (coverSelected ? coverArtOnlyAccept : selectedOption?.accept ?? "");
  const studioValidationLine = coverSelected
    ? artworkValidation.state === "approved"
      ? { ok: true, text: artworkValidation.message }
      : file
        ? { ok: false, text: artworkValidation.message }
        : null
    : audioSelected && file
      ? { ok: true, text: status || "Audio file ready to upload." }
      : audioSelected && !file
        ? null
        : null;

  if (studioLayout && compact && (coverSelected || audioSelected)) {
    return (
      <section className="upload-panel upload-panel-compact upload-panel-studio">
        <style>{`
          @media (max-width: 640px) {
            .upload-panel .release-upload-controls,
            .upload-panel .upload-ownership-card {
              grid-template-columns: 1fr !important;
            }
            .upload-panel .release-upload-zone,
            .upload-panel.upload-panel-studio .studio-media-dropzone {
              min-height: 160px;
            }
          }
        `}</style>
        <StudioMediaUpload
          mode={coverSelected ? "cover" : "audio"}
          accept={fileAccept}
          previewUrl={previewUrl || undefined}
          previewIsVideo={Boolean(file && isVideoArtwork(file))}
          fileName={file?.name}
          specs={
            coverSelected
              ? "JPG · PNG · WEBP · MP4 · Min 1400×1400 (images) · Max 50MB (MP4)"
              : "WAV · AIFF · FLAC · MP3 · AAC · Max 70MB"
          }
          mainLabel={coverSelected ? "Drop your cover art here" : "Drop your audio file here"}
          subLabel="or click to browse"
          buttonLabel="Prepare Upload"
          validationLine={studioValidationLine}
          canUpload={canRequestUpload}
          audioFormat={audioFormat}
          audioFormats={audioSelected ? [...studioAudioFormats] : undefined}
          onAudioFormatChange={setAudioFormat}
          onFileSelected={(next) => {
            setFile(next);
            setDeleteConfirmOpen(false);
          }}
          onUpload={() => void requestUploadIntent()}
        />
        {status ? <p className="form-status studio-upload-status">{status}</p> : null}
      </section>
    );
  }

  return (
    <section className={`upload-panel${compact ? " upload-panel-compact" : ""}`}>
      <style>{`
        @media (max-width: 640px) {
          .upload-panel .release-upload-controls,
          .upload-panel .upload-ownership-card {
            grid-template-columns: 1fr !important;
          }
          .upload-panel .release-upload-zone,
          .upload-panel.upload-panel-studio .studio-media-dropzone {
            min-height: 160px;
          }
        }
      `}</style>
      {!compact ? (
      <div className="upload-ownership-card">
        <div>
          <p className="meta-label">Ownership</p>
          <strong>{ownershipLabel(selectedOption?.ownerField)}: {ownerValue ?? "Choose owner"}</strong>
          <span>{selectedOption?.note}</span>
        </div>
        <div>
          <p className="meta-label">Sync contract</p>
          <strong>Prepared for backend, website, mobile, tablet, and desktop surfaces.</strong>
          <span>Live persistence follows the existing upload-intent and upload-complete services.</span>
        </div>
      </div>
      ) : null}
      {!compact ? (
      <div className="release-upload-controls">
        {!fixedCategory ? (
        <label>
          Category
          <select value={category} onChange={(event) => setCategory(event.target.value as UploadCategory)}>
            {uploadOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        ) : null}
        {needsTrack && draft ? (
          <label>
            Track
            <select value={trackId} onChange={(event) => setTrackId(event.target.value)}>
              {draft.tracks.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.position}. {track.title}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {!needsTrack && selectedOption?.ownerField !== "releaseId" ? (
          <label>
            Media group
            <input value={externalOwnerId} onChange={(event) => setExternalOwnerId(event.target.value)} placeholder="Collection or content name" />
          </label>
        ) : null}
        <label>
          Section assignment
          <select value={sectionAssignment} onChange={(event) => setSectionAssignment(event.target.value as MediaDestination)}>
            {mediaSectionOptions.map((option) => (
              <option key={`${option.label}-${option.value}`} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label>
          Media type
          <select value={mediaTypeAssignment} onChange={(event) => setMediaTypeAssignment(event.target.value as RoutedMediaType)}>
            <option value="image">Image</option>
            <option value="video">Video / loop</option>
            <option value="audio">Audio</option>
            <option value="embed">YouTube embed</option>
          </select>
        </label>
      </div>
      ) : null}
      <label className="release-upload-zone" onDragOver={(event) => event.preventDefault()} onDrop={captureDroppedFile}>
        <span>{coverSelected ? coverArtworkHelperText : "Drag & drop or click to select media"}</span>
        <strong>{file ? file.name : "No file selected"}</strong>
        <small>{selectedOption?.note}</small>
        <input type="file" accept={fileAccept} onChange={(event) => {
          setFile(event.currentTarget.files?.[0] ?? null);
          setDeleteConfirmOpen(false);
        }} />
      </label>
      {embedSelected ? (
        <div className="artwork-validation-card">
          <div>
            <p className="meta-label">YouTube embed</p>
            <strong>Audio visual section</strong>
          </div>
          <label>
            YouTube URL
            <input value={youtubeUrl} onChange={(event) => setYoutubeUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
          </label>
          <button className="control-button secondary" disabled={!youtubeUrl.trim()} onClick={requestAudioVisualEmbed} type="button">
            Save YouTube Embed
          </button>
        </div>
      ) : null}
      {coverSelected ? (
        <div className="artwork-validation-card">
          <div>
            <p className="meta-label">Artwork validation</p>
            <strong>{statusLabel(artworkValidation.state)}</strong>
          </div>
          <p>{artworkValidation.message}</p>
          <ul>
            <li>Format validation: JPG, PNG, WEBP, and MP4 before processing.</li>
            <li>Resolution validation: images must be square and at least 1400x1400; MP4 covers skip resolution checks.</li>
            <li>File size validation: images up to 70MB; MP4 covers up to 50MB.</li>
            <li>Corruption detection: local media preview must load before upload.</li>
          </ul>
          {artworkValidation.warnings.map((warning) => (
            <small key={warning}>{warning}</small>
          ))}
          {file && previewUrl ? (
            <div className="artwork-preview">
              {isVideoArtwork(file) ? (
                <video autoPlay loop muted playsInline src={previewUrl} />
              ) : (
                <img alt="Selected cover artwork preview" src={previewUrl} />
              )}
              <div className="preview-actions">
                <button className="control-button secondary" onClick={() => setPreviewOpen(true)} type="button">
                  Fullscreen Preview
                </button>
                <button className="control-button secondary" onClick={() => setDeleteConfirmOpen(true)} type="button">
                  Remove Artwork
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      {audioSelected ? (
        <div className="artwork-validation-card">
          <div>
            <p className="meta-label">Audio validation</p>
            <strong>{file ? "Processing" : "Select audio"}</strong>
          </div>
          <p>Upload preview snippets or full master audio without reducing original quality.</p>
          <ul>
            <li>Formats: MP3, WAV, AIFF, FLAC, AAC, and M4A.</li>
            <li>Quality metadata: 16-bit, 24-bit, 32-bit float, 44.1kHz, 48kHz, 88.2kHz, and 96kHz.</li>
            <li>Waveform and optimized preview generation stay queued separately from the untouched master.</li>
          </ul>
          {file && previewUrl ? (
            <>
              <audio controls src={previewUrl} />
              <small>Waveform preview hook ready; worker output will attach after processing.</small>
            </>
          ) : null}
        </div>
      ) : null}
      <button className="control-button" disabled={!canRequestUpload} onClick={requestUploadIntent} type="button">
        {file ? "Replace / Upload Media" : "Prepare Upload"}
      </button>
      {!compact && !relationalAssignmentReady ? <p className="form-status">Choose destination, media type, and ownership before upload. This keeps every asset attached to the right release, track, hero, vault panel, audiovisual section, or merch product.</p> : null}
      {!compact ? (
      <div className="inline-action-row" aria-label="Media item actions">
        <button className="control-button secondary" disabled={!file} type="button">Preview</button>
        <button className="control-button secondary" disabled={!file} type="button">Schedule</button>
        <button className="control-button secondary" disabled={!file} type="button">Publish</button>
        <button className="control-button secondary" disabled={!file} onClick={() => setDeleteConfirmOpen(true)} type="button">Delete</button>
      </div>
      ) : null}
      {deleteConfirmOpen ? (
        <div className="delete-confirm-card" role="alertdialog" aria-label="Confirm media removal">
          <div>
            <p className="meta-label">Delete confirmation</p>
            <strong>Remove the selected media from this upload session?</strong>
            <span>This does not delete a published frontend asset until replacement and sync services confirm the change.</span>
          </div>
          <div className="inline-action-row">
            <button className="control-button secondary" onClick={() => setDeleteConfirmOpen(false)} type="button">Cancel</button>
            <button className="control-button" onClick={clearSelectedFile} type="button">Confirm Delete</button>
          </div>
        </div>
      ) : null}
      <p className="form-status">{status}</p>
      {previewOpen && file && previewUrl ? (
        <div className="preview-modal" role="dialog" aria-modal="true" aria-label="Fullscreen artwork preview">
          <button className="control-button secondary" onClick={() => setPreviewOpen(false)} type="button">
            Close Preview
          </button>
          {audioSelected ? (
            <audio controls src={previewUrl} />
          ) : isVideoArtwork(file) ? (
            <video autoPlay controls loop src={previewUrl} />
          ) : (
            <img alt="Fullscreen selected cover artwork preview" src={previewUrl} />
          )}
        </div>
      ) : null}
    </section>
  );
}
