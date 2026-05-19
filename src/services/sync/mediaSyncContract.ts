import {
  mediaDestinationRoutes,
  mediaTabDestinationSections,
  resolveContentDestinations,
  type ContentRoutingInput,
  type FrontendDestination,
  type MediaDestination,
  type RoutedMediaType
} from "@/services/sync/contentRouting";

export const mediaSectionIds = [
  "singles",
  "albums_eps",
  "hero",
  "vault",
  "loops",
  "cover",
  "audio",
  "previews",
  "videos",
  "press",
  "lyrics",
  "sync_status",
  "version_history"
] as const;

export type MediaSectionId = (typeof mediaSectionIds)[number];

export type MediaSyncRoute = {
  frontendRoute: string;
  frontendComponent: string;
  syncTarget: string;
  mediaSection: MediaSectionId;
  platformScope: string[];
  callbackGroup: string;
  cacheGroup: string;
  frontendDestinations: FrontendDestination[];
  siblingDestinations: FrontendDestination[];
  cacheInvalidationTargets: string[];
};

export type MediaSyncContractInput = ContentRoutingInput & {
  assetRole?: string;
  uploadCategory?: string;
  mediaSection?: MediaSectionId;
  releaseSlug?: string;
};

const SECTION_LABELS: Record<MediaSectionId, string> = {
  singles: "Singles",
  albums_eps: "Albums & EPs",
  hero: "Hero",
  vault: "Vault",
  loops: "Loops",
  cover: "Cover",
  audio: "Audio",
  previews: "Previews",
  videos: "Videos",
  press: "Press",
  lyrics: "Lyrics",
  sync_status: "Sync Status",
  version_history: "Version History"
};

const ROLE_TO_SECTION: Record<string, MediaSectionId> = {
  cover_art: "cover",
  cover: "cover",
  background_loop: "loops",
  motion: "loops",
  visual: "videos",
  music_video: "videos",
  preview: "previews",
  audio: "audio",
  lyrics: "lyrics",
  hero: "hero",
  vault: "vault",
  other: "sync_status"
};

const CATEGORY_TO_SECTION: Record<string, MediaSectionId> = {
  hero_media: "hero",
  signal_asset: "hero",
  vault_media: "vault",
  vault_asset: "vault",
  audio_visual: "videos",
  radio_asset: "videos",
  release_cover: "cover",
  single_cover_art: "cover",
  album_cover_art: "cover",
  track_audio: "audio",
  audio_full_song: "audio",
  full_song_files: "audio",
  audio_preview: "previews",
  preview_snippets: "previews",
  lyrics: "lyrics",
  latest_singles: "singles",
  albums: "albums_eps",
  features: "singles"
};

function primaryFrontendRoute(destinations: FrontendDestination[]) {
  return destinations[0] ?? "release_media";
}

function frontendComponentFor(destination: FrontendDestination) {
  if (destination === "hero") return "HeroSurface";
  if (destination.startsWith("vault")) return "VaultGallery";
  if (destination.includes("carousel")) return "MediaCarousel";
  if (destination.includes("album")) return "AlbumReleasePage";
  if (destination.includes("single")) return "SingleReleaseCard";
  return "ReleaseMediaSlot";
}

function platformScopeFor(destinations: FrontendDestination[]) {
  const scopes = new Set<string>(["web"]);
  if (destinations.some((d) => d.includes("youtube"))) scopes.add("youtube");
  if (destinations.some((d) => d.includes("music") || d.includes("audio"))) scopes.add("music_tab");
  if (destinations.some((d) => d.includes("homepage"))) scopes.add("homepage");
  return [...scopes];
}

function cacheGroupFor(input: { releaseId?: string; mediaSection: MediaSectionId; syncTarget: string }) {
  if (input.mediaSection === "hero") return "hero:homepage";
  if (input.mediaSection === "vault") return "vault:library";
  if (input.releaseId) return `release:${input.releaseId}:${input.mediaSection}`;
  return `media:${input.syncTarget}`;
}

function callbackGroupFor(mediaSection: MediaSectionId) {
  return `media_sync_${mediaSection}`;
}

function siblingDestinations(destinations: FrontendDestination[]) {
  const siblings = new Set<FrontendDestination>();
  for (const destination of destinations) {
    const mediaKey = Object.entries(mediaDestinationRoutes).find(([, routes]) => routes.includes(destination))?.[0] as
      | MediaDestination
      | undefined;
    if (mediaKey) {
      mediaDestinationRoutes[mediaKey].forEach((route) => siblings.add(route));
    }
    siblings.add(destination);
  }
  return [...siblings].filter((route, index, list) => list.indexOf(route) === index);
}

function cacheInvalidationTargets(input: {
  releaseId?: string;
  releaseSlug?: string;
  destinations: FrontendDestination[];
  mediaSection: MediaSectionId;
}) {
  const tags = new Set<string>([`section:${input.mediaSection}`]);
  if (input.releaseId) {
    tags.add(`release:${input.releaseId}`);
    tags.add(`/api/admin/releases/manage/${input.releaseId}`);
    tags.add("/api/admin/catalog");
    tags.add("/api/public/releases");
  }
  if (input.releaseSlug) {
    tags.add(`/releases/${input.releaseSlug}`);
  }
  for (const destination of input.destinations) {
    tags.add(`destination:${destination}`);
  }
  if (input.mediaSection === "hero") {
    tags.add("/api/public/hero");
    tags.add("/api/admin/hero-config");
  }
  if (input.mediaSection === "vault") {
    tags.add("/api/vault");
  }
  return [...tags];
}

export function releaseBucketSection(releaseType?: string | null): MediaSectionId {
  if (releaseType === "single" || releaseType === "feature") return "singles";
  if (releaseType === "ep" || releaseType === "album" || releaseType === "deluxe" || releaseType === "remix_pack") return "albums_eps";
  return "albums_eps";
}

export function sectionForAssetRole(assetRole?: string, releaseType?: string | null): MediaSectionId {
  if (assetRole && ROLE_TO_SECTION[assetRole]) return ROLE_TO_SECTION[assetRole];
  return releaseBucketSection(releaseType);
}

export function sectionForUploadCategory(category?: string, releaseType?: string | null): MediaSectionId {
  if (category && CATEGORY_TO_SECTION[category]) return CATEGORY_TO_SECTION[category];
  return releaseBucketSection(releaseType);
}

export function mediaSectionLabel(section: MediaSectionId) {
  return SECTION_LABELS[section];
}

export function mediaSectionPurpose(section: MediaSectionId) {
  if (section === "hero") return mediaTabDestinationSections.hero.purpose;
  if (section === "vault") return mediaTabDestinationSections.vault.purpose;
  if (section === "cover") return mediaTabDestinationSections.cover_art.purpose;
  if (section === "audio") return mediaTabDestinationSections.audio_files.purpose;
  if (section === "previews") return mediaTabDestinationSections.preview_snippets.purpose;
  if (section === "videos") return mediaTabDestinationSections.music_videos.purpose;
  if (section === "press") return mediaTabDestinationSections.press_photos.purpose;
  if (section === "loops") return "Background loops and motion cover media.";
  if (section === "lyrics") return "Track lyrics documents linked to release metadata.";
  if (section === "sync_status") return "Frontend sync routing, dirty flags, and invalidation targets.";
  if (section === "version_history") return "Prior media_asset_versions archived on replacement.";
  if (section === "singles") return "Single-release media routed to homepage and music singles surfaces.";
  return "Album and EP media routed to album pages, carousels, and featured album areas.";
}

export function resolveMediaSyncRoute(input: MediaSyncContractInput): MediaSyncRoute {
  const routing = resolveContentDestinations(input);
  const mediaSection =
    input.mediaSection ??
    (input.assetRole ? sectionForAssetRole(input.assetRole, input.releaseType) : undefined) ??
    sectionForUploadCategory(input.uploadCategory, input.releaseType);
  const frontendRoute = primaryFrontendRoute(routing.frontendDestinations);
  const syncTarget = input.relatedReleaseId
    ? `release:${input.relatedReleaseId}:${mediaSection}`
    : `${mediaSection}:${frontendRoute}`;
  const siblings = siblingDestinations(routing.frontendDestinations);

  return {
    frontendRoute,
    frontendComponent: frontendComponentFor(frontendRoute as FrontendDestination),
    syncTarget,
    mediaSection,
    platformScope: platformScopeFor(routing.frontendDestinations),
    callbackGroup: callbackGroupFor(mediaSection),
    cacheGroup: cacheGroupFor({ releaseId: input.relatedReleaseId, mediaSection, syncTarget }),
    frontendDestinations: routing.frontendDestinations,
    siblingDestinations: siblings,
    cacheInvalidationTargets: cacheInvalidationTargets({
      releaseId: input.relatedReleaseId,
      releaseSlug: input.releaseSlug,
      destinations: routing.frontendDestinations,
      mediaSection
    })
  };
}

export function mediaSyncPayload(input: MediaSyncContractInput & { storagePath?: string; mediaAssetId?: string; version?: number }) {
  const route = resolveMediaSyncRoute(input);
  return {
    ...route,
    releaseId: input.relatedReleaseId,
    assetRole: input.assetRole,
    uploadCategory: input.uploadCategory,
    mediaType: input.mediaType as RoutedMediaType | undefined,
    storagePath: input.storagePath,
    mediaAssetId: input.mediaAssetId,
    version: input.version,
    invalidatedAt: new Date().toISOString()
  };
}

export const releaseMediaWorkspaceSections: MediaSectionId[] = [
  "loops",
  "cover",
  "audio",
  "previews",
  "videos",
  "press",
  "lyrics",
  "sync_status",
  "version_history"
];

export const mediaLibraryCategoryTabs = ["Singles", "Albums & EPs", "Hero", "Vault"] as const;
export type MediaLibraryCategoryTab = (typeof mediaLibraryCategoryTabs)[number];

export const controlRoomRootSections = [
  { id: "singles", label: "Singles", destinations: ["latest_singles", "music_singles", "singles_carousel"] as FrontendDestination[] },
  { id: "albums_eps", label: "Albums & EPs", destinations: ["albums", "eps", "music_albums", "music_eps"] as FrontendDestination[] },
  { id: "features", label: "Features", destinations: ["features", "music_features"] as FrontendDestination[] },
  { id: "hero", label: "Hero", destinations: ["hero"] as FrontendDestination[] },
  { id: "vault", label: "Vault", destinations: ["vault", "vault_media"] as FrontendDestination[] },
  { id: "audiovisuals", label: "Audio Visuals", destinations: ["audio_visuals", "youtube_embeds", "homepage_audio_visuals"] as FrontendDestination[] },
  { id: "press_promo", label: "Press & Promo", destinations: [] as FrontendDestination[] }
] as const;

export type ControlRoomSectionId = (typeof controlRoomRootSections)[number]["id"];

export function controlRoomSectionLabel(id: ControlRoomSectionId) {
  return controlRoomRootSections.find((section) => section.id === id)?.label ?? id;
}

export function categoryTabForRelease(
  releaseType?: string | null,
  trackCount = 0,
  releaseCategory?: string | null
): MediaLibraryCategoryTab {
  if (releaseCategory === "feature" || releaseType === "feature") return "Singles";
  if (releaseType === "single") return "Singles";
  if (releaseType === "ep") return "Albums & EPs";
  if (releaseType === "album" && trackCount >= 2 && trackCount <= 6) return "Albums & EPs";
  if (releaseType === "album" || releaseType === "deluxe" || releaseType === "remix_pack") return "Albums & EPs";
  return "Albums & EPs";
}

export function isFeatureRelease(release: { releaseType?: string | null; releaseCategory?: string | null }) {
  return release.releaseCategory === "feature" || release.releaseType === "feature";
}
