import "server-only";

import { getServerSupabase } from "@/server/supabase/client";
import type { EventPayload } from "@/lib/events/eventBus";

type SyncEventRow = {
  id: string;
  type: string;
  entity_id: string | null;
  payload: EventPayload;
  created_at: string;
};

function eventId(event: EventPayload) {
  return event.id ?? globalThis.crypto?.randomUUID?.() ?? `evt_${event.timestamp}_${Math.random().toString(36).slice(2, 10)}`;
}

function eventCreatedAt(event: EventPayload) {
  return new Date(event.timestamp).toISOString();
}

export async function persistSyncEvent(event: EventPayload) {
  const supabase = getServerSupabase();
  if (!supabase) {
    return {
      persisted: false as const,
      event: { ...event, id: eventId(event) },
      reason: "Supabase is not configured for sync_events persistence."
    };
  }

  const persistedEvent = { ...event, id: eventId(event) };
  const { data, error } = await supabase
    .from("sync_events")
    .insert({
      id: persistedEvent.id,
      type: persistedEvent.type,
      entity_id: persistedEvent.entityId ?? null,
      payload: persistedEvent,
      created_at: eventCreatedAt(persistedEvent)
    })
    .select("id, type, entity_id, payload, created_at")
    .single();

  if (error || !data) {
    return {
      persisted: false as const,
      event: persistedEvent,
      reason: error?.message ?? "Sync event persistence failed."
    };
  }

  return {
    persisted: true as const,
    event: fromSyncEventRow(data as SyncEventRow)
  };
}

export function fromSyncEventRow(row: SyncEventRow): EventPayload & { createdAt: string } {
  return {
    ...(row.payload ?? {}),
    id: row.id,
    type: row.type as EventPayload["type"],
    entityId: row.entity_id ?? row.payload?.entityId,
    timestamp: row.payload?.timestamp ?? new Date(row.created_at).getTime(),
    createdAt: row.created_at
  };
}

export async function listSyncEventsAfter(lastEventTime?: string | null, limit = 100) {
  const supabase = getServerSupabase();
  if (!supabase) {
    return { configured: false as const, events: [], message: "Supabase is not configured for sync event replay." };
  }

  const safeLimit = Math.max(1, Math.min(limit, 250));
  const parsedDate = lastEventTime ? new Date(lastEventTime) : null;
  const hasValidDate = parsedDate && Number.isFinite(parsedDate.getTime());

  let query = supabase
    .from("sync_events")
    .select("id, type, entity_id, payload, created_at")
    .order("created_at", { ascending: true })
    .limit(safeLimit);

  if (hasValidDate) {
    query = query.gt("created_at", parsedDate.toISOString());
  } else if (lastEventTime) {
    return { configured: true as const, events: [], message: "Invalid lastEventTime." };
  } else {
    query = query.gte("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString());
  }

  const { data, error } = await query;
  if (error) {
    return { configured: true as const, events: [], message: error.message };
  }

  return {
    configured: true as const,
    events: (data ?? []).map((row) => fromSyncEventRow(row as SyncEventRow)),
    message: "Replay events loaded."
  };
}
