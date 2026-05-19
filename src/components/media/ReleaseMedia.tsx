"use client";

import { memo, useMemo } from "react";
import { resolveDisplayPrimaryAsset, isVideoPrimaryAsset, type ReleasePrimaryAsset } from "@/lib/media/releasePrimaryAsset";
import { AnimatedCoverArt } from "@/components/media/AnimatedCoverArt";
import { MediaFallback } from "@/components/media/MediaFallback";

export type ReleaseMediaProps = {
  primaryAsset?: ReleasePrimaryAsset | null;
  coverUrl?: string | null;
  loopUrl?: string | null;
  motionUrl?: string | null;
  posterUrl?: string | null;
  slug?: string;
  className?: string;
  emoji?: string;
  grad?: string;
  lazy?: boolean;
  alt?: string;
};

export const ReleaseMedia = memo(function ReleaseMedia({
  primaryAsset,
  coverUrl,
  loopUrl,
  motionUrl,
  posterUrl,
  slug,
  className = "",
  emoji = "2M",
  grad = "135deg,#111827,#374151",
  lazy = true,
  alt = ""
}: ReleaseMediaProps) {
  const asset = useMemo(
    () =>
      resolveDisplayPrimaryAsset({
        primaryAsset,
        slug,
        coverUrl,
        loopUrl,
        motionUrl: motionUrl ?? loopUrl,
        posterUrl
      }),
    [primaryAsset, slug, coverUrl, loopUrl, motionUrl, posterUrl]
  );

  if (!asset?.src) {
    return <MediaFallback className={className} emoji={emoji} grad={grad} label={alt} />;
  }

  if (isVideoPrimaryAsset(asset.type) || asset.loop) {
    return <AnimatedCoverArt alt={alt} asset={asset} className={className} lazy={lazy} />;
  }

  return (
    <div className={`${className} release-media-image-wrap has-image`.trim()}>
      <img alt={alt} loading="lazy" src={asset.src} />
    </div>
  );
});
