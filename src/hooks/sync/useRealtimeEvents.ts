"use client";

import { useEffect, useState } from "react";
import type { EventPayload } from "@/lib/events/eventBus";

export function useRealtimeEvents() {
  const [events, setEvents] = useState<EventPayload[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const source = new EventSource("/api/sync/stream");
    source.addEventListener("connected", () => setConnected(true));
    source.addEventListener("heartbeat", () => setConnected(true));

    const handleMessage = (message: MessageEvent<string>) => {
      const event = JSON.parse(message.data) as EventPayload;
      setEvents((current) => [event, ...current].slice(0, 50));
    };

    source.onmessage = handleMessage;
    ["release_created", "release_updated", "release_published", "release_deleted", "media_updated", "media_replaced", "hero_updated"].forEach((type) => {
      source.addEventListener(type, handleMessage);
    });
    source.onerror = () => setConnected(false);
    return () => source.close();
  }, []);

  return { events, connected };
}
