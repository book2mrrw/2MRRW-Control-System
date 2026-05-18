"use client";

import { useMemo, useState } from "react";

type DraftTrack = {
  id: string;
  title: string;
  position: number;
};

type Draft = {
  id: string;
  title: string;
  tracks: DraftTrack[];
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
}> = [
  { value: "single_cover_art", label: "Singles cover art / MP4 cover loop", accept: ".jpg,.jpeg,.png,.gif,.mp4,image/jpeg,image/png,image/gif,video/mp4", ownerField: "releaseId" },
  { value: "album_cover_art", label: "Albums cover art / MP4 cover loop", accept: ".jpg,.jpeg,.png,.gif,.mp4,image/jpeg,image/png,image/gif,video/mp4", ownerField: "releaseId" },
  { value: "audio_preview", label: "Audio previews", accept: ".mp3,.wav,audio/mpeg,audio/wav,audio/x-wav", ownerField: "trackId" },
  { value: "audio_full_song", label: "Audio full songs", accept: ".wav,.mp3,audio/mpeg,audio/wav,audio/x-wav", ownerField: "trackId" },
  { value: "lyrics", label: "Lyrics document", accept: ".txt,.pdf,.docx,text/plain,application/pdf", ownerField: "trackId" },
  { value: "signal_asset", label: "2MRRW Signal media/assets", accept: ".jpg,.jpeg,.png,.gif,.mp4,.wav,.mp3,image/*,video/mp4,audio/*", ownerField: "signalId" },
  { value: "collector_card_asset", label: "Collector card assets", accept: ".jpg,.jpeg,.png,.gif,.mp4,image/*,video/mp4", ownerField: "collectorId" },
  { value: "radio_asset", label: "2MRRW Radio assets", accept: ".jpg,.jpeg,.png,.gif,.mp4,.wav,.mp3,image/*,video/mp4,audio/*", ownerField: "radioId" },
  { value: "vault_asset", label: "Vault asset", accept: ".jpg,.jpeg,.png,.gif,.mp4,.wav,.mp3,.pdf,.docx,image/*,video/mp4,audio/*", ownerField: "vaultContentId" }
];

export function ReleaseUploadPanel({ draft }: { draft: Draft | null }) {
  const [category, setCategory] = useState<UploadCategory>("single_cover_art");
  const [trackId, setTrackId] = useState(draft?.tracks[0]?.id ?? "");
  const [externalOwnerId, setExternalOwnerId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("Choose a file from phone or computer to request a direct upload intent.");
  const selectedOption = useMemo(() => uploadOptions.find((option) => option.value === category), [category]);
  const needsTrack = selectedOption?.ownerField === "trackId";
  const usesDraftRelease = selectedOption?.ownerField === "releaseId" || needsTrack;

  async function handleUpload() {
    if (!file || (usesDraftRelease && !draft)) return;
    setStatus("Requesting direct-to-storage upload intent...");
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
      setStatus(intentPayload?.error?.message || "Upload intent rejected.");
      return;
    }

    if (intent.mocked) {
      setStatus(`Intent ready for ${intent.path}. Live Supabase Storage env is required before uploading bytes.`);
      return;
    }

    setStatus("Uploading directly to protected media storage...");
    const uploadResponse = await fetch(intent.signedUploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file
    });

    if (!uploadResponse.ok) {
      setStatus("Storage upload failed. Keep the draft in assets pending and retry.");
      return;
    }

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
    setStatus(`Uploaded and finalized ${intent.path}.`);
  }

  return (
    <div className="release-upload-panel">
      <div className="release-upload-controls">
        <label>
          Upload card
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
            Owner ID
            <input
              value={externalOwnerId}
              onChange={(event) => setExternalOwnerId(event.target.value)}
              placeholder={`${selectedOption?.ownerField || "owner"}...`}
            />
          </label>
        ) : null}
      </div>

      <label className="release-upload-zone">
        <span>Tap or click to choose a backend-managed asset</span>
        <strong>{file ? file.name : "Phone camera roll, Files, or desktop picker"}</strong>
        <small>{selectedOption?.label} accepts {selectedOption?.accept}</small>
        {category === "audio_full_song" ? (
          <small>Target quality: 24-bit / 44.1kHz. Current validation enforces MP3/WAV and records metadata-probe requirement.</small>
        ) : null}
        <input
          type="file"
          accept={selectedOption?.accept}
          onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)}
        />
      </label>

      <button type="button" className="release-upload-button" disabled={!file || (usesDraftRelease && !draft)} onClick={handleUpload}>
        Request Upload Intent
      </button>
      <p className="release-upload-status">{status}</p>
    </div>
  );
}
