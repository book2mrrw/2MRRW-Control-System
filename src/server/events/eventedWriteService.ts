import { emitEvent, type EventPayload, type SyncEvent } from "@/lib/events/eventBus";
import { persistSyncEvent } from "@/server/events/syncEventPersistenceService";

type SupabaseWriteResult<T> = {
  data: T;
  error: { message?: string } | null;
};

export async function eventedWrite<T>({
  type,
  entityId,
  data,
  write
}: {
  type: SyncEvent;
  entityId?: string;
  data?: unknown;
  write: () => Promise<SupabaseWriteResult<T>>;
}) {
  const result = await write();
  if (result.error) {
    throw new Error(result.error.message ?? "Database write failed");
  }
  await emitPersistedEvent({ type, entityId, timestamp: Date.now(), data });
  return result.data;
}

export function emitAfterSuccessfulAction(event: Omit<EventPayload, "timestamp"> & { timestamp?: number }) {
  emitEvent({
    ...event,
    timestamp: event.timestamp ?? Date.now(),
    data: {
      ...(typeof event.data === "object" && event.data !== null ? event.data : { value: event.data }),
      persistence: "in_memory_fallback"
    }
  });
}

export async function emitPersistedEvent(event: Omit<EventPayload, "timestamp"> & { timestamp?: number }) {
  const payload = { ...event, timestamp: event.timestamp ?? Date.now() };
  const persisted = await persistSyncEvent(payload);
  if (!persisted.persisted) {
    throw new Error(persisted.reason);
  }
  emitEvent(persisted.event);
  return persisted.event;
}
