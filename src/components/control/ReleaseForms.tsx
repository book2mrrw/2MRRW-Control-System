"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { contributorRoleGroups, genreTaxonomy, lyricLanguages } from "@/server/release-management/taxonomies";
import { TypeaheadField, type TypeaheadOption } from "@/components/control/TypeaheadField";
import type { ReleaseManagementDraft, ReleaseManagementTrack } from "@/server/release-management/releaseManagementService";
import type { ContributorDirectoryProfile, MetadataSuggestion } from "@/server/release-management/contributorDirectoryService";

type ApiState = { busy: boolean; message: string };

const releaseTypeOptions = [
  {
    value: "single",
    label: "Single",
    icon: "Music",
    detail: "1 track release",
    defaultTrackCount: 1
  },
  {
    value: "ep",
    label: "EP",
    icon: "Layers",
    detail: "2-6 tracks",
    defaultTrackCount: 0
  },
  {
    value: "album",
    label: "Album",
    icon: "Album",
    detail: "7+ tracks",
    defaultTrackCount: 0
  },
  {
    value: "deluxe",
    label: "Deluxe Album",
    icon: "Sparkles",
    detail: "Album with bonus tracks",
    defaultTrackCount: 0
  }
] as const;

function contributorOptions(profiles: ContributorDirectoryProfile[]): TypeaheadOption[] {
  return profiles.map((profile) => ({
    value: profile.displayName,
    detail: `${profile.kind.replaceAll("_", " ")} / ${profile.roles.join(", ").replaceAll("_", " ")}`,
    usageCount: profile.usageCount,
    lastUsedAt: profile.lastUsedAt
  }));
}

function metadataOptions(suggestions: MetadataSuggestion[], kind: MetadataSuggestion["kind"]): TypeaheadOption[] {
  return suggestions.filter((suggestion) => suggestion.kind === kind).map((suggestion) => ({
    value: suggestion.value,
    detail: suggestion.kind.replaceAll("_", " "),
    usageCount: suggestion.usageCount,
    lastUsedAt: suggestion.lastUsedAt
  }));
}

function taxonomyOptions(items: ReadonlyArray<{ label: string; value?: string; code?: string; category?: string }>): TypeaheadOption[] {
  return items.map((item) => ({ value: item.value ?? item.code ?? item.category ?? item.label, label: item.label, detail: "Saved taxonomy" }));
}

async function readPayload(response: Response) {
  return response.json().catch(() => null);
}

export function CreateReleaseDraftForm() {
  const router = useRouter();
  const [releaseType, setReleaseType] = useState<(typeof releaseTypeOptions)[number]["value"]>("single");
  const selectedRelease = releaseTypeOptions.find((option) => option.value === releaseType) ?? releaseTypeOptions[0];
  const [state, setState] = useState<ApiState>({
    busy: false,
    message: "Choose one release type to begin the sequential release workflow."
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ busy: true, message: "Creating your release draft..." });
    const response = await fetch("/api/admin/releases/manage", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin": "true" },
      body: JSON.stringify({
        releaseType,
        trackCount: selectedRelease.defaultTrackCount
      })
    });
    const payload = await readPayload(response);
    if (!response.ok || !payload?.data?.id) {
      setState({ busy: false, message: payload?.error?.message || "Could not create this release." });
      return;
    }
    router.push("/releases/new/details");
    router.refresh();
  }

  return (
    <form className="control-form" onSubmit={submit}>
      <div className="span-2 release-type-picker" role="radiogroup" aria-label="Release type">
        {releaseTypeOptions.map((option) => (
          <label className={`release-type-card ${releaseType === option.value ? "is-selected" : ""}`} key={option.value}>
            <input
              checked={releaseType === option.value}
              name="releaseType"
              onChange={() => setReleaseType(option.value)}
              type="radio"
              value={option.value}
            />
            <span className="release-type-icon" aria-hidden="true">{option.icon}</span>
            <strong>{option.label}</strong>
            <span>{option.detail}</span>
          </label>
        ))}
      </div>
      <div className="span-2 workflow-note-card">
        <p className="meta-label">Release type rules</p>
        <strong>Single = 1 track. EP = 2-6 tracks. Album = 7+ tracks. Add EP and album tracks manually.</strong>
        <span>Progress persists as a draft after creation; continue on any screen size.</span>
      </div>
      <button className="control-button" disabled={state.busy} type="submit">
        Save & Continue
      </button>
      <p className="form-status">{state.message}</p>
    </form>
  );
}

export function AddTrackButton({ releaseId, disabled = false }: { releaseId: string; disabled?: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<ApiState>({ busy: false, message: "" });

  async function addTrack() {
    setState({ busy: true, message: "Adding track..." });
    const response = await fetch(`/api/admin/releases/manage/${releaseId}/tracks`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin": "true" }
    });
    const payload = await readPayload(response);
    setState({ busy: false, message: response.ok ? "" : payload?.error?.message || "Track could not be added." });
    router.refresh();
  }

  return (
    <>
      <button className="control-button secondary" disabled={disabled || state.busy} onClick={addTrack} type="button">
        Add Track
      </button>
      {state.message ? <p className="form-status">{state.message}</p> : null}
    </>
  );
}

export function ReleaseMetadataForm({
  draft,
  contributorProfiles = [],
  metadataSuggestions = []
}: {
  draft: ReleaseManagementDraft;
  contributorProfiles?: ContributorDirectoryProfile[];
  metadataSuggestions?: MetadataSuggestion[];
}) {
  const router = useRouter();
  const [state, setState] = useState<ApiState>({ busy: false, message: "Details autosave through the release metadata service when you save." });
  const primaryGenre = genreTaxonomy[0];
  const primarySubgenre = primaryGenre?.subgenres[0];
  const savedContributors = contributorOptions(contributorProfiles);
  const genreOptions = taxonomyOptions(genreTaxonomy);
  const subgenreOptions = taxonomyOptions(
    genreTaxonomy.reduce<Array<{ label: string; value: string }>>((rows, genre) => {
      rows.push(...genre.subgenres.map((subgenre) => ({ label: subgenre.label, value: subgenre.value })));
      return rows;
    }, [])
  );
  const languageOptions = taxonomyOptions(lyricLanguages);
  const catalogDate = draft.originalReleaseDate ?? draft.scheduledPublishAt?.slice(0, 10) ?? "";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState({ busy: true, message: "Saving release details..." });
    const response = await fetch(`/api/admin/releases/manage/${draft.id}/metadata`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin": "true" },
      body: JSON.stringify({
        title: form.get("title"),
        language: form.get("language"),
        recordLabel: form.get("recordLabelAdvanced") || form.get("recordLabel"),
        copyrightOwner: form.get("copyrightOwnerAdvanced") || form.get("copyrightOwner"),
        upc: form.get("upc"),
        originalReleaseDate: String(form.get("originalReleaseDate") || "") || undefined,
        publisherName: form.get("publisherNameAdvanced") || form.get("publisherName"),
        recordingLocation: form.get("recordingLocation"),
        catalogNumber: form.get("catalogNumber"),
        metadataNotes: form.get("metadataNotes"),
        primaryGenre: {
          category: form.get("genreCategory") || primaryGenre?.category,
          subgenre: form.get("subgenre") || primarySubgenre?.value
        },
        secondaryGenre: {
          category: form.get("secondaryGenreCategory") || primaryGenre?.category,
          subgenre: form.get("secondarySubgenre") || primarySubgenre?.value
        },
        famousArtistReferences: String(form.get("artistReferences") || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        priceInCents: (() => {
          const raw = String(form.get("priceInCents") || "").trim();
          if (!raw) return null;
          const parsed = Number.parseInt(raw, 10);
          return Number.isFinite(parsed) ? parsed : null;
        })(),
        pricingTier: (form.get("pricingTier") as "single" | "ep" | "album" | null) || null,
        giftingEnabled: form.get("giftingEnabled") === "on",
        deluxePriceInCents: (() => {
          const raw = String(form.get("deluxePriceInCents") || "").trim();
          if (!raw) return null;
          const parsed = Number.parseInt(raw, 10);
          return Number.isFinite(parsed) ? parsed : null;
        })(),
        bundlePriceInCents: (() => {
          const raw = String(form.get("bundlePriceInCents") || "").trim();
          if (!raw) return null;
          const parsed = Number.parseInt(raw, 10);
          return Number.isFinite(parsed) ? parsed : null;
        })()
      })
    });
    const payload = await readPayload(response);
    setState({ busy: false, message: response.ok ? "Release details saved. Continue to tracks." : payload?.error?.message || "Release details could not be saved." });
    router.refresh();
  }

  return (
    <form className="control-form" onSubmit={submit}>
      <fieldset className="span-2 form-fieldset essential-fields">
        <legend>Essential Details</legend>
        <label>
          Release Title
          <input name="title" defaultValue={draft.title} required />
        </label>
        <TypeaheadField label="Main Artist Search/Add" defaultValue={draft.artistName} options={savedContributors} readOnly />
        <label>
          Catalog release date
          <input name="originalReleaseDate" type="date" defaultValue={catalogDate} />
        </label>
        <p className="input-hint span-2">
          Global drop scheduling (month/day/year, AM/PM, timezone) lives on the Review step and{" "}
          <a href="/releases/new/scheduler">scheduler page</a>.
        </p>
        <TypeaheadField name="language" label="Language" defaultValue={draft.language} options={languageOptions} emptyLabel="No language found. Create a language note." createLabel="+ Create Language" />
        <TypeaheadField name="genreCategory" label="Primary Genre" defaultValue={draft.primaryGenre?.category ?? primaryGenre?.category} options={genreOptions} emptyLabel="No genre found. Choose or create a genre tag." createLabel="+ Create New Genre" />
        <TypeaheadField name="subgenre" label="Primary Subgenre" defaultValue={draft.primaryGenre?.subgenre ?? primarySubgenre?.value} options={subgenreOptions} emptyLabel="No subgenre found. Create a metadata tag." createLabel="+ Create New Subgenre" />
        <TypeaheadField name="secondaryGenreCategory" label="Secondary Genre" defaultValue={draft.secondaryGenre?.category ?? "r-and-b-soul"} options={genreOptions} emptyLabel="No genre found. Choose or create a genre tag." createLabel="+ Create New Genre" />
      </fieldset>
      <div className="span-2 autosave-contract-card">
        <p className="meta-label">Collaborator memory</p>
        <strong>Artists, featured artists, producers, engineers, writers, designers, labels, and publishers are remembered for autosuggest.</strong>
      </div>
      <fieldset className="span-2 form-fieldset is-collapsible">
        <legend>Optional metadata</legend>
        <details className="span-2" open={false}>
          <summary>Show scheduling, collaborator memory, label, ownership, and notes</summary>
          <div className="advanced-grid">
            <label>
              Version / subtitle
              <input placeholder="Deluxe, Remastered, Live, Acoustic" />
            </label>
            <TypeaheadField name="secondarySubgenre" label="Secondary subgenre" defaultValue={draft.secondaryGenre?.subgenre ?? "alternative-r-and-b"} options={subgenreOptions} emptyLabel="No subgenre found. Create a metadata tag." createLabel="+ Create New Subgenre" />
            <label>
              Release time
              <input type="time" />
            </label>
            <label>
              Timezone
              <select defaultValue="America/New_York">
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="UTC">UTC</option>
              </select>
            </label>
            <TypeaheadField name="recordLabel" label="Record label" defaultValue={draft.recordLabel} options={metadataOptions(metadataSuggestions, "label")} placeholder="Label or independent" emptyLabel="No labels found. Create a new label." createLabel="+ Create New Label" />
            <TypeaheadField name="copyrightOwner" label="Copyright" defaultValue={draft.copyrightOwner} options={metadataOptions(metadataSuggestions, "copyright_owner")} placeholder="2MRRW" emptyLabel="No copyright owners found. Create a saved owner." createLabel="+ Create Copyright Owner" />
            <TypeaheadField name="publisherName" label="Publishing" defaultValue={draft.publisherName} options={metadataOptions(metadataSuggestions, "publisher")} placeholder="Publisher or self-published" emptyLabel="No publishers found. Create a new publisher." createLabel="+ Create Publisher" />
            <TypeaheadField name="artistReferences" label="Featured Artists" defaultValue={draft.famousArtistReferences.join(", ")} options={savedContributors} placeholder="Featured Artist, Guest Vocalist" />
            <TypeaheadField name="recordLabelAdvanced" label="Label Name" defaultValue={draft.recordLabel} options={metadataOptions(metadataSuggestions, "label")} placeholder="2MRRW" emptyLabel="No labels found. Create a new label." createLabel="+ Create New Label" />
            <TypeaheadField name="recordingLocation" label="Recording Location" defaultValue={draft.recordingLocation} options={metadataOptions(metadataSuggestions, "recording_location")} placeholder="City, studio, or room" emptyLabel="No locations found. Create a recording location." createLabel="+ Create Location" />
            <TypeaheadField name="copyrightOwnerAdvanced" label="Copyright" defaultValue={draft.copyrightOwner} options={metadataOptions(metadataSuggestions, "copyright_owner")} placeholder="2MRRW" emptyLabel="No copyright owners found. Create a saved owner." createLabel="+ Create Copyright Owner" />
            <TypeaheadField name="publisherNameAdvanced" label="Publishing" defaultValue={draft.publisherName} options={metadataOptions(metadataSuggestions, "publisher")} placeholder="2MRRW Publishing" emptyLabel="No publishers found. Create a new publisher." createLabel="+ Create Publisher" />
            <label>
              Original Release Date
              <input name="originalReleaseDate" defaultValue={draft.originalReleaseDate} type="date" />
            </label>
            <label>
              Catalog Number
              <input name="catalogNumber" defaultValue={draft.catalogNumber} placeholder="2MRRW-001" />
            </label>
            <label>
              UPC
              <input name="upc" defaultValue={draft.upc} placeholder={draft.internalUpc} />
            </label>
            <label>
              Mood
              <input placeholder="Cinematic, nocturnal, high-energy" />
            </label>
            <label className="checkbox-row">
              <input type="checkbox" />
              Explicit release
            </label>
            <label className="checkbox-row">
              <input type="checkbox" />
              Instrumental
            </label>
            <label className="checkbox-row">
              <input type="checkbox" />
              Previously released
            </label>
            <label className="span-2">
              Metadata Notes
              <textarea name="metadataNotes" defaultValue={draft.metadataNotes} placeholder="Internal notes for credits, publishing, release context, or frontend credit population." rows={4} />
            </label>
            <label className="span-2">
              Release Description
              <textarea placeholder="Short release description for 2MRRW announcements, storefront pages, and vault context." rows={4} />
            </label>
          </div>
        </details>
      </fieldset>
      <fieldset className="span-2 form-fieldset">
        <legend>Storefront pricing</legend>
        <p className="input-hint span-2">
          Single: 299–799¢ · EP/Album: 799–5000¢. Syncs to catalog product on publish.
        </p>
        <label>
          Price (cents)
          <input
            name="priceInCents"
            type="number"
            min={0}
            step={1}
            defaultValue={draft.priceInCents ?? ""}
            placeholder="499"
          />
        </label>
        <label>
          Pricing tier
          <select name="pricingTier" defaultValue={draft.pricingTier ?? (draft.releaseType === "single" ? "single" : draft.releaseType === "ep" ? "ep" : "album")}>
            <option value="single">Single</option>
            <option value="ep">EP</option>
            <option value="album">Album</option>
          </select>
        </label>
        <label className="checkbox-row span-2">
          <input name="giftingEnabled" type="checkbox" defaultChecked={draft.giftingEnabled} />
          Enable purchase-to-gift on storefront
        </label>
        <label>
          Deluxe price (cents, optional)
          <input name="deluxePriceInCents" type="number" min={0} defaultValue={draft.deluxePriceInCents ?? ""} />
        </label>
        <label>
          Bundle price (cents, optional)
          <input name="bundlePriceInCents" type="number" min={0} defaultValue={draft.bundlePriceInCents ?? ""} />
        </label>
      </fieldset>
      <button className="control-button" disabled={state.busy} type="submit">
        Save & Continue
      </button>
      <p className="form-status">{state.message}</p>
    </form>
  );
}

export function TrackInformationForm({
  releaseId,
  track,
  contributorProfiles = []
}: {
  releaseId: string;
  track: ReleaseManagementTrack;
  contributorProfiles?: ContributorDirectoryProfile[];
}) {
  const router = useRouter();
  const [state, setState] = useState<ApiState>({ busy: false, message: "Track details persist to this draft when saved." });
  const savedContributors = contributorOptions(contributorProfiles);

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
        Version
        <input placeholder="Original, Remix, Live, Acoustic" />
      </label>
      <label>
        Manual ISRC
        <input name="manualIsrc" defaultValue={track.manualIsrc} placeholder="US-XXX-26-00001" />
      </label>
      <label>
        Preview start
        <input placeholder="0:30" />
      </label>
      <label>
        BPM
        <input min="1" type="number" placeholder="120" />
      </label>
      <label>
        Key
        <input placeholder="A minor" />
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
        Genre
        <select defaultValue={genreTaxonomy[0]?.category}>
          {genreTaxonomy.map((genre) => (
            <option key={genre.category} value={genre.category}>
              {genre.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Subgenre
        <select defaultValue={genreTaxonomy[0]?.subgenres[0]?.value}>
          {genreTaxonomy.flatMap((genre) =>
            genre.subgenres.map((subgenre) => (
              <option key={subgenre.value} value={subgenre.value}>
                {subgenre.label}
              </option>
            ))
          )}
        </select>
      </label>
      <label>
        Mood
        <input placeholder="Cinematic, high-energy, reflective" />
      </label>
      <TypeaheadField name="producerNames" label="Producers / engineers / collaborators" defaultValue={track.producerNames.join(", ")} options={savedContributors} placeholder="Producer, engineer, designer, collaborator" />
      <label>
        Track sequence number
        <input min="1" type="number" defaultValue={track.position} />
      </label>
      <label className="checkbox-row">
        <input name="explicit" type="checkbox" defaultChecked={track.explicit} />
        Explicit lyrics
      </label>
      <label className="checkbox-row">
        <input type="checkbox" defaultChecked={track.lyricsState !== "not_required"} />
        Lyrics included
      </label>
      <label className="checkbox-row">
        <input name="isLiveVersion" type="checkbox" defaultChecked={track.isLiveVersion} />
        Live version
      </label>
      <label className="checkbox-row">
        <input type="checkbox" />
        Remix
      </label>
      <label className="checkbox-row">
        <input type="checkbox" />
        Cover song
      </label>
      <label className="checkbox-row">
        <input type="checkbox" />
        Dolby Atmos
      </label>
      <div className="span-2 inline-action-row" aria-label="Track arrangement actions">
        <button className="control-button secondary" type="button">Move Up</button>
        <button className="control-button secondary" type="button">Move Down</button>
        <button className="control-button secondary" type="button">Duplicate Track</button>
        <button className="control-button secondary" type="button">Remove Track</button>
      </div>
      <button className="control-button" disabled={state.busy} type="submit">
        Save Track
      </button>
      <p className="form-status">{state.message}</p>
    </form>
  );
}

export function SongwriterContributionForm({
  draft,
  contributorProfiles = []
}: {
  draft: ReleaseManagementDraft;
  contributorProfiles?: ContributorDirectoryProfile[];
}) {
  const router = useRouter();
  const [state, setState] = useState<ApiState>({
    busy: false,
    message: "You still need 100% remaining before continuing."
  });
  const firstTrack = draft.tracks[0];
  const savedContributors = contributorOptions(contributorProfiles);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState({ busy: true, message: "Adding contributor split..." });
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
    setState({ busy: false, message: response.ok ? "Contributor splits are complete when the total reaches 100%." : payload?.error?.message || "Contributor could not be added." });
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
      <TypeaheadField name="contributorName" label="Name" options={savedContributors} placeholder="Search saved credits, e.g. 2MRRW" emptyLabel="No collaborators found. Create a new contributor." createLabel="+ Create New Contributor" required />
      <label>
        Role
        <select name="contributionType" defaultValue="songwriter">
          {contributorRoleGroups.map((group) => (
            <optgroup key={group.category} label={group.label}>
              {group.roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <label>
        Royalty %
        <input name="ownershipSplit" min="0" max="100" step="0.001" type="number" required />
      </label>
      <label>
        Publishing %
        <input min="0" max="100" step="0.001" type="number" placeholder="Optional" />
      </label>
      <label>
        Publisher optional
        <input name="publisherName" placeholder="Publisher or self-published" />
      </label>
      <label className="checkbox-row">
        <input name="isPublisher" type="checkbox" />
        Publisher controlled
      </label>
      <button className="control-button" disabled={state.busy || !firstTrack} type="submit">
        + Add Contributor
      </button>
      <p className="form-status">{state.message}</p>
    </form>
  );
}

export function LyricsEditorForm({ draft }: { draft: ReleaseManagementDraft }) {
  const [selectedTrackId, setSelectedTrackId] = useState(draft.tracks[0]?.id ?? "");
  const [lyrics, setLyrics] = useState("");
  const selectedTrack = draft.tracks.find((track) => track.id === selectedTrackId);
  const [message, setMessage] = useState("Lyrics autosave while you write.");

  function updateLyrics(value: string) {
    setLyrics(value);
    setMessage("Lyrics autosaved in this session.");
  }

  return (
    <form className="control-form">
      <label>
        Track
        <select value={selectedTrackId} onChange={(event) => setSelectedTrackId(event.target.value)}>
          {draft.tracks.map((track) => (
            <option key={track.id} value={track.id}>
              {track.position}. {track.title}
            </option>
          ))}
        </select>
      </label>
      <label className="checkbox-row">
        <input type="checkbox" defaultChecked={selectedTrack?.explicit} />
        Lyrics include explicit language
      </label>
      <label className="checkbox-row">
        <input type="checkbox" />
        Clean version available
      </label>
      <label>
        Language
        <select defaultValue="en">
          {lyricLanguages.map((language) => (
            <option key={language.code} value={language.code}>
              {language.label}
            </option>
          ))}
        </select>
      </label>
      <label className="span-2">
        Lyrics editor
        <textarea
          name="lyrics"
          onChange={(event) => updateLyrics(event.target.value)}
          placeholder="Paste or write lyrics here..."
          rows={12}
          value={lyrics}
        />
      </label>
      <label className="checkbox-row">
        <input type="checkbox" />
        Prepare synced lyrics
      </label>
      <label>
        Sync timing notes
        <input placeholder="Verse starts at 0:12, hook at 0:45" />
      </label>
      <p className="form-status">{message}</p>
    </form>
  );
}
