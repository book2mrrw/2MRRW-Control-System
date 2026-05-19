import "server-only";

import { persistSyncEvent } from "@/server/events/syncEventPersistenceService";
import { getServerSupabase } from "@/server/supabase/client";
import { markSyncDirty } from "@/server/sync/syncStateService";
import {
  mediaSyncPayload,
  resolveMediaSyncRoute,
  type MediaSectionId,
  type MediaSyncContractInput
} from "@/services/sync/mediaSyncContract";

type ApplyMediaSyncInput = MediaSyncContractInput & {
  mediaAssetId?: string;
  releaseMediaId?: string;
  storagePath?: string;
  version?: number;
  assetRole?: string;
};

function routingColumns(route: ReturnType<typeof resolveMediaSyncRoute>) {
  return {
    frontend_route: route.frontendRoute,
    frontend_component: route.frontendComponent,
    sync_target: route.syncTarget,
    media_section: route.mediaSection,
    platform_scope: route.platformScope,
    callback_group: route.callbackGroup,
    cache_group: route.cacheGroup,
    metadata: {
      frontendDestinations: route.frontendDestinations,
      siblingDestinations: route.siblingDestinations,
      cacheInvalidationTargets: route.cacheInvalidationTargets
    }
  };
}

export async function applyMediaSyncRouting(input: ApplyMediaSyncInput) {
  const route = resolveMediaSyncRoute(input);
  const payload = mediaSyncPayload({
    ...input,
    mediaSection: route.mediaSection
  });
  const supabase = getServerSupabase();

  if (supabase) {
    const columns = routingColumns(route);
    if (input.mediaAssetId) {
      await supabase.from("media_assets").update(columns).eq("id", input.mediaAssetId);
    }
    if (input.releaseMediaId) {
      await supabase.from("release_media").update(columns).eq("id", input.releaseMediaId);
    }
  }

  const syncKeys = [
    input.relatedReleaseId ? `release:${input.relatedReleaseId}` : null,
    route.cacheGroup,
    "catalog"
  ].filter(Boolean) as string[];

  for (const key of syncKeys) {
    await markSyncDirty(key, payload);
  }

  await persistSyncEvent({
    type: "media_updated",
    entityId: input.relatedReleaseId ?? route.syncTarget,
    timestamp: Date.now(),
    data: payload
  });

  return { route, payload };
}

export function assetRoleForMediaSection(section: MediaSectionId, trackScoped = false) {
  if (section === "cover") return "cover_art";
  if (section === "loops") return "background_loop";
  if (section === "audio") return trackScoped ? "audio" : "audio";
  if (section === "previews") return "preview";
  if (section === "videos") return "music_video";
  if (section === "lyrics") return "lyrics";
  if (section === "hero") return "hero";
  if (section === "vault") return "vault";
  return "other";
}
