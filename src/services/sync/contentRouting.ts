import type { ReleaseCategory } from "@/server/types";

export type FrontendDestination =
  | "hero"
  | "homepage_latest_singles"
  | "latest_singles"
  | "singles_sub_tab"
  | "singles_carousel"
  | "features"
  | "features_showcase"
  | "features_carousel"
  | "albums"
  | "album_pages"
  | "album_carousels"
  | "homepage_featured_albums"
  | "eps"
  | "vault"
  | "vault_media"
  | "audio_visuals"
  | "homepage_audio_visuals"
  | "music_audio_visuals"
  | "youtube_embeds"
  | "audio_files"
  | "cover_art"
  | "preview_snippets"
  | "full_song_files"
  | "music_singles"
  | "music_albums"
  | "music_eps"
  | "music_features";

export type MediaDestination =
  | "hero"
  | "vault"
  | "audio_visuals"
  | "audio_files"
  | "cover_art"
  | "preview_snippets"
  | "full_song_files"
  | "press_photos"
  | "music_videos"
  | "release_media";

export type RoutedMediaType = "image" | "video" | "audio" | "embed" | "document";

export const frontendDestinations = [
  "hero",
  "homepage_latest_singles",
  "latest_singles",
  "singles_sub_tab",
  "singles_carousel",
  "features",
  "features_showcase",
  "features_carousel",
  "albums",
  "album_pages",
  "album_carousels",
  "homepage_featured_albums",
  "eps",
  "vault",
  "vault_media",
  "audio_visuals",
  "homepage_audio_visuals",
  "music_audio_visuals",
  "youtube_embeds",
  "audio_files",
  "cover_art",
  "preview_snippets",
  "full_song_files",
  "music_singles",
  "music_albums",
  "music_eps",
  "music_features"
] as const satisfies readonly FrontendDestination[];

export const mediaDestinations = [
  "hero",
  "vault",
  "audio_visuals",
  "audio_files",
  "cover_art",
  "preview_snippets",
  "full_song_files",
  "press_photos",
  "music_videos",
  "release_media"
] as const satisfies readonly MediaDestination[];

export const routedMediaTypes = ["image", "video", "audio", "embed", "document"] as const satisfies readonly RoutedMediaType[];

export type ContentRoutingInput = {
  category?: ReleaseCategory;
  releaseType?: "single" | "album" | "ep" | "deluxe" | "remix_pack" | "feature";
  destination?: MediaDestination | FrontendDestination | Array<MediaDestination | FrontendDestination>;
  mediaType?: RoutedMediaType;
  relatedReleaseId?: string;
};

export type ContentRoutingResult = {
  category?: ReleaseCategory;
  destination?: ContentRoutingInput["destination"];
  mediaType?: RoutedMediaType;
  relatedReleaseId?: string;
  frontendDestinations: FrontendDestination[];
};

export const releaseCategoryDestinations: Record<ReleaseCategory, FrontendDestination[]> = {
  single: ["homepage_latest_singles", "latest_singles", "music_singles", "singles_sub_tab", "singles_carousel"],
  feature: ["features", "features_showcase", "features_carousel", "music_features"],
  album: ["albums", "album_pages", "album_carousels", "music_albums", "homepage_featured_albums"]
};

/** Singles → Singles tab; EPs/albums/deluxe → Albums & EPs (deluxe gets storefront badge). */
export const releaseTypeDestinations: Record<NonNullable<ContentRoutingInput["releaseType"]>, FrontendDestination[]> = {
  single: ["homepage_latest_singles", "latest_singles", "music_singles", "singles_sub_tab", "singles_carousel"],
  feature: ["features", "features_showcase", "features_carousel", "music_features"],
  ep: ["eps", "music_eps", "albums", "album_pages", "album_carousels", "music_albums", "homepage_featured_albums"],
  album: ["albums", "album_pages", "album_carousels", "music_albums", "homepage_featured_albums"],
  deluxe: ["albums", "album_pages", "album_carousels", "music_albums", "homepage_featured_albums"],
  remix_pack: ["albums", "album_pages", "album_carousels", "music_albums", "homepage_featured_albums"]
};

export type StorefrontCatalogSection = "singles" | "albums_eps";

export type StorefrontSectionRouting = {
  section: StorefrontCatalogSection;
  tabLabel: string;
  badge: string | null;
};

/** Maps release type to dedicated storefront section header/tab. Optional fields stay off the storefront when empty. */
export function storefrontSectionForReleaseType(
  releaseType?: ContentRoutingInput["releaseType"] | null
): StorefrontSectionRouting {
  if (releaseType === "single" || releaseType === "feature") {
    return { section: "singles", tabLabel: "Singles", badge: null };
  }
  if (releaseType === "deluxe") {
    return { section: "albums_eps", tabLabel: "Albums & EPs", badge: "Deluxe" };
  }
  return { section: "albums_eps", tabLabel: "Albums & EPs", badge: null };
}

export const mediaDestinationRoutes: Record<MediaDestination, FrontendDestination[]> = {
  hero: ["hero"],
  vault: ["vault", "vault_media"],
  audio_visuals: ["homepage_audio_visuals", "music_audio_visuals", "audio_visuals", "youtube_embeds"],
  audio_files: ["audio_files"],
  cover_art: ["cover_art"],
  preview_snippets: ["preview_snippets", "audio_files"],
  full_song_files: ["full_song_files", "audio_files"],
  music_videos: ["audio_visuals"],
  press_photos: [],
  release_media: []
};

export const mediaTabDestinationSections: Record<MediaDestination, { label: string; purpose: string }> = {
  hero: {
    label: "Hero",
    purpose: "Homepage hero MP4 loops, images, and replacement media"
  },
  vault: {
    label: "Vault",
    purpose: "Vault visuals, animated media, and managed vault assets"
  },
  audio_visuals: {
    label: "Audio Visuals",
    purpose: "MP4 visual content, YouTube embeds, and cinematic visual media"
  },
  audio_files: {
    label: "Audio Files",
    purpose: "Preview and full-song audio routed through the media library"
  },
  cover_art: {
    label: "Cover Art",
    purpose: "Release artwork routed to frontend release, homepage, and music surfaces"
  },
  preview_snippets: {
    label: "Preview Snippets",
    purpose: "Public preview audio that frontend players can request"
  },
  full_song_files: {
    label: "Full Song Files",
    purpose: "Full-quality audio source files for frontend playback decisions"
  },
  press_photos: {
    label: "Press Photos",
    purpose: "Press photography routed through the unified media library"
  },
  music_videos: {
    label: "Music Videos",
    purpose: "Music video media routed into Audio Visuals"
  },
  release_media: {
    label: "Release Media",
    purpose: "Cover art, MP4 loops, audio uploads, and release press photos"
  }
};

export function resolveContentDestinations(input: ContentRoutingInput): ContentRoutingResult {
  const requestedDestinations = Array.isArray(input.destination)
    ? input.destination
    : input.destination
      ? [input.destination]
      : [];

  const routed = new Set<FrontendDestination>();

  for (const destination of requestedDestinations) {
    if (isMediaDestination(destination)) {
      mediaDestinationRoutes[destination].forEach((route) => routed.add(route));
    } else {
      routed.add(destination);
    }
  }

  if (input.category && (!requestedDestinations.length || input.mediaType === "audio" || requestedDestinations.some((destination) => destination === "release_media" || destination === "press_photos"))) {
    releaseCategoryDestinations[input.category].forEach((route) => routed.add(route));
  }

  if (input.releaseType && (!requestedDestinations.length || input.mediaType === "audio" || requestedDestinations.some((destination) => destination === "release_media" || destination === "press_photos"))) {
    releaseTypeDestinations[input.releaseType].forEach((route) => routed.add(route));
  }

  return {
    ...input,
    frontendDestinations: [...routed]
  };
}

function isMediaDestination(destination: MediaDestination | FrontendDestination): destination is MediaDestination {
  return destination in mediaDestinationRoutes;
}
