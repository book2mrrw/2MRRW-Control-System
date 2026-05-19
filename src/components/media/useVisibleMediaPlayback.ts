"use client";

import { useEffect, useRef, useState } from "react";

type Options = {
  rootMargin?: string;
  enabled?: boolean;
};

/**
 * Play looping video only when near viewport; pause when offscreen.
 */
export function useVisibleMediaPlayback<T extends HTMLElement>(options: Options = {}) {
  const { rootMargin = "120px", enabled = true } = options;
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setVisible(true);
      return;
    }
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry?.isIntersecting ?? false);
      },
      { rootMargin, threshold: 0.12 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, rootMargin]);

  return { ref, visible };
}
