"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { ReleasePrimaryAsset } from "@/lib/media/releasePrimaryAsset";
import { isVideoPrimaryAsset } from "@/lib/media/releasePrimaryAsset";
import { useVisibleMediaPlayback } from "@/components/media/useVisibleMediaPlayback";

type AnimatedCoverArtProps = {
  asset: ReleasePrimaryAsset;
  className?: string;
  lazy?: boolean;
  alt?: string;
};

export const AnimatedCoverArt = memo(function AnimatedCoverArt({
  asset,
  className = "",
  lazy = true,
  alt = ""
}: AnimatedCoverArtProps) {
  const { ref, visible } = useVisibleMediaPlayback<HTMLDivElement>({ enabled: lazy });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const poster = asset.poster;
  const showVideo = isVideoPrimaryAsset(asset.type) && !failed;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !showVideo) return;
    if (visible || !lazy) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [visible, showVideo, asset.src, lazy]);

  const onCanPlay = useCallback(() => setReady(true), []);
  const onLoadedData = useCallback(() => setReady(true), []);
  const onError = useCallback(() => setFailed(true), []);

  if (!showVideo) {
    return (
      <div ref={ref} className={className}>
        <img alt={alt} loading="lazy" src={asset.src} />
      </div>
    );
  }

  return (
    <div ref={ref} className={`${className} release-media-video-wrap`.trim()}>
      <video
        ref={videoRef}
        key={asset.src}
        autoPlay={asset.autoplay ?? true}
        className={`release-media-video${ready ? " is-ready" : ""}`}
        loop={asset.loop ?? true}
        muted={asset.muted ?? true}
        playsInline
        preload={lazy ? "metadata" : "auto"}
        poster={poster}
        src={asset.src}
        onCanPlay={onCanPlay}
        onLoadedData={onLoadedData}
        onError={onError}
      />
      {failed && poster ? <img alt={alt} className="release-media-video-fallback" loading="lazy" src={poster} /> : null}
    </div>
  );
});
