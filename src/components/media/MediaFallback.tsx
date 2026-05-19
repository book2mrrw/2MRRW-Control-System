"use client";

import { memo } from "react";

type MediaFallbackProps = {
  emoji?: string;
  grad?: string;
  className?: string;
  label?: string;
};

export const MediaFallback = memo(function MediaFallback({
  emoji = "2M",
  grad = "135deg,#111827,#374151",
  className = "",
  label
}: MediaFallbackProps) {
  return (
    <div className={className} aria-hidden>
      <div className="media-fallback-placeholder" style={{ background: `linear-gradient(${grad})` }}>
        <span>{emoji}</span>
      </div>
      {label ? <span className="sr-only">{label}</span> : null}
    </div>
  );
});
