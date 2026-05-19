import { listTrackContributions, type ReleaseManagementDraft } from "@/server/release-management/releaseManagementService";

export type FrontendTrackCreditContract = {
  trackId: string;
  title: string;
  artistName: string;
  previewAudio?: string;
  fullAudio?: string;
  lyrics: string | null;
  producers: string[];
  songwriters: string[];
  contributors: Array<{ name: string; role: string }>;
  fullCredits: {
    engineering: Array<{ name: string; role: string }>;
    creative: Array<{ name: string; role: string }>;
    backgroundVocals: string[];
  };
};

export type FrontendReleaseMetadataContract = {
  releaseId: string;
  slug: string;
  title: string;
  artistName: string;
  releaseType: string;
  releaseDate: string | null;
  permalink: string;
  visibilityState: ReleaseManagementDraft["visibilityState"];
  readiness: ReleaseManagementDraft["contentReadiness"];
  tags: string[];
  language: string;
  genres: {
    primary?: ReleaseManagementDraft["primaryGenre"];
    secondary?: ReleaseManagementDraft["secondaryGenre"];
  };
  credits: {
    artist: string[];
    production: string[];
    writing: string[];
    engineering: string[];
    creative: string[];
  };
  previewLinks: ReleaseManagementDraft["previewLinks"];
  assets: {
    coverArt?: string;
    motionArtwork?: string;
  };
  frontendSyncTargets: string[];
  tracks: FrontendTrackCreditContract[];
};

const writingRoles = new Set(["songwriter", "composer", "lyricist", "music", "lyrics", "both"]);
const productionRoles = new Set(["producer", "co_producer", "executive_producer"]);
const engineeringRoles = new Set(["mixing_engineer", "mastering_engineer", "recording_engineer", "assistant_engineer", "engineer", "vocal_engineer"]);
const creativeRoles = new Set(["graphic_designer", "creative_director", "visual_designer"]);
const artistRoles = new Set(["main_artist", "primary_artist", "featured_artist", "remix_artist", "vocal_performer"]);

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

export function buildFrontendReleaseMetadataContract(draft: ReleaseManagementDraft): FrontendReleaseMetadataContract {
  const trackContracts = draft.tracks.map((track) => {
    const contributions = listTrackContributions(track.id);
    return {
      trackId: track.id,
      title: track.title,
      artistName: draft.artistName,
      lyrics: null,
      previewAudio: track.previewAudioFile,
      fullAudio: track.fullAudioFile ?? track.audioFile,
      producers: unique([...track.producerNames, ...contributions.filter((row) => productionRoles.has(row.contributionType)).map((row) => row.contributorName)]),
      songwriters: unique(contributions.filter((row) => writingRoles.has(row.contributionType)).map((row) => row.contributorName)),
      contributors: contributions.map((row) => ({ name: row.contributorName, role: row.contributionType })),
      fullCredits: {
        engineering: contributions.filter((row) => engineeringRoles.has(row.contributionType)).map((row) => ({ name: row.contributorName, role: row.contributionType })),
        creative: contributions.filter((row) => creativeRoles.has(row.contributionType)).map((row) => ({ name: row.contributorName, role: row.contributionType })),
        backgroundVocals: unique(contributions.filter((row) => row.contributionType === "background_vocalist" || row.contributionType === "background_vocals").map((row) => row.contributorName))
      }
    };
  });
  const allContributions = trackContracts.flatMap((track) => track.contributors);

  return {
    releaseId: draft.id,
    slug: draft.slug,
    title: draft.title,
    artistName: draft.artistName,
    releaseType: draft.releaseType,
    releaseDate: draft.scheduledPublishAt ?? null,
    permalink: `/releases/${draft.slug}`,
    visibilityState: draft.visibilityState,
    readiness: draft.contentReadiness,
    tags: draft.tags,
    language: draft.language,
    genres: {
      primary: draft.primaryGenre,
      secondary: draft.secondaryGenre
    },
    credits: {
      artist: unique([draft.artistName, ...allContributions.filter((credit) => artistRoles.has(credit.role)).map((credit) => credit.name)]),
      production: unique(allContributions.filter((credit) => productionRoles.has(credit.role)).map((credit) => credit.name)),
      writing: unique(allContributions.filter((credit) => writingRoles.has(credit.role)).map((credit) => credit.name)),
      engineering: unique(allContributions.filter((credit) => engineeringRoles.has(credit.role)).map((credit) => credit.name)),
      creative: unique(allContributions.filter((credit) => creativeRoles.has(credit.role)).map((credit) => credit.name))
    },
    previewLinks: draft.previewLinks,
    assets: {
      coverArt: draft.coverArtPath,
      motionArtwork: draft.motionArtworkPath
    },
    frontendSyncTargets: draft.frontendSyncTargets,
    tracks: trackContracts
  };
}
