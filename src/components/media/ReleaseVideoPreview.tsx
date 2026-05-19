"use client";

import { memo } from "react";
import type { ReleasePrimaryAsset } from "@/lib/media/releasePrimaryAsset";
import { AnimatedCoverArt } from "@/components/media/AnimatedCoverArt";

type ReleaseVideoPreviewProps = {
  asset: ReleasePrimaryAsset;
  className?: string;
};

/** Inline loop preview (workspace asset panels). */
export const ReleaseVideoPreview = memo(function ReleaseVideoPreview({ asset, className = "" }: ReleaseVideoPreviewProps) {
  return <AnimatedCoverArt asset={asset} className={className} lazy={false} />;
});
