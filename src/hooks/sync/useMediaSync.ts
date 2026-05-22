"use client";

import { useEffect, useRef, useState } from "react";
import type { EventPayload } from "@/lib/events/eventBus";
import { useRealtimeEvents } from "@/hooks/sync/useRealtimeEvents";

export function useMediaSync(onMediaEvent?: (event: EventPayload) => void) {
  const { events, connected } = useRealtimeEvents();
  const [lastMediaEvent, setLastMediaEvent] = useState<EventPayload | null>(null);
  const onMediaEventRef = useRef(onMediaEvent);

  useEffect(() => {
    onMediaEventRef.current = onMediaEvent;
  }, [onMediaEvent]);

  useEffect(() => {
    const latest = events[0];
    if (!latest || !["media.uploaded", "media.replaced", "media_updated", "media_replaced"].includes(latest.type)) return;
    setLastMediaEvent(latest);
    onMediaEventRef.current?.(latest);
  }, [events]);

  return { connected, lastMediaEvent };
}
