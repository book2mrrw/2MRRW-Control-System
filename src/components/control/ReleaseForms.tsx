"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { compositionTypes, contributionTypes, genreTaxonomy, lyricLanguages } from "@/server/release-management/taxonomies";
import type { ReleaseManagementDraft, ReleaseManagementTrack } from "@/server/release-management/releaseManagementService";

type ApiState = { busy: boolean; message: string };

async function readPayload(response: Response) {
  return response.json().catch(() => null);
}

export function CreateReleaseDraftForm() {
  const router = useRouter();
  const [state, setState] = useState<ApiState>({ busy: false, message: "Create a backend draft, then continue through route-backed workflow steps." });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState({ busy: true, message: "Creating release draft through /api/admin/releases/manage..." });
    const response = await fetch("/api/admin/releases/manage", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin": "true" },
      body: JSON.stringify({
        releaseType: form.get("releaseType"),
        title: form.get("title"),
        artistName: form.get("artistName"),
        trackCount: Number(form.get("trackCount") || 1)
      })
    });
    const payload = await readPayload(response);
    if (!response.ok || !payload?.data?.id) {
      setState({ busy: false, message: payload?.error?.message || "Draft creation failed." });
      return;
    }
    router.push(`/releases/${payload.data.id}`);
    router.refresh();
  }

  return (
    <form className="control-form" onSubmit={submit}>
      <label>
        Release type
        <select name="releaseType" defaultValue="single">
          <option value="single">Single</option>
          <option value="ep">EP</option>
          <option value="album">Album</option>
        </select>
      </label>
      <label>
        Working title
        <input name="title" placeholder="Release title" required />
      </label>
      <label>
        Artist name
        <input name="artistName" placeholder="2MRRW" />
      </label>
      <label>
        Track count
        <input min="1" name="trackCount" type="number" defaultValue="1" />
      </label>
      <button className="control-button" disabled={state.busy} type="submit">
        Create Draft
      </button>
      <p className="form-status">{state.message}</p>
    </form>
  );
}

export function ReleaseMetadataForm({ draft }: { draft: ReleaseManagementDraft }) {
  const router = useRouter();
  const [state, setState] = useState<ApiState>({ busy: false, message: "Changes patch the existing release metadata API." });
  const primaryGenre = genreTaxonomy[0];
  const primarySubgenre = primaryGenre?.subgenres[0];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState({ busy: true, message: "Saving basic release information..." });
    const response = await fetch(`/api/admin/releases/manage/${draft.id}/metadata`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin": "true" },
      body: JSON.stringify({
        title: form.get("title"),
        language: form.get("language"),
        recordLabel: form.get("recordLabel"),
        copyrightOwner: form.get("copyrightOwner"),
        upc: form.get("upc"),
        scheduledPublishAt: form.get("scheduledPublishAt"),
        primaryGenre: {
          category: form.get("genreCategory") || primaryGenre?.category,
          subgenre: form.get("subgenre") || primarySubgenre?.value
        },
        famousArtistReferences: String(form.get("artistReferences") || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      })
    });
    const payload = await readPayload(response);
    setState({ busy: false, message: response.ok ? "Metadata saved. Continue to track information." : payload?.error?.message || "Metadata save failed." });
    router.refresh();
  }

  return (
    <form className="control-form" onSubmit={submit}>
      <label>
        Release title
        <input name="title" defaultValue={draft.title} required />
      </label>
      <label>
        Language
        <select name="language" defaultValue={draft.language}>
          {lyricLanguages.map((language) => (
            <option key={language.code} value={language.code}>
              {language.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Record label
        <input name="recordLabel" defaultValue={draft.recordLabel} placeholder="Label or independent" />
      </label>
      <label>
        Copyright owner
        <input name="copyrightOwner" defaultValue={draft.copyrightOwner} placeholder="2MRRW" required />
      </label>
      <label>
        UPC
        <input name="upc" defaultValue={draft.upc} placeholder={draft.internalUpc} />
      </label>
      <label>
        Scheduled publish date
        <input name="scheduledPublishAt" type="datetime-local" />
      </label>
      <label>
        Primary genre
        <select name="genreCategory" defaultValue={draft.primaryGenre?.category ?? primaryGenre?.category}>
          {genreTaxonomy.map((genre) => (
            <option key={genre.category} value={genre.category}>
              {genre.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Subgenre
        <select name="subgenre" defaultValue={draft.primaryGenre?.subgenre ?? primarySubgenre?.value}>
          {genreTaxonomy.flatMap((genre) =>
            genre.subgenres.map((subgenre) => (
              <option key={subgenre.value} value={subgenre.value}>
                {subgenre.label}
              </option>
            ))
          )}
        </select>
      </label>
      <label className="span-2">
        Famous artist references, max 3
        <input name="artistReferences" defaultValue={draft.famousArtistReferences.join(", ")} placeholder="Reference one, reference two" />
      </label>
      <button className="control-button" disabled={state.busy} type="submit">
        Save Basic Info
      </button>
      <p className="form-status">{state.message}</p>
    </form>
  );
}

export function TrackInformationForm({ releaseId, track }: { releaseId: string; track: ReleaseManagementTrack }) {
  const router = useRouter();
  const [state, setState] = useState<ApiState>({ busy: false, message: "Track updates persist through the release-management track API." });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState({ busy: true, message: "Saving track information..." });
    const response = await fetch(`/api/admin/releases/manage/${releaseId}/tracks/${track.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin": "true" },
      body: JSON.stringify({
        title: form.get("title"),
        explicit: form.get("explicit") === "on",
        lyricsLanguage: form.get("lyricsLanguage"),
        isLiveVersion: form.get("isLiveVersion") === "on",
        compositionType: form.get("compositionType"),
        manualIsrc: form.get("manualIsrc"),
        producerNames: String(form.get("producerNames") || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        partnerPlatformIds: {
          spotify: String(form.get("spotifyId") || ""),
          appleMusic: String(form.get("appleMusicId") || "")
        }
      })
    });
    const payload = await readPayload(response);
    setState({ busy: false, message: response.ok ? "Track information saved." : payload?.error?.message || "Track save failed." });
    router.refresh();
  }

  return (
    <form className="control-form" onSubmit={submit}>
      <label>
        Track title
        <input name="title" defaultValue={track.title} required />
      </label>
      <label>
        Language
        <select name="lyricsLanguage" defaultValue={track.lyricsLanguage ?? "en"}>
          {lyricLanguages.map((language) => (
            <option key={language.code} value={language.code}>
              {language.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Composition type
        <select name="compositionType" defaultValue={track.compositionType}>
          {compositionTypes.map((type) => (
            <option key={type} value={type}>
              {type.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </label>
      <label>
        Manual ISRC
        <input name="manualIsrc" defaultValue={track.manualIsrc} placeholder="US-XXX-26-00001" />
      </label>
      <label>
        Spotify track ID
        <input name="spotifyId" defaultValue={track.partnerPlatformIds.spotify} />
      </label>
      <label>
        Apple Music track ID
        <input name="appleMusicId" defaultValue={track.partnerPlatformIds.appleMusic} />
      </label>
      <label className="checkbox-row">
        <input name="explicit" type="checkbox" defaultChecked={track.explicit} />
        Parental advisory / explicit
      </label>
      <label className="checkbox-row">
        <input name="isLiveVersion" type="checkbox" defaultChecked={track.isLiveVersion} />
        Live version
      </label>
      <label className="span-2">
        Collaborators / producers
        <input name="producerNames" defaultValue={track.producerNames.join(", ")} placeholder="Producer One, Featured Artist" />
      </label>
      <button className="control-button" disabled={state.busy} type="submit">
        Save Track Information
      </button>
      <p className="form-status">{state.message}</p>
    </form>
  );
}

export function SongwriterContributionForm({ draft }: { draft: ReleaseManagementDraft }) {
  const router = useRouter();
  const [state, setState] = useState<ApiState>({
    busy: false,
    message: "Publishing split validation requires every non-producer row to total exactly 100% per track."
  });
  const firstTrack = draft.tracks[0];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState({ busy: true, message: "Adding songwriter contribution..." });
    const response = await fetch(`/api/admin/releases/manage/${draft.id}/contributions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin": "true" },
      body: JSON.stringify({
        trackId: form.get("trackId"),
        contributorName: form.get("contributorName"),
        contributionType: form.get("contributionType"),
        isPublisher: form.get("isPublisher") === "on",
        ownershipSplit: Number(form.get("ownershipSplit")),
        publisherName: form.get("publisherName")
      })
    });
    const payload = await readPayload(response);
    setState({ busy: false, message: response.ok ? "Contribution row attached. Re-run review gates before publish." : payload?.error?.message || "Contribution rejected." });
    router.refresh();
  }

  return (
    <form className="control-form" onSubmit={submit}>
      <label>
        Track
        <select name="trackId" defaultValue={firstTrack?.id}>
          {draft.tracks.map((track) => (
            <option key={track.id} value={track.id}>
              {track.position}. {track.title}
            </option>
          ))}
        </select>
      </label>
      <label>
        Songwriter / contributor
        <input name="contributorName" placeholder="Legal writer name" required />
      </label>
      <label>
        Contribution type
        <select name="contributionType" defaultValue="both">
          {contributionTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>
      <label>
        Ownership split %
        <input name="ownershipSplit" min="0" max="100" step="0.001" type="number" required />
      </label>
      <label>
        Publisher name
        <input name="publisherName" placeholder="Publisher or self-published" />
      </label>
      <label className="checkbox-row">
        <input name="isPublisher" type="checkbox" />
        Publisher-controlled row
      </label>
      <button className="control-button" disabled={state.busy || !firstTrack} type="submit">
        Add To Track
      </button>
      <p className="form-status">{state.message}</p>
    </form>
  );
}
