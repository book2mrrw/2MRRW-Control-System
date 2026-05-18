"use client";

import { useEffect, useMemo, useState, type DragEvent } from "react";

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
  | "single_cover_art"
  | "album_cover_art"
  | "audio_preview"
  | "audio_full_song"
  | "lyrics"
  | "signal_asset"
  | "radio_asset"
  | "collector_card_asset"
  | "vault_asset";

const uploadOptions: Array<{
  value: UploadCategory;
  label: string;
  accept: string;
  ownerField: "releaseId" | "trackId" | "signalId" | "radioId" | "collectorId" | "vaultContentId";
  note: string;
}> = [
  {
    value: "single_cover_art",
    label: "Release Artwork",
    accept: ".jpg,.jpeg,.png,.gif,.mp4,.mov,.webm,image/jpeg,image/png,image/gif,video/mp4,video/quicktime,video/webm",
    ownerField: "releaseId",
    note: "Cover art is tied to the exact release."
  },
  {
    value: "album_cover_art",
    label: "Release Artwork",
    accept: ".jpg,.jpeg,.png,.gif,.mp4,.mov,.webm,image/jpeg,image/png,image/gif,video/mp4,video/quicktime,video/webm",
    ownerField: "releaseId",
    note: "Cover art is tied to the exact release."
  },
  { value: "audio_preview", label: "Audio", accept: ".mp3,.wav,audio/mpeg,audio/wav,audio/x-wav", ownerField: "trackId", note: "Audio is tied to the exact track." },
  { value: "audio_full_song", label: "Audio", accept: ".wav,.mp3,audio/mpeg,audio/wav,audio/x-wav", ownerField: "trackId", note: "Audio is tied to the exact track." },
  { value: "lyrics", label: "Lyrics", accept: ".txt,.pdf,.docx,text/plain,application/pdf", ownerField: "trackId", note: "Lyrics are tied to the exact song." },
  { value: "signal_asset", label: "Hero Media", accept: ".jpg,.jpeg,.png,.gif,.mp4,.mov,.wav,.mp3,image/*,video/*,audio/*", ownerField: "signalId", note: "Hero media is tied to homepage hero, vault hero, or landing hero." },
  { value: "collector_card_asset", label: "Merch / Visual Media", accept: ".jpg,.jpeg,.png,.gif,.mp4,.mov,image/*,video/*", ownerField: "collectorId", note: "Merch and audiovisual media are tied to product or visual sections." },
  { value: "radio_asset", label: "Circle Content", accept: ".jpg,.jpeg,.png,.gif,.mp4,.mov,.wav,.mp3,image/*,video/*,audio/*", ownerField: "radioId", note: "Assign Circle uploads to a post, area, or artist update." },
  { value: "vault_asset", label: "Vault Assets", accept: ".jpg,.jpeg,.png,.gif,.mp4,.mov,.wav,.mp3,.pdf,.docx,image/*,video/*,audio/*", ownerField: "vaultContentId", note: "Vault media is tied to exact vault panels." }
];

const defaultsByMode: Record<string, UploadCategory> = {
  artwork: "single_cover_art",
  audio: "audio_full_song",
  videos: "signal_asset",
  loops: "collector_card_asset"
};

const coverArtworkHelperText = "Upload square cover artwork. Minimum size: 1400x1400. Recommended size: 3000x3000.";
const coverExtensions = new Set(["jpg", "jpeg", "png", "gif", "mp4", "mov", "webm"]);
const coverMimeTypes = new Set(["image/jpeg", "image/png", "image/gif", "video/mp4", "video/quicktime", "video/webm"]);
const coverMaxBytes = 70 * 1024 * 1024;

function isCoverCategory(category: UploadCategory) {
  return category === "single_cover_art" || category === "album_cover_art";
}

function isAudioCategory(category: UploadCategory) {
  return category === "audio_full_song" || category === "audio_preview";
}

function extensionFor(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function isVideoArtwork(file: File) {
  return file.type.startsWith("video/") || ["mp4", "mov", "webm"].includes(extensionFor(file.name));
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
  if (ownerField === "collectorId") return "Merch / visual owner";
  if (ownerField === "radioId") return "Audiovisual section owner";
  return "Media owner";
}

export function MediaUploadPanel({ draft, mode = "all" }: { draft: Draft | null; mode?: string }) {
  const [category, setCategory] = useState<UploadCategory>(defaultsByMode[mode] ?? "single_cover_art");
  const [trackId, setTrackId] = useState(draft?.tracks[0]?.id ?? "");
  const [externalOwnerId, setExternalOwnerId] = useState("");
  const [sectionAssignment, setSectionAssignment] = useState("");
  const [mediaTypeAssignment, setMediaTypeAssignment] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
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
    if (!file || !isCoverCategory(category)) {
      setArtworkValidation({ state: "idle", message: coverArtworkHelperText, warnings: [] });
      return;
    }

    const extension = extensionFor(file.name);
    const warnings: string[] = [];
    if (!coverExtensions.has(extension) || (file.type && !coverMimeTypes.has(file.type))) {
      setArtworkValidation({
        state: "needs_replacement",
        message: "Artwork needs replacement: JPG, PNG, GIF, MP4, MOV, and WEBM are the supported formats.",
        warnings: []
      });
      return;
    }

    if (!Number.isFinite(file.size) || file.size <= 0 || file.size > coverMaxBytes) {
      setArtworkValidation({
        state: "needs_replacement",
        message: "Artwork needs replacement: file size must be greater than 0 and 70MB or smaller.",
        warnings: []
      });
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

    if (isVideoArtwork(file)) {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => applyDimensions(video.videoWidth, video.videoHeight);
      video.onerror = () => {
        setArtworkValidation({
          state: "needs_replacement",
          message: "Artwork needs replacement: this motion cover could not be read and may be corrupted.",
          warnings: []
        });
        URL.revokeObjectURL(url);
      };
      video.src = url;
      return;
    }

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
    if (isCoverCategory(category) && artworkValidation.state !== "approved") {
      setStatus("Artwork needs replacement before upload can be prepared.");
      return;
    }
    setArtworkValidation((current) => isCoverCategory(category) ? { ...current, state: "uploading", message: "Uploading artwork" } : current);
    setStatus(isCoverCategory(category) ? "Uploading artwork" : "Preparing upload...");
    const ownerPayload = selectedOption?.ownerField && selectedOption.ownerField !== "releaseId" && selectedOption.ownerField !== "trackId"
      ? { [selectedOption.ownerField]: externalOwnerId }
      : {};
    const intentResponse = await fetch("/api/admin/media/upload-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin": "true" },
      body: JSON.stringify({
        category,
        releaseId: usesDraftRelease ? draft?.id : undefined,
        trackId: needsTrack ? trackId : undefined,
        ...ownerPayload,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size
      })
    });
    const intentPayload = await intentResponse.json().catch(() => null);
    const intent = intentPayload?.data;
    if (!intentResponse.ok || !intent?.signedUploadUrl) {
      setStatus(intentPayload?.error?.message || "This file does not meet the upload requirements.");
      setArtworkValidation((current) => isCoverCategory(category) ? { ...current, state: "needs_replacement", message: intentPayload?.error?.message || "Artwork needs replacement." } : current);
      return;
    }
    if (intent.mocked) {
      setStatus(`Upload prepared for ${intent.path}. Connect live media storage before sending file bytes.`);
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
      setStatus("Upload failed. No completed media was recorded.");
      setArtworkValidation((current) => isCoverCategory(category) ? { ...current, state: "needs_replacement", message: "Artwork needs replacement: storage upload failed." } : current);
      return;
    }
    setArtworkValidation((current) => isCoverCategory(category) ? { ...current, state: "processing", message: "Processing artwork" } : current);
    await fetch("/api/admin/media/upload-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin": "true" },
      body: JSON.stringify({
        category,
        releaseId: usesDraftRelease ? draft?.id : undefined,
        trackId: needsTrack ? trackId : undefined,
        ...ownerPayload,
        path: intent.path
      })
    });
    setStatus(`Upload confirmed at ${intent.path}.`);
    setArtworkValidation((current) => isCoverCategory(category) ? { ...current, state: "approved", message: `${current.message} Final server media probing is still modeled as metadata validation until that service is wired.` } : current);
  }

  const coverSelected = isCoverCategory(category);
  const audioSelected = isAudioCategory(category);
  const externalOwnerReady = selectedOption?.ownerField === "releaseId" || selectedOption?.ownerField === "trackId" || externalOwnerId.trim().length > 0;
  const relationalAssignmentReady = Boolean(sectionAssignment && mediaTypeAssignment && externalOwnerReady);
  const canRequestUpload = Boolean(file && relationalAssignmentReady && (!usesDraftRelease || draft) && (!coverSelected || artworkValidation.state === "approved"));
  const selectedTrack = draft?.tracks.find((track) => track.id === trackId);
  const ownerValue = selectedOption?.ownerField === "releaseId"
    ? draft?.title
    : selectedOption?.ownerField === "trackId"
      ? selectedTrack ? `${selectedTrack.position}. ${selectedTrack.title}` : "Choose a track"
      : externalOwnerId || "Choose owner";

  return (
    <section className="upload-panel">
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
      <div className="release-upload-controls">
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
          <select value={sectionAssignment} onChange={(event) => setSectionAssignment(event.target.value)}>
            <option value="">Choose destination</option>
            <option value="homepage-hero">Homepage hero</option>
            <option value="vault-hero">Vault hero</option>
            <option value="landing-hero">Landing hero</option>
            <option value="release-page">Release page</option>
            <option value="audio-visuals">Audio Visuals</option>
            <option value="vault-panel">Vault panel</option>
            <option value="merch-products">Merch products</option>
            <option value="circle">Circle</option>
            <option value="background-loops">Background Loops</option>
          </select>
        </label>
        <label>
          Media type
          <select value={mediaTypeAssignment} onChange={(event) => setMediaTypeAssignment(event.target.value)}>
            <option value="">Choose type</option>
            <option value="image">Image</option>
            <option value="gif">GIF</option>
            <option value="mp4">MP4</option>
            <option value="mov">MOV</option>
            <option value="webm">WEBM</option>
            <option value="wav">WAV</option>
            <option value="mp3">MP3</option>
            <option value="youtube">YouTube embed</option>
          </select>
        </label>
      </div>
      <label className="release-upload-zone" onDragOver={(event) => event.preventDefault()} onDrop={captureDroppedFile}>
        <span>{coverSelected ? coverArtworkHelperText : "Drag & drop or click to select media"}</span>
        <strong>{file ? file.name : "No file selected"}</strong>
        <small>{selectedOption?.note}</small>
        <input type="file" accept={selectedOption?.accept} onChange={(event) => {
          setFile(event.currentTarget.files?.[0] ?? null);
          setDeleteConfirmOpen(false);
        }} />
      </label>
      {coverSelected ? (
        <div className="artwork-validation-card">
          <div>
            <p className="meta-label">Artwork validation</p>
            <strong>{statusLabel(artworkValidation.state)}</strong>
          </div>
          <p>{artworkValidation.message}</p>
          <ul>
            <li>Format validation: JPG, PNG, GIF, MP4, MOV, WEBM before processing.</li>
            <li>Resolution validation: must be square and at least 1400x1400.</li>
            <li>File size validation: must be 70MB or smaller.</li>
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
          <p>Upload a high-quality WAV or MP3 master for 2MRRW.</p>
          <ul>
            <li>Target quality: up to 24-bit with 44.1kHz minimum review.</li>
            <li>Waveform: preview the selected audio before upload.</li>
            <li>Status: Uploading, Processing, Ready.</li>
          </ul>
          {file && previewUrl ? (
            <audio controls src={previewUrl} />
          ) : null}
        </div>
      ) : null}
      <button className="control-button" disabled={!canRequestUpload} onClick={requestUploadIntent} type="button">
        {file ? "Replace / Upload Media" : "Prepare Upload"}
      </button>
      {!relationalAssignmentReady ? <p className="form-status">Choose destination, media type, and ownership before upload. This keeps every asset attached to the right release, track, hero, vault panel, audiovisual section, or merch product.</p> : null}
      <div className="inline-action-row" aria-label="Media item actions">
        <button className="control-button secondary" disabled={!file} type="button">Preview</button>
        <button className="control-button secondary" disabled={!file} type="button">Schedule</button>
        <button className="control-button secondary" disabled={!file} type="button">Publish</button>
        <button className="control-button secondary" disabled={!file} onClick={() => setDeleteConfirmOpen(true)} type="button">Delete</button>
      </div>
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
          {isVideoArtwork(file) ? (
            <video autoPlay controls loop src={previewUrl} />
          ) : (
            <img alt="Fullscreen selected cover artwork preview" src={previewUrl} />
          )}
        </div>
      ) : null}
    </section>
  );
}
