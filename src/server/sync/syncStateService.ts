import "server-only";

import { persistSyncEvent } from "@/server/events/syncEventPersistenceService";
import { getServerSupabase } from "@/server/supabase/client";

export async function upsertSyncState(input: {
  key: string;
  dirty?: boolean;
  lastIngestionRef?: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = getServerSupabase();
  if (!supabase) return { persisted: false as const };

  const { error } = await supabase.from("sync_state").upsert({
    key: input.key,
    dirty: input.dirty ?? false,
    last_ingestion_ref: input.lastIngestionRef ?? null,
    metadata: input.metadata ?? {},
    updated_at: new Date().toISOString(),
    last_event_at: new Date().toISOString()
  }, { onConflict: "key" });

  return { persisted: !error, error: error?.message };
}

export async function markSyncDirty(key: string, metadata?: Record<string, unknown>) {
  const result = await upsertSyncState({ key, dirty: true, metadata });
  await persistSyncEvent({
    type: "release.updated",
    entityId: key,
    timestamp: Date.now(),
    data: { syncDirty: true, ...metadata }
  });
  return result;
}

export async function getSyncState(key: string) {
  const supabase = getServerSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.from("sync_state").select("*").eq("key", key).maybeSingle();
  if (error || !data) return null;
  return data;
}

export async function listSyncStateRows() {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("sync_state")
    .select("key, dirty, metadata, updated_at, last_event_at");
  if (error || !data) return [];
  return data;
}
