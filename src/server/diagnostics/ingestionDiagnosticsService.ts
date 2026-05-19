import "server-only";

import { getServerSupabase } from "@/server/supabase/client";

export type IngestionDiagnosticsReport = {
  generatedAt: string;
  tableCounts: Record<string, number>;
  missingRelationships: Array<{ releaseId: string; slug: string; issue: string }>;
  orphanMediaAssets: Array<{ id: string; storagePath: string }>;
  duplicateSlugs: string[];
  syncConflicts: Array<{ key: string; dirty: boolean; detail: string }>;
  ingestionFailures: Array<{ ingestionRef: string; phase: string; status: string }>;
};

export async function buildIngestionDiagnosticsReport(): Promise<IngestionDiagnosticsReport> {
  const supabase = getServerSupabase();
  const empty: IngestionDiagnosticsReport = {
    generatedAt: new Date().toISOString(),
    tableCounts: {},
    missingRelationships: [],
    orphanMediaAssets: [],
    duplicateSlugs: [],
    syncConflicts: [],
    ingestionFailures: []
  };
  if (!supabase) return empty;

  const tables = ["releases", "tracks", "media_assets", "release_media", "audio_visuals", "sync_events", "sync_state"];
  for (const table of tables) {
    const { count } = await supabase.from(table).select("*", { count: "exact", head: true });
    empty.tableCounts[table] = count ?? 0;
  }

  const { data: releases } = await supabase.from("releases").select("id, slug");
  const { data: releaseMedia } = await supabase.from("release_media").select("release_id, is_active");
  const { data: mediaAssets } = await supabase.from("media_assets").select("id, owner_id, owner_type, storage_path");
  const { data: syncState } = await supabase.from("sync_state").select("key, dirty, metadata");
  const { data: failures } = await supabase
    .from("ingestion_log")
    .select("ingestion_ref, phase, status")
    .eq("status", "failed")
    .order("created_at", { ascending: false })
    .limit(20);

  const slugs = (releases ?? []).map((row) => row.slug);
  empty.duplicateSlugs = slugs.filter((slug, index) => slugs.indexOf(slug) !== index);

  const linkedAssetIds = new Set((releaseMedia ?? []).filter((row) => row.is_active).map((row) => row.release_id));
  for (const release of releases ?? []) {
    if (!linkedAssetIds.has(release.id)) {
      empty.missingRelationships.push({
        releaseId: release.id,
        slug: release.slug,
        issue: "No active release_media rows"
      });
    }
  }

  const ownerIds = new Set((releases ?? []).map((row) => row.id));
  for (const asset of mediaAssets ?? []) {
    if (asset.owner_type === "release" && !ownerIds.has(asset.owner_id)) {
      empty.orphanMediaAssets.push({ id: asset.id, storagePath: asset.storage_path });
    }
  }

  for (const row of syncState ?? []) {
    if (row.dirty) {
      empty.syncConflicts.push({
        key: row.key,
        dirty: true,
        detail: JSON.stringify(row.metadata ?? {})
      });
    }
  }

  empty.ingestionFailures = (failures ?? []).map((row) => ({
    ingestionRef: row.ingestion_ref,
    phase: row.phase,
    status: row.status
  }));

  return empty;
}
