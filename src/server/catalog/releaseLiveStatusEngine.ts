import "server-only";

import {
  computeReleaseLiveStatus,
  type ReleaseLiveStatusInput,
  type SyncStateSlice
} from "@/lib/catalog/releaseLiveStatus";
import { getServerSupabase } from "@/server/supabase/client";

export async function fetchCatalogSyncState(): Promise<SyncStateSlice[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("sync_state")
    .select("key, dirty, metadata, updated_at");
  if (error || !data) return [];
  return data.map((row) => ({
    key: row.key as string,
    dirty: Boolean(row.dirty),
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    updated_at: (row.updated_at as string | null) ?? null
  }));
}

export function deriveReleaseLiveStatus(release: ReleaseLiveStatusInput, syncRows: SyncStateSlice[]) {
  return computeReleaseLiveStatus(release, syncRows);
}
