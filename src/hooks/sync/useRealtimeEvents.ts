"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { EventPayload } from "@/lib/events/eventBus";

const EVENT_TYPES = [
  "release.created",
  "release.updated",
  "release.published",
  "release.deleted",
  "media.uploaded",
  "media.replaced",
  "hero.updated",
  "vault.updated",
  "audio_visuals.updated",
  "release_created",
  "release_updated",
  "release_published",
  "release_deleted",
  "media_updated",
  "media_replaced",
  "hero_updated"
] as const;

let sharedSource: EventSource | null = null;
let refCount = 0;
let connected = false;
let events: EventPayload[] = [];
const storeListeners = new Set<() => void>();

function notifyStore() {
  storeListeners.forEach((listener) => listener());
}

function getSnapshot() {
  return { events, connected };
}

function getServerSnapshot() {
  return { events: [] as EventPayload[], connected: false };
}

function subscribe(listener: () => void) {
  storeListeners.add(listener);
  return () => storeListeners.delete(listener);
}

function handleMessage(message: MessageEvent<string>) {
  const event = JSON.parse(message.data) as EventPayload;
  events = [event, ...events].slice(0, 50);
  connected = true;
  notifyStore();
}

function getSharedSource(): EventSource {
  if (!sharedSource || sharedSource.readyState === EventSource.CLOSED) {
    sharedSource = new EventSource("/api/sync/stream");
    sharedSource.addEventListener("connected", () => {
      connected = true;
      notifyStore();
    });
    sharedSource.addEventListener("heartbeat", () => {
      connected = true;
      notifyStore();
    });
    sharedSource.onmessage = handleMessage;
    EVENT_TYPES.forEach((type) => {
      sharedSource!.addEventListener(type, handleMessage);
    });
    sharedSource.onerror = () => {
      connected = false;
      notifyStore();
    };
  }
  return sharedSource;
}

function releaseSharedSource() {
  if (refCount <= 0 && sharedSource) {
    sharedSource.close();
    sharedSource = null;
    refCount = 0;
    connected = false;
    notifyStore();
  }
}

export function useRealtimeEvents() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [, setTick] = useState(0);

  useEffect(() => {
    refCount += 1;
    getSharedSource();
    const listener = () => setTick((value) => value + 1);
    storeListeners.add(listener);
    return () => {
      storeListeners.delete(listener);
      refCount = Math.max(0, refCount - 1);
      releaseSharedSource();
    };
  }, []);

  return { events: snapshot.events, connected: snapshot.connected };
}
