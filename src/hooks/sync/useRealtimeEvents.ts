"use client";

import { useEffect, useSyncExternalStore } from "react";
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
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempt = 0;
const RECONNECT_BASE_MS = 1200;
const RECONNECT_MAX_MS = 30000;
const MAX_RECONNECT_ATTEMPTS = 8;
let connected = false;
let events: EventPayload[] = [];
const storeListeners = new Set<() => void>();

type RealtimeSnapshot = { events: EventPayload[]; connected: boolean };
let cachedSnapshot: RealtimeSnapshot | null = null;
const SERVER_SNAPSHOT: RealtimeSnapshot = { events: [], connected: false };

function notifyStore() {
  storeListeners.forEach((listener) => listener());
}

function getSnapshot(): RealtimeSnapshot {
  if (!cachedSnapshot || cachedSnapshot.events !== events || cachedSnapshot.connected !== connected) {
    cachedSnapshot = { events, connected };
  }
  return cachedSnapshot;
}

function getServerSnapshot(): RealtimeSnapshot {
  return SERVER_SNAPSHOT;
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

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function scheduleReconnect() {
  if (refCount <= 0 || reconnectTimer) return;
  if (reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
    connected = false;
    notifyStore();
    return;
  }
  const delay = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** reconnectAttempt);
  reconnectAttempt += 1;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectSharedSource();
  }, delay);
}

function connectSharedSource() {
  if (sharedSource && sharedSource.readyState !== EventSource.CLOSED) return;
  sharedSource = new EventSource("/api/sync/stream");
  sharedSource.addEventListener("connected", () => {
    reconnectAttempt = 0;
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
    sharedSource?.close();
    sharedSource = null;
    connected = false;
    notifyStore();
    scheduleReconnect();
  };
}

function disconnectSharedSource() {
  clearReconnectTimer();
  reconnectAttempt = 0;
  sharedSource?.close();
  sharedSource = null;
  connected = false;
  notifyStore();
}

export function useRealtimeEvents() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    refCount += 1;
    connectSharedSource();
    return () => {
      refCount = Math.max(0, refCount - 1);
      if (refCount === 0) disconnectSharedSource();
    };
  }, []);

  return { events: snapshot.events, connected: snapshot.connected };
}
