export type SyncEvent =
  | "release_created"
  | "release_updated"
  | "release_published"
  | "release_deleted"
  | "media_updated"
  | "media_replaced"
  | "hero_updated";

export type EventPayload = {
  id?: string;
  type: SyncEvent;
  entityId?: string;
  timestamp: number;
  // Events are invalidation/refetch signals. Consumers should refetch authoritative backend data.
  data?: unknown;
};

const listeners = new Set<(event: EventPayload) => void>();
const eventHistory: EventPayload[] = [];
const lastEventMap = new Map<string, number>();
const highPriorityEvents = new Set<SyncEvent>(["release_published", "media_replaced", "hero_updated"]);

function nextEventId() {
  return globalThis.crypto?.randomUUID?.() ?? `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function isHighPriorityEvent(type: SyncEvent) {
  return highPriorityEvents.has(type);
}

function shouldEmit(event: EventPayload) {
  const key = `${event.type}-${event.entityId ?? "global"}`;
  const last = lastEventMap.get(key);

  if (last && Date.now() - last < 500) return false;

  lastEventMap.set(key, Date.now());
  return true;
}

export function emitEvent(event: EventPayload) {
  const payload = { ...event, id: event.id ?? nextEventId(), timestamp: event.timestamp ?? Date.now() };
  if (!shouldEmit(payload)) return;
  eventHistory.unshift(payload);
  eventHistory.length = Math.min(eventHistory.length, 200);
  const deliver = () => {
    for (const listener of listeners) {
      listener(payload);
    }
  };
  if (isHighPriorityEvent(payload.type)) {
    deliver();
    return;
  }
  deliver();
}

export function subscribe(listener: (event: EventPayload) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function listEvents() {
  return [...eventHistory];
}

export function clearEventsForTests() {
  eventHistory.length = 0;
  lastEventMap.clear();
  listeners.clear();
}
