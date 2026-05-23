import "server-only";

import type { CoverArtMediaType } from "@/lib/media/coverArt";
import { getServerSupabase } from "@/server/supabase/client";

export type ReleaseCoverArtColumns = {
  csCover: string;
  coverArtType: CoverArtMediaType;
  csCoverType: CoverArtMediaType;
};

export type TrackMediaColumns = {
  csCover?: string;
  coverArtType?: CoverArtMediaType;
  csCoverType?: CoverArtMediaType;
  csAudio?: string;
};

export async function persistReleaseCoverArtColumns(releaseId: string, input: ReleaseCoverArtColumns) {
  const supabase = getServerSupabase();
  if (!supabase) {
    return { persisted: false as const, message: "Supabase is not configured." };
  }

  const payload = {
    cs_cover: input.csCover,
    cover_art_type: input.coverArtType,
    cs_cover_type: input.csCoverType
  };

  const { error } = await supabase.from("releases").update(payload).eq("id", releaseId);
  if (error) {
    if (/cs_cover|cover_art_type|cs_cover_type/i.test(error.message ?? "")) {
      return { persisted: false as const, message: "Cover art columns are not available yet. Apply migration 0023." };
    }
    return { persisted: false as const, message: error.message };
  }

  return { persisted: true as const, message: "Release cover art columns saved." };
}

export async function persistTrackMediaColumns(releaseId: string, trackId: string, input: TrackMediaColumns) {
  const supabase = getServerSupabase();
  if (!supabase) {
    return { persisted: false as const, message: "Supabase is not configured." };
  }

  const payload: Record<string, string> = {};
  if (input.csCover) payload.cs_cover = input.csCover;
  if (input.coverArtType) payload.cover_art_type = input.coverArtType;
  if (input.csCoverType) payload.cs_cover_type = input.csCoverType;
  if (input.csAudio) payload.cs_audio = input.csAudio;

  if (!Object.keys(payload).length) {
    return { persisted: true as const, message: "No track media columns to persist." };
  }

  const { error } = await supabase.from("tracks").update(payload).eq("id", trackId).eq("release_id", releaseId);
  if (error) {
    if (/cs_cover|cover_art_type|cs_cover_type|cs_audio/i.test(error.message ?? "")) {
      return { persisted: false as const, message: "Track media columns are not available yet. Apply migration 0023." };
    }
    return { persisted: false as const, message: error.message };
  }

  return { persisted: true as const, message: "Track media columns saved." };
}
