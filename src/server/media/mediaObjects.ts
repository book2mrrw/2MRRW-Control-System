import type { NormalizedPermissions, Release, ReleaseCategory, Track } from "@/server/types";

export type MediaAssetContract = {
  id: string;
  assetId: string;
  kind: "artwork" | "preview" | "full_audio" | "loop" | "vault" | "lyrics" | "unknown";
  sourcePath?: string;
  access: "public" | "entitled" | "admin";
  signedUrlRequired: boolean;
  signedUrlEndpoint: string;
  signedUrlExpiresIn: number;
};

export type EntitlementSummary = {
  canStream: boolean;
  canDownload: boolean;
  canAccessLyrics: boolean;
  requiredGrant: "none" | "release" | "track" | "membership" | "vault";
};

export type PlaybackStatsContract = {
  positionSeconds: number;
  durationSeconds: number;
  completionPercent: number;
  updatedAt?: string;
  streamEventCount?: number;
  validStreamCount?: number;
};

export type TrackMediaObject = {
  id: string;
  releaseId: string;
  title: string;
  position: number;
  durationSeconds: number;
  previewAssetId?: string;
  fullAssetId?: string;
  lyricsAssetId?: string;
  lyricsText?: string | null;
  lyricsMode?: "static" | "timed";
  loopAssetId?: string;
  assets: {
    preview?: MediaAssetContract;
    full?: MediaAssetContract;
    lyrics?: MediaAssetContract;
    loop?: MediaAssetContract;
  };
  entitlement: EntitlementSummary;
  playback: PlaybackStatsContract;
  csAudio?: string | null;
  csCover?: string | null;
  csCoverType?: "image" | "video";
  coverArtType?: "image" | "video";
};

export type ReleaseMediaObject = {
  id: string;
  slug: string;
  title: string;
  artist: {
    id: string;
    name: string;
    slug?: string;
  } | null;
  releaseDate: string;
  releaseType?: Release["releaseType"];
  releaseCategory: ReleaseCategory;
  status: "published" | "scheduled";
  scheduledPublishAt?: string;
  artworkAssetId?: string;
  motionArtworkAssetId?: string;
  artwork?: MediaAssetContract;
  motionArtwork?: MediaAssetContract;
  products?: Array<{
    id: string;
    slug: string;
    productSlug: string;
    title: string;
    priceCents?: number | null;
    priceLabel?: string | null;
    currency?: string | null;
    stripePriceId?: string | null;
  }>;
  price?: number;
  priceCents?: number | null;
  priceLabel?: string | null;
  productSlug?: string | null;
  pricingTier?: "single" | "ep" | "album" | null;
  giftingEnabled?: boolean;
  deluxePriceInCents?: number | null;
  bundlePriceInCents?: number | null;
  tracks: TrackMediaObject[];
  entitlement: EntitlementSummary;
  playback: {
    totalDurationSeconds: number;
    trackCount: number;
    saved: boolean;
  };
  csAudio?: string | null;
  csCover?: string | null;
  csCoverType?: "image" | "video";
  coverArtType?: "image" | "video";
};

function releaseCategoryFor(release: Release): ReleaseCategory {
  if (release.releaseCategory) return release.releaseCategory;
  if (release.releaseType === "feature") return "feature";
  if (release.releaseType === "single") return "single";
  return "album";
}

type MediaAssetSource = {
  id: string;
  bucket: string;
  path: string;
  ownerType?: string;
  ownerId?: string;
  access: string;
};

type ArtistSource = {
  id: string;
  name: string;
  slug?: string;
};

type PlaybackSource = {
  progressByTrackId?: Record<string, { positionSeconds: number; updatedAt: string }>;
};

type MediaObjectInput = {
  release: Release & { status?: "published" | "scheduled"; scheduledPublishAt?: string };
  artist?: ArtistSource | null;
  tracks: Track[];
  mediaAssets: readonly MediaAssetSource[];
  products?: ReleaseMediaObject["products"];
  permissions?: NormalizedPermissions;
  savedReleaseIds?: string[];
  playback?: PlaybackSource;
};

function formatPriceLabel(priceCents?: number | null, currency = "usd") {
  if (typeof priceCents !== "number" || priceCents < 0) return null;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "usd"
  }).format(priceCents / 100);
}

export function classifyMediaAsset(asset: Pick<MediaAssetSource, "path" | "ownerType">): MediaAssetContract["kind"] {
  if (asset.path.startsWith("artwork/")) return "artwork";
  if (asset.path.startsWith("previews/")) return "preview";
  if (asset.path.startsWith("masters/")) return "full_audio";
  if (asset.path.startsWith("loops/")) return "loop";
  if (asset.path.startsWith("vault/")) return "vault";
  if (asset.path.startsWith("lyrics/")) return "lyrics";
  if (asset.ownerType === "track") return "full_audio";
  return "unknown";
}

export function toMediaAssetContract(asset: MediaAssetSource): MediaAssetContract {
  return {
    id: asset.id,
    assetId: asset.id,
    kind: classifyMediaAsset(asset),
    sourcePath: asset.path,
    access: asset.access === "public" || asset.access === "admin" ? asset.access : "entitled",
    signedUrlRequired: true,
    signedUrlEndpoint: `/api/media/${encodeURIComponent(asset.id)}/signed-url`,
    signedUrlExpiresIn: 300
  };
}

function getTrackAssets(track: Track, mediaAssets: readonly MediaAssetSource[]) {
  const ownedAssets = mediaAssets.filter((asset) => asset.ownerType === "track" && asset.ownerId === track.id);
  const primaryAsset = mediaAssets.find((asset) => asset.id === track.mediaAssetId);

  return [...ownedAssets, primaryAsset].filter((asset, index, rows): asset is MediaAssetSource => {
    return Boolean(asset) && rows.findIndex((row) => row?.id === asset?.id) === index;
  });
}

function getEntitlement(input: {
  releaseId: string;
  trackId?: string;
  assetIds: string[];
  permissions?: NormalizedPermissions;
}): EntitlementSummary {
  const permissions = input.permissions;
  const hasMembership = (permissions?.membershipTiers.length ?? 0) > 0;
  const canStream = input.trackId
    ? Boolean(permissions?.canStreamTrackIds.includes(input.trackId) || hasMembership)
    : hasMembership;
  const canDownload = hasMembership || input.assetIds.some((assetId) => permissions?.canDownloadAssetIds.includes(assetId));

  return {
    canStream,
    canDownload,
    canAccessLyrics: canStream || canDownload,
    requiredGrant: canStream || canDownload ? "none" : input.trackId ? "track" : "release"
  };
}

export function buildTrackMediaObject(
  track: Track,
  input: Pick<MediaObjectInput, "release" | "mediaAssets" | "permissions" | "playback">
): TrackMediaObject {
  const assets = getTrackAssets(track, input.mediaAssets).map(toMediaAssetContract);
  const preview = assets.find((asset) => asset.kind === "preview");
  const full = assets.find((asset) => asset.kind === "full_audio") ?? assets.find((asset) => asset.kind === "unknown");
  const lyrics = assets.find((asset) => asset.kind === "lyrics");
  const loop = assets.find((asset) => asset.kind === "loop");
  const progress = input.playback?.progressByTrackId?.[track.id];
  const positionSeconds = progress?.positionSeconds ?? 0;

  return {
    id: track.id,
    releaseId: track.releaseId,
    title: track.title,
    position: track.position,
    durationSeconds: track.durationSeconds,
    previewAssetId: preview?.assetId,
    fullAssetId: full?.assetId,
    lyricsAssetId: lyrics?.assetId,
    lyricsText: track.lyricsText ?? null,
    lyricsMode: track.lyricsMode ?? "static",
    loopAssetId: loop?.assetId,
    assets: {
      preview,
      full,
      lyrics,
      loop
    },
    entitlement: getEntitlement({
      releaseId: input.release.id,
      trackId: track.id,
      assetIds: assets.map((asset) => asset.id),
      permissions: input.permissions
    }),
    playback: {
      positionSeconds,
      durationSeconds: track.durationSeconds,
      completionPercent: track.durationSeconds > 0 ? Math.min(100, Math.round((positionSeconds / track.durationSeconds) * 100)) : 0,
      updatedAt: progress?.updatedAt
    },
    csAudio: (track as { csAudio?: string | null; cs_audio?: string | null }).csAudio ?? (track as { cs_audio?: string | null }).cs_audio ?? null,
    csCover: (track as { csCover?: string | null; cs_cover?: string | null }).csCover ?? (track as { cs_cover?: string | null }).cs_cover ?? null,
    csCoverType: ((track as { csCoverType?: string | null; cs_cover_type?: string | null }).csCoverType ?? (track as { cs_cover_type?: string | null }).cs_cover_type) === "video" ? "video" : "image",
    coverArtType: ((track as { coverArtType?: string | null; cover_art_type?: string | null }).coverArtType ?? (track as { cover_art_type?: string | null }).cover_art_type) === "video" ? "video" : "image"
  };
}

export function buildReleaseMediaObject(input: MediaObjectInput): ReleaseMediaObject {
  const tracks = [...input.tracks]
    .sort((a, b) => a.position - b.position)
    .map((track) => buildTrackMediaObject(track, input));
  const artwork = input.mediaAssets.find((asset) => asset.id === input.release.coverAssetId);
  const motionArtwork =
    input.mediaAssets.find((asset) => asset.path.startsWith("loops/") && asset.ownerId === input.release.id) ??
    input.mediaAssets.find(
      (asset) => asset.ownerId === input.release.id && /\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(asset.path)
    );
  const trackEntitlements = tracks.map((track) => track.entitlement);
  const canStream = trackEntitlements.some((entitlement) => entitlement.canStream);
  const canDownload = trackEntitlements.some((entitlement) => entitlement.canDownload);
  const firstPricedProduct = input.products?.find((product) => typeof product.priceCents === "number" && product.priceCents >= 0);
  const releasePriceCents =
    typeof input.release.priceInCents === "number" && input.release.priceInCents >= 0
      ? input.release.priceInCents
      : null;
  const priceCents = firstPricedProduct?.priceCents ?? releasePriceCents;
  const currency = firstPricedProduct?.currency ?? "usd";
  const priceLabel = formatPriceLabel(priceCents, currency);

  return {
    id: input.release.id,
    slug: input.release.slug,
    title: input.release.title,
    artist: input.artist ? { id: input.artist.id, name: input.artist.name, slug: input.artist.slug } : null,
    releaseDate: input.release.releaseDate,
    releaseType: input.release.releaseType,
    releaseCategory: releaseCategoryFor(input.release),
    status: input.release.status ?? "published",
    scheduledPublishAt: input.release.scheduledPublishAt,
    artworkAssetId: artwork?.id,
    motionArtworkAssetId: motionArtwork?.id,
    artwork: artwork ? toMediaAssetContract(artwork) : undefined,
    motionArtwork: motionArtwork ? toMediaAssetContract(motionArtwork) : undefined,
    products: input.products,
    productSlug: firstPricedProduct?.productSlug ?? firstPricedProduct?.slug ?? (priceCents != null ? `${input.release.slug}-digital` : null),
    price: typeof priceCents === "number" ? priceCents / 100 : undefined,
    priceCents,
    priceLabel,
    pricingTier: input.release.pricingTier ?? null,
    giftingEnabled: input.release.giftingEnabled ?? false,
    deluxePriceInCents: input.release.deluxePriceInCents ?? null,
    bundlePriceInCents: input.release.bundlePriceInCents ?? null,
    tracks,
    entitlement: {
      canStream,
      canDownload,
      canAccessLyrics: trackEntitlements.some((entitlement) => entitlement.canAccessLyrics),
      requiredGrant: canStream || canDownload ? "none" : "release"
    },
    playback: {
      totalDurationSeconds: tracks.reduce((sum, track) => sum + track.durationSeconds, 0),
      trackCount: tracks.length,
      saved: input.savedReleaseIds?.includes(input.release.id) ?? false
    },
    csAudio: (input.release as { csAudio?: string | null; cs_audio?: string | null }).csAudio ?? (input.release as { cs_audio?: string | null }).cs_audio ?? null,
    csCover: (input.release as { csCover?: string | null; cs_cover?: string | null }).csCover ?? (input.release as { cs_cover?: string | null }).cs_cover ?? null,
    csCoverType: ((input.release as { csCoverType?: string | null; cs_cover_type?: string | null }).csCoverType ?? (input.release as { cs_cover_type?: string | null }).cs_cover_type) === "video" ? "video" : "image",
    coverArtType: ((input.release as { coverArtType?: string | null; cover_art_type?: string | null }).coverArtType ?? (input.release as { cover_art_type?: string | null }).cover_art_type) === "video" ? "video" : "image"
  };
}
