"use client";

import { useEffect, useState } from "react";
import type { EventPayload } from "@/lib/events/eventBus";
import { useRealtimeEvents } from "@/hooks/sync/useRealtimeEvents";

export function useMediaSync(onMediaEvent?: (event: EventPayload) => void) {
  const { events, connected } = useRealtimeEvents();
  const [lastMediaEvent, setLastMediaEvent] = useState<EventPayload | null>(null);

  useEffect(() => {
    const latest = events[0];
    if (!latest || (latest.type !== "media_updated" && latest.type !== "media_replaced")) return;
    setLastMediaEvent(latest);
    onMediaEvent?.(latest);
  }, [events, onMediaEvent]);

  return { connected, lastMediaEvent };
}
