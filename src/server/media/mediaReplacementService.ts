import "server-only";

import { createHash } from "node:crypto";
import { persistSyncEvent } from "@/server/events/syncEventPersistenceService";
import { getServerSupabase } from "@/server/supabase/client";
import { applyMediaSyncRouting, assetRoleForMediaSection } from "@/server/media/mediaSyncRoutingService";

function checksum(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function replaceReleaseMedia(input: {
  releaseId: string;
  trackId?: string;
  assetRole: "cover_art" | "cover" | "motion" | "preview" | "audio" | "visual" | "lyrics" | "other";
  storagePath: string;
  accessLevel?: "public" | "entitled" | "admin";
  ingestionRef?: string;
}) {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data: existingLinks, error: linkError } = await supabase
    .from("release_media")
    .select("id, media_asset_id, version")
    .eq("release_id", input.releaseId)
    .eq("asset_role", input.assetRole)
    .eq("is_active", true);

  if (linkError) throw new Error(linkError.message);

  const priorVersion = Math.max(0, ...(existingLinks ?? []).map((row) => row.version ?? 1));
  const nextVersion = priorVersion + 1;

  if (existingLinks?.length) {
    await supabase
      .from("release_media")
      .update({ is_active: false })
      .in("id", existingLinks.map((row) => row.id));
  }

  const hex = createHash("sha1")
    .update([input.releaseId, input.assetRole, input.storagePath, String(nextVersion)].join(":"))
    .digest("hex")
    .slice(0, 32);
  const mediaAssetId = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;

  const { error: assetError } = await supabase.from("media_assets").insert({
    id: mediaAssetId,
    owner_type: input.trackId ? "track" : "release",
    owner_id: input.trackId ?? input.releaseId,
    bucket: "protected-media",
    storage_path: input.storagePath,
    access_level: input.accessLevel ?? "entitled"
  });
  if (assetError) throw new Error(assetError.message);

  await supabase.from("media_asset_versions").insert({
    media_asset_id: mediaAssetId,
    version: nextVersion,
    storage_path: input.storagePath,
    checksum: checksum(input.storagePath),
    metadata: { replacedAt: new Date().toISOString(), priorVersion }
  });

  const normalizedRole = input.assetRole === "cover" ? "cover_art" : input.assetRole;
  const isCover = normalizedRole === "cover_art";

  const { data: insertedLink, error: joinError } = await supabase
    .from("release_media")
    .insert({
      release_id: input.releaseId,
      track_id: input.trackId ?? null,
      media_asset_id: mediaAssetId,
      asset_role: normalizedRole,
      is_primary: isCover,
      version: nextVersion,
      is_active: true,
      ingestion_ref: input.ingestionRef ?? null,
      metadata: { checksum: checksum(input.storagePath) }
    })
    .select("id")
    .single();
  if (joinError) throw new Error(joinError.message);

  if (isCover) {
    await supabase
      .from("release_media")
      .update({ is_primary: false })
      .eq("release_id", input.releaseId)
      .in("asset_role", ["cover_art", "cover"])
      .neq("id", insertedLink.id);
  }

  const syncResult = await applyMediaSyncRouting({
    relatedReleaseId: input.releaseId,
    assetRole: normalizedRole,
    mediaAssetId,
    releaseMediaId: insertedLink.id as string,
    storagePath: input.storagePath,
    version: nextVersion,
    destination: normalizedRole === "cover_art" ? "cover_art" : normalizedRole === "preview" ? "preview_snippets" : "release_media"
  });

  await persistSyncEvent({
    type: "media.uploaded",
    entityId: input.releaseId,
    timestamp: Date.now(),
    data: {
      ...syncResult.payload,
      releaseId: input.releaseId,
      trackId: input.trackId,
      assetRole: normalizedRole,
      storagePath: input.storagePath,
      version: nextVersion,
      source: "media_replacement"
    }
  });

  return { mediaAssetId, version: nextVersion, storagePath: input.storagePath, sync: syncResult };
}

export async function replaceReleaseCoverArt(input: Omit<Parameters<typeof replaceReleaseMedia>[0], "assetRole">) {
  return replaceReleaseMedia({ ...input, assetRole: assetRoleForMediaSection("cover") as "cover_art" });
}
