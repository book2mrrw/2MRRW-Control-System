import type { ContributionType } from "@/server/release-management/taxonomies";

export type ContributorDirectoryKind =
  | "artist"
  | "featured_artist"
  | "producer"
  | "engineer"
  | "songwriter"
  | "collaborator"
  | "label"
  | "copyright_owner"
  | "publisher"
  | "creative";

export type ContributorDirectoryProfile = {
  id: string;
  displayName: string;
  legalName?: string;
  kind: ContributorDirectoryKind;
  roles: ContributionType[];
  aliases: string[];
  publisherName?: string;
  labelName?: string;
  copyrightOwner?: string;
  usageCount: number;
  lastUsedAt?: string;
  source: "seed" | "release_metadata" | "track_credit";
  createdAt: string;
  updatedAt: string;
};

export type MetadataSuggestion = {
  id: string;
  kind: "label" | "copyright_owner" | "publisher" | "recording_location" | "metadata_tag" | "vault_section" | "media_category" | "genre" | "language";
  value: string;
  sourceProfileId?: string;
  usageCount: number;
  lastUsedAt?: string;
  updatedAt: string;
};

const contributorProfiles = new Map<string, ContributorDirectoryProfile>();
const metadataSuggestions = new Map<string, MetadataSuggestion>();

function nowIso() {
  return new Date().toISOString();
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function slugify(value: string) {
  return normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "profile";
}

function profileIdFor(displayName: string, kind: ContributorDirectoryKind) {
  return `contrib_${kind}_${slugify(displayName)}`;
}

function suggestionIdFor(kind: MetadataSuggestion["kind"], value: string) {
  return `meta_${kind}_${slugify(value)}`;
}

function inferKind(role: ContributionType): ContributorDirectoryKind {
  if (["main_artist", "primary_artist", "remix_artist", "vocal_performer"].includes(role)) return "artist";
  if (role === "featured_artist") return "featured_artist";
  if (["producer", "co_producer", "executive_producer"].includes(role)) return "producer";
  if (["mixing_engineer", "mastering_engineer", "recording_engineer", "assistant_engineer", "engineer", "vocal_engineer"].includes(role)) return "engineer";
  if (["songwriter", "composer", "lyricist", "music", "lyrics", "both"].includes(role)) return "songwriter";
  if (["graphic_designer", "creative_director", "visual_designer"].includes(role)) return "creative";
  if (role === "label") return "label";
  if (role === "copyright_owner") return "copyright_owner";
  if (role === "publisher") return "publisher";
  return "collaborator";
}

export function rememberMetadataSuggestion(kind: MetadataSuggestion["kind"], value?: string | null, sourceProfileId?: string) {
  const normalized = value?.trim();
  if (!normalized) return null;

  const id = suggestionIdFor(kind, normalized);
  const suggestion: MetadataSuggestion = {
    ...(metadataSuggestions.get(id) ?? { id, kind, value: normalized, usageCount: 0 }),
    value: normalized,
    sourceProfileId,
    usageCount: (metadataSuggestions.get(id)?.usageCount ?? 0) + 1,
    lastUsedAt: nowIso(),
    updatedAt: nowIso()
  };
  metadataSuggestions.set(id, suggestion);
  return suggestion;
}

export function upsertContributorProfile(input: {
  displayName: string;
  legalName?: string;
  kind?: ContributorDirectoryKind;
  roles?: ContributionType[];
  aliases?: string[];
  publisherName?: string;
  labelName?: string;
  copyrightOwner?: string;
  source?: ContributorDirectoryProfile["source"];
}) {
  const displayName = input.displayName.trim();
  if (!displayName) {
    throw new Error("Contributor name is required");
  }

  const roles: ContributionType[] = input.roles?.length ? [...input.roles] : ["collaborator"];
  const kind = input.kind ?? inferKind(roles[0] ?? "collaborator");
  const id = profileIdFor(displayName, kind);
  const existing = contributorProfiles.get(id);
  const timestamp = nowIso();
  const profile: ContributorDirectoryProfile = {
    id,
    displayName,
    legalName: input.legalName?.trim() || existing?.legalName,
    kind,
    roles: [...new Set<ContributionType>([...(existing?.roles ?? []), ...roles])],
    aliases: [...new Set([...(existing?.aliases ?? []), ...(input.aliases ?? [])].map((alias) => alias.trim()).filter(Boolean))],
    publisherName: input.publisherName?.trim() || existing?.publisherName,
    labelName: input.labelName?.trim() || existing?.labelName,
    copyrightOwner: input.copyrightOwner?.trim() || existing?.copyrightOwner,
    usageCount: (existing?.usageCount ?? 0) + 1,
    lastUsedAt: timestamp,
    source: input.source ?? existing?.source ?? "track_credit",
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp
  };

  contributorProfiles.set(id, profile);
  rememberMetadataSuggestion("publisher", profile.publisherName, id);
  rememberMetadataSuggestion("label", profile.labelName, id);
  rememberMetadataSuggestion("copyright_owner", profile.copyrightOwner, id);
  return profile;
}

export function rememberContributorFromCredit(input: {
  contributorName: string;
  contributionType: ContributionType;
  publisherName?: string;
}) {
  return upsertContributorProfile({
    displayName: input.contributorName,
    kind: inferKind(input.contributionType),
    roles: [input.contributionType],
    publisherName: input.publisherName,
    source: "track_credit"
  });
}

export function rememberReleaseMetadata(input: {
  artistName?: string;
  featuredArtists?: string[];
  recordLabel?: string;
  copyrightOwner?: string;
  publisherName?: string;
  recordingLocation?: string;
}) {
  if (input.artistName) {
    upsertContributorProfile({ displayName: input.artistName, kind: "artist", roles: ["main_artist"], source: "release_metadata" });
  }
  input.featuredArtists?.forEach((artist) => {
    upsertContributorProfile({ displayName: artist, kind: "featured_artist", roles: ["featured_artist"], source: "release_metadata" });
  });
  rememberMetadataSuggestion("label", input.recordLabel);
  rememberMetadataSuggestion("copyright_owner", input.copyrightOwner);
  rememberMetadataSuggestion("publisher", input.publisherName);
  rememberMetadataSuggestion("recording_location", input.recordingLocation);
}

export function listContributorProfiles() {
  return [...contributorProfiles.values()].sort((a, b) => {
    const usage = b.usageCount - a.usageCount;
    if (usage !== 0) return usage;
    return (b.lastUsedAt ?? b.updatedAt).localeCompare(a.lastUsedAt ?? a.updatedAt) || a.displayName.localeCompare(b.displayName);
  });
}

export function searchContributorProfiles(query = "") {
  const normalized = normalize(query);
  if (!normalized) return listContributorProfiles();

  return listContributorProfiles().filter((profile) => {
    const haystack = [profile.displayName, profile.legalName, ...profile.aliases, ...profile.roles].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(normalized);
  });
}

export function listMetadataSuggestions(kind?: MetadataSuggestion["kind"]) {
  return [...metadataSuggestions.values()]
    .filter((suggestion) => !kind || suggestion.kind === kind)
    .sort((a, b) => {
      const usage = b.usageCount - a.usageCount;
      if (usage !== 0) return usage;
      return (b.lastUsedAt ?? b.updatedAt).localeCompare(a.lastUsedAt ?? a.updatedAt) || a.value.localeCompare(b.value);
    });
}

export function createOrSelectContributor(input: {
  displayName: string;
  role?: ContributionType;
  kind?: ContributorDirectoryKind;
  publisherName?: string;
}) {
  const role = input.role ?? "collaborator";
  const exact = searchContributorProfiles(input.displayName).find((profile) => normalize(profile.displayName) === normalize(input.displayName));
  if (exact) {
    return upsertContributorProfile({
      displayName: exact.displayName,
      kind: exact.kind,
      roles: [role],
      publisherName: input.publisherName ?? exact.publisherName,
      source: exact.source
    });
  }

  return upsertContributorProfile({
    displayName: input.displayName,
    kind: input.kind ?? inferKind(role),
    roles: [role],
    publisherName: input.publisherName,
    source: "track_credit"
  });
}

export function getPreviousReleaseSettingsSuggestion() {
  const [label] = listMetadataSuggestions("label");
  const [copyrightOwner] = listMetadataSuggestions("copyright_owner");
  const [publisher] = listMetadataSuggestions("publisher");
  const [recordingLocation] = listMetadataSuggestions("recording_location");
  if (!label && !copyrightOwner && !publisher && !recordingLocation) return null;

  return {
    prompt: "Use previous release settings?",
    label: label?.value,
    copyrightOwner: copyrightOwner?.value,
    publisherName: publisher?.value,
    recordingLocation: recordingLocation?.value
  };
}

upsertContributorProfile({
  displayName: "2MRRW",
  kind: "artist",
  roles: ["main_artist", "primary_artist", "producer", "songwriter", "creative_director"],
  aliases: ["Eellian Morrow"],
  labelName: "2MRRW",
  copyrightOwner: "2MRRW",
  publisherName: "2MRRW Publishing",
  source: "seed"
});

upsertContributorProfile({
  displayName: "2MRRW Studios",
  kind: "creative",
  roles: ["visual_designer", "graphic_designer"],
  aliases: ["2MRRW Creative"],
  source: "seed"
});
