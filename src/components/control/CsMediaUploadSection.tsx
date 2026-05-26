"use client";

import { useEffect, useMemo, useState } from "react";
import { MediaUploadPanel } from "@/components/control/MediaUploadPanel";
import { getPublicR2Url } from "@/lib/storage/r2";
import { isCoverVideoPath } from "@/lib/media/coverArt";

type DraftTrack = { id: string; title: string; position: number };
type Draft = { id: string; title: string; tracks: DraftTrack[] };

const csCoverAccept = "image/*,video/mp4,.mp4,video/mp4,image/jpeg,image/png,image/webp";
const csAudioAccept = "audio/*,.mp3,.wav,.aiff,.flac,.aac,.m4a";

function formatDuration(seconds?: number | null) {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return null;
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function fileNameFromPath(path?: string | null) {
  if (!path) return null;
  return path.split("/").pop() ?? path;
}

export function CsMediaUploadSection({
  draft,
  trackId,
  csCover,
  csCoverType,
  csAudio,
  audioDurationSeconds,
  onUploadComplete
}: {
  draft: Draft;
  trackId: string;
  csCover?: string | null;
  csCoverType?: "image" | "video";
  csAudio?: string | null;
  audioDurationSeconds?: number | null;
  onUploadComplete?: () => void;
}) {
  const trackDraft = useMemo(
    () => ({
      ...draft,
      tracks: draft.tracks.filter((track) => track.id === trackId)
    }),
    [draft, trackId]
  );
  const hasPersistedCs = Boolean(csCover || csAudio);
  const [enabled, setEnabled] = useState(hasPersistedCs);

  useEffect(() => {
    if (hasPersistedCs) setEnabled(true);
  }, [hasPersistedCs]);

  const csCoverUrl = csCover ? getPublicR2Url(csCover) : null;
  const csCoverIsVideo = csCoverType === "video" || (csCover ? isCoverVideoPath(csCover) : false);
  const csAudioLabel = csAudio ? fileNameFromPath(csAudio) : null;
  const csAudioDuration = formatDuration(audioDurationSeconds);

  if (!trackDraft.tracks.length) {
    return (
      <p className="input-hint">Add a track before uploading CS / Slowed media.</p>
    );
  }

  return (
    <section className="media-sync-cs-section">
      <label className="media-sync-cs-toggle">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        <span>This release has a CS/Slowed version</span>
      </label>

      {enabled ? (
        <div className="media-sync-cs-slots">
          <div className="media-sync-asset-panel">
            <div className="media-sync-asset-label">
              <span>CS / SLOWED COVER</span>
              <span className={`media-sync-asset-status${csCover ? " ok" : " miss"}`}>
                {csCover ? "Linked" : "Missing"}
              </span>
            </div>
            {csCoverUrl ? (
              <div className="media-sync-cs-preview">
                {csCoverIsVideo ? (
                  <video src={csCoverUrl} muted playsInline loop autoPlay className="media-sync-cs-preview__media" />
                ) : (
                  <img src={csCoverUrl} alt="CS cover preview" className="media-sync-cs-preview__media" />
                )}
              </div>
            ) : (
              <p className="media-sync-cs-empty">No CS cover</p>
            )}
            <MediaUploadPanel
              draft={trackDraft}
              fixedCategory="cs_cover"
              compact
              studioLayout
              acceptOverride={csCoverAccept}
              onUploadComplete={onUploadComplete}
            />
          </div>

          <div className="media-sync-asset-panel">
            <div className="media-sync-asset-label">
              <span>CS / SLOWED AUDIO</span>
              <span className={`media-sync-asset-status${csAudio ? " ok" : " miss"}`}>
                {csAudio ? "Linked" : "Missing"}
              </span>
            </div>
            {csAudio ? (
              <p className="media-sync-cs-audio-meta">
                {csAudioLabel}
                {csAudioDuration ? ` · ${csAudioDuration}` : ""}
              </p>
            ) : (
              <p className="media-sync-cs-empty">No CS audio</p>
            )}
            <MediaUploadPanel
              draft={trackDraft}
              fixedCategory="cs_audio"
              compact
              studioLayout
              acceptOverride={csAudioAccept}
              onUploadComplete={onUploadComplete}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
