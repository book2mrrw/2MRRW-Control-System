import "server-only";

import { createHash } from "node:crypto";
import type { FrontendEcosystemPersistencePlan } from "@/server/release-management/frontendReleaseIngestionService";
import { getServerSupabase } from "@/server/supabase/client";

function checksum(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function assetRoleFromStoragePath(storagePath: string): string {
  if (/loops\//i.test(storagePath) || /\.(mp4|mov|webm)(\?|#|$)/i.test(storagePath)) {
    return /preview/i.test(storagePath) ? "preview" : "background_loop";
  }
  if (/preview/i.test(storagePath) || /previews\//i.test(storagePath)) return "preview";
  if (/masters\//i.test(storagePath) || /\.(mp3|wav|m4a|flac|aiff)(\?|#|$)/i.test(storagePath)) return "audio";
  if (/artwork\//i.test(storagePath) || /cover/i.test(storagePath)) return "cover_art";
  if (/lyrics\//i.test(storagePath)) return "lyrics";
  return "other";
}

export async function linkReleaseMediaFromPlan(
  plan: FrontendEcosystemPersistencePlan,
  ingestionRef: string
) {
  const supabase = getServerSupabase();
  if (!supabase) return 0;

  const rows: Array<{
    release_id: string;
    track_id: string | null;
    media_asset_id: string;
    asset_role: string;
    is_primary: boolean;
    version: number;
    is_active: boolean;
    ingestion_ref: string;
    metadata: Record<string, unknown>;
  }> = [];

  for (const release of plan.releases) {
    const releaseTracks = plan.tracks.filter((track) => track.releaseId === release.id);
    const releaseMedia = plan.mediaAssets.filter(
      (asset) => asset.ownerId === release.id || releaseTracks.some((track) => track.id === asset.ownerId)
    );
    const coverCandidates: Array<{ asset: (typeof releaseMedia)[number]; trackId: string | null; role: string }> = [];

    for (const asset of releaseMedia) {
      const trackId = releaseTracks.find((track) => track.id === asset.ownerId)?.id ?? null;
      const role = assetRoleFromStoragePath(asset.storagePath);
      if (role === "cover_art" || role === "background_loop") {
        coverCandidates.push({ asset, trackId, role });
      }

      rows.push({
        release_id: release.id,
        track_id: trackId,
        media_asset_id: asset.id,
        asset_role: role,
        is_primary: false,
        version: 1,
        is_active: true,
        ingestion_ref: ingestionRef,
        metadata: {
          checksum: checksum(asset.storagePath),
          storagePath: asset.storagePath,
          ownerType: asset.ownerType
        }
      });
    }

    const primaryCover =
      coverCandidates.find((candidate) => candidate.role === "cover_art") ??
      coverCandidates.find((candidate) => candidate.role === "background_loop");
    if (primaryCover) {
      const row = rows.find(
        (entry) =>
          entry.release_id === release.id &&
          entry.media_asset_id === primaryCover.asset.id &&
          entry.asset_role === primaryCover.role
      );
      if (row) row.is_primary = true;
    }
  }

  if (!rows.length) return 0;
  const { error } = await supabase.from("release_media").upsert(rows, {
    onConflict: "release_id,media_asset_id,asset_role,version"
  });
  if (error) throw new Error(`release_media link failed: ${error.message}`);
  return rows.length;
}
