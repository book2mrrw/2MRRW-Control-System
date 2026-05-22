import { listTrackContributions, type ReleaseManagementDraft } from "@/server/release-management/releaseManagementService";
import { storefrontSectionForReleaseType } from "@/services/sync/contentRouting";

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
  storefrontSection: ReturnType<typeof storefrontSectionForReleaseType>;
  genres?: {
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

function nonEmptyString(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function buildFrontendReleaseMetadataContract(draft: ReleaseManagementDraft): FrontendReleaseMetadataContract {
  const trackContracts = draft.tracks.map((track) => {
    const contributions = listTrackContributions(track.id);
    const lyricsText = nonEmptyString(track.credits);
    const producers = unique([...track.producerNames, ...contributions.filter((row) => productionRoles.has(row.contributionType)).map((row) => row.contributorName)]);
    const songwriters = unique([
      ...contributions.filter((row) => writingRoles.has(row.contributionType)).map((row) => row.contributorName),
      ...(lyricsText ? [lyricsText] : [])
    ]);
    return {
      trackId: track.id,
      title: track.title,
      artistName: draft.artistName,
      lyrics: lyricsText,
      previewAudio: track.previewAudioFile,
      fullAudio: track.fullAudioFile ?? track.audioFile,
      producers,
      songwriters,
      contributors: contributions.map((row) => ({ name: row.contributorName, role: row.contributionType })),
      fullCredits: {
        engineering: contributions.filter((row) => engineeringRoles.has(row.contributionType)).map((row) => ({ name: row.contributorName, role: row.contributionType })),
        creative: contributions.filter((row) => creativeRoles.has(row.contributionType)).map((row) => ({ name: row.contributorName, role: row.contributionType })),
        backgroundVocals: unique(contributions.filter((row) => row.contributionType === "background_vocalist" || row.contributionType === "background_vocals").map((row) => row.contributorName))
      }
    };
  });
  const allContributions = trackContracts.flatMap((track) => track.contributors);

  const genres =
    draft.primaryGenre || draft.secondaryGenre
      ? {
          ...(draft.primaryGenre ? { primary: draft.primaryGenre } : {}),
          ...(draft.secondaryGenre ? { secondary: draft.secondaryGenre } : {})
        }
      : undefined;
  const releaseProducer = nonEmptyString(draft.producer);
  const releaseMixer = nonEmptyString(draft.mixingEngineer);
  const releaseMaster = nonEmptyString(draft.masteringEngineer);
  const coverArt = nonEmptyString(draft.coverArtPath);
  const motionArtwork = nonEmptyString(draft.motionArtworkPath);
  const releaseProduction = unique([
    ...(releaseProducer ? [releaseProducer] : []),
    ...allContributions.filter((credit) => productionRoles.has(credit.role)).map((credit) => credit.name)
  ]);
  const releaseEngineering = unique([
    ...(releaseMixer ? [releaseMixer] : []),
    ...(releaseMaster ? [releaseMaster] : []),
    ...allContributions.filter((credit) => engineeringRoles.has(credit.role)).map((credit) => credit.name)
  ]);

  return {
    releaseId: draft.id,
    slug: draft.slug,
    title: draft.title,
    artistName: draft.artistName,
    releaseType: draft.releaseType,
    releaseDate: draft.scheduledPublishAt ?? draft.originalReleaseDate ?? null,
    permalink: `/releases/${draft.slug}`,
    visibilityState: draft.visibilityState,
    readiness: draft.contentReadiness,
    tags: draft.tags,
    language: draft.language,
    storefrontSection: storefrontSectionForReleaseType(draft.releaseType),
    ...(genres ? { genres } : {}),
    credits: {
      artist: unique([draft.artistName, ...allContributions.filter((credit) => artistRoles.has(credit.role)).map((credit) => credit.name)]),
      production: releaseProduction,
      writing: unique(allContributions.filter((credit) => writingRoles.has(credit.role)).map((credit) => credit.name)),
      engineering: releaseEngineering,
      creative: unique(allContributions.filter((credit) => creativeRoles.has(credit.role)).map((credit) => credit.name))
    },
    previewLinks: draft.previewLinks,
    assets: {
      ...(coverArt ? { coverArt } : {}),
      ...(motionArtwork ? { motionArtwork } : {})
    },
    frontendSyncTargets: draft.frontendSyncTargets,
    tracks: trackContracts
  };
}
