"use client";

import { useMemo, useState, type DragEvent } from "react";

type DraftTrack = { id: string; title: string; position: number };
type Draft = { id: string; title: string; tracks: DraftTrack[] };

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
  { value: "single_cover_art", label: "Single cover art / MP4 cover loop", accept: ".jpg,.jpeg,.png,.gif,.mp4,image/jpeg,image/png,image/gif,video/mp4", ownerField: "releaseId", note: "Static JPG/JPEG/PNG/GIF or animated MP4 only. MOV and SVG are rejected by the upload-intent service." },
  { value: "album_cover_art", label: "Album cover art / MP4 cover loop", accept: ".jpg,.jpeg,.png,.gif,.mp4,image/jpeg,image/png,image/gif,video/mp4", ownerField: "releaseId", note: "Target cover metadata is 3000px square and 60-70MB policy range for release art." },
  { value: "audio_preview", label: "Audio preview", accept: ".mp3,.wav,audio/mpeg,audio/wav,audio/x-wav", ownerField: "trackId", note: "Preview audio accepts MP3/WAV and stays public after confirmation." },
  { value: "audio_full_song", label: "Full song master", accept: ".wav,.mp3,audio/mpeg,audio/wav,audio/x-wav", ownerField: "trackId", note: "Master audio accepts MP3/WAV with 24-bit / 44.1kHz metadata validation tracked by the contract." },
  { value: "lyrics", label: "Lyrics document", accept: ".txt,.pdf,.docx,text/plain,application/pdf", ownerField: "trackId", note: "Lyrics attach to track context and update lyric readiness after confirmed upload." },
  { value: "signal_asset", label: "Signal asset", accept: ".jpg,.jpeg,.png,.gif,.mp4,.wav,.mp3,image/*,video/mp4,audio/*", ownerField: "signalId", note: "Signal assets require an operational signal owner ID." },
  { value: "collector_card_asset", label: "Collector card asset", accept: ".jpg,.jpeg,.png,.gif,.mp4,image/*,video/mp4", ownerField: "collectorId", note: "Collector card uploads are entitlement-scoped after confirmation." },
  { value: "radio_asset", label: "Radio asset", accept: ".jpg,.jpeg,.png,.gif,.mp4,.wav,.mp3,image/*,video/mp4,audio/*", ownerField: "radioId", note: "Radio assets remain independent from Signal suppression state." },
  { value: "vault_asset", label: "Vault asset", accept: ".jpg,.jpeg,.png,.gif,.mp4,.wav,.mp3,.pdf,.docx,image/*,video/mp4,audio/*", ownerField: "vaultContentId", note: "Vault uploads are protected and served through signed media access." }
];

const defaultsByMode: Record<string, UploadCategory> = {
  artwork: "single_cover_art",
  audio: "audio_full_song",
  videos: "signal_asset",
  loops: "collector_card_asset"
};

export function MediaUploadPanel({ draft, mode = "all" }: { draft: Draft | null; mode?: string }) {
  const [category, setCategory] = useState<UploadCategory>(defaultsByMode[mode] ?? "single_cover_art");
  const [trackId, setTrackId] = useState(draft?.tracks[0]?.id ?? "");
  const [externalOwnerId, setExternalOwnerId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("Drop a file or click the upload zone to request a signed upload intent.");
  const selectedOption = useMemo(() => uploadOptions.find((option) => option.value === category), [category]);
  const needsTrack = selectedOption?.ownerField === "trackId";
  const usesDraftRelease = selectedOption?.ownerField === "releaseId" || needsTrack;

  function captureDroppedFile(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setFile(event.dataTransfer.files?.[0] ?? null);
  }

  async function requestUploadIntent() {
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
      setStatus(intentPayload?.error?.message || "Upload intent rejected by policy.");
      return;
    }
    if (intent.mocked) {
      setStatus(`Intent ready for ${intent.path}. Supabase Storage credentials are required before byte upload is attempted.`);
      return;
    }
    setStatus("Uploading bytes directly to protected media storage...");
    const uploadResponse = await fetch(intent.signedUploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file
    });
    if (!uploadResponse.ok) {
      setStatus("Storage upload failed. No completed upload was recorded.");
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
    setStatus(`Upload confirmed and recorded at ${intent.path}.`);
  }

  return (
    <section className="upload-panel">
      <div className="release-upload-controls">
        <label>
          Upload lane
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
            <input value={externalOwnerId} onChange={(event) => setExternalOwnerId(event.target.value)} placeholder={`${selectedOption?.ownerField || "owner"}...`} />
          </label>
        ) : null}
      </div>
      <label className="release-upload-zone" onDragOver={(event) => event.preventDefault()} onDrop={captureDroppedFile}>
        <span>Drag/drop or click to select media</span>
        <strong>{file ? file.name : "No file selected"}</strong>
        <small>{selectedOption?.note}</small>
        <input type="file" accept={selectedOption?.accept} onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)} />
      </label>
      <button className="control-button" disabled={!file || (usesDraftRelease && !draft)} onClick={requestUploadIntent} type="button">
        Request Upload Intent
      </button>
      <p className="form-status">{status}</p>
    </section>
  );
}
