import type { ReleaseCategory } from "@/server/types";

export type FrontendDestination =
  | "hero"
  | "latest_singles"
  | "features"
  | "albums"
  | "vault"
  | "audio_visuals"
  | "music_singles"
  | "music_albums"
  | "music_features";

export type MediaDestination =
  | "hero"
  | "vault"
  | "audio_visuals"
  | "press_photos"
  | "music_videos"
  | "release_media";

export type RoutedMediaType = "image" | "video" | "audio" | "embed" | "document";

export const frontendDestinations = [
  "hero",
  "latest_singles",
  "features",
  "albums",
  "vault",
  "audio_visuals",
  "music_singles",
  "music_albums",
  "music_features"
] as const satisfies readonly FrontendDestination[];

export const mediaDestinations = [
  "hero",
  "vault",
  "audio_visuals",
  "press_photos",
  "music_videos",
  "release_media"
] as const satisfies readonly MediaDestination[];

export const routedMediaTypes = ["image", "video", "audio", "embed", "document"] as const satisfies readonly RoutedMediaType[];

export type ContentRoutingInput = {
  category?: ReleaseCategory;
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
  single: ["latest_singles", "music_singles"],
  feature: ["features", "music_features"],
  album: ["albums", "music_albums"]
};

export const mediaDestinationRoutes: Record<MediaDestination, FrontendDestination[]> = {
  hero: ["hero"],
  vault: ["vault"],
  audio_visuals: ["audio_visuals"],
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

  if (input.category && (!requestedDestinations.length || requestedDestinations.some((destination) => destination === "release_media" || destination === "press_photos"))) {
    releaseCategoryDestinations[input.category].forEach((route) => routed.add(route));
  }

  return {
    ...input,
    frontendDestinations: [...routed]
  };
}

function isMediaDestination(destination: MediaDestination | FrontendDestination): destination is MediaDestination {
  return destination in mediaDestinationRoutes;
}
