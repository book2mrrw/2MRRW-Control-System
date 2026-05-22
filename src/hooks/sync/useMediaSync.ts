"use client";

import { useEffect, useRef, useState } from "react";
import type { EventPayload } from "@/lib/events/eventBus";
import { useRealtimeEvents } from "@/hooks/sync/useRealtimeEvents";

const MEDIA_EVENT_TYPES = new Set([
  "media.uploaded",
  "media.replaced",
  "media_updated",
  "media_replaced"
]);

function mediaEventKey(event: EventPayload) {
  return event.id ?? `${event.type}:${event.timestamp}:${event.entityId ?? ""}`;
}

export function useMediaSync(onMediaEvent?: (event: EventPayload) => void) {
  const { events, connected } = useRealtimeEvents();
  const [lastMediaEvent, setLastMediaEvent] = useState<EventPayload | null>(null);
  const onMediaEventRef = useRef(onMediaEvent);
  const lastHandledKeyRef = useRef<string | null>(null);

  onMediaEventRef.current = onMediaEvent;

  useEffect(() => {
    const latest = events[0];
    if (!latest || !MEDIA_EVENT_TYPES.has(latest.type)) return;

    const key = mediaEventKey(latest);
    if (lastHandledKeyRef.current === key) return;
    lastHandledKeyRef.current = key;

    setLastMediaEvent(latest);
    onMediaEventRef.current?.(latest);
  }, [events]);

  return { connected, lastMediaEvent };
}
