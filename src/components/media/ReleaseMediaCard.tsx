"use client";

import { memo } from "react";
import { ReleaseMedia, type ReleaseMediaProps } from "@/components/media/ReleaseMedia";

/** Standard release carousel / list card media — always uses motion-first primaryAsset. */
export const ReleaseMediaCard = memo(function ReleaseMediaCard(props: ReleaseMediaProps) {
  return <ReleaseMedia {...props} />;
});
