import "server-only";

import { getServerSupabase } from "@/server/supabase/client";

export async function loadTrackLyricsMap(releaseId: string): Promise<Record<string, string>> {
  const supabase = getServerSupabase();
  if (!supabase) return {};

  const { data, error } = await supabase
    .from("tracks")
    .select("id, lyrics_text")
    .eq("release_id", releaseId);

  if (error || !data?.length) return {};

  return Object.fromEntries(
    data
      .filter((row) => typeof row.lyrics_text === "string" && row.lyrics_text.trim())
      .map((row) => [row.id as string, row.lyrics_text as string])
  );
}

export async function persistTrackLyricsMap(releaseId: string, lyrics: Record<string, string>) {
  const supabase = getServerSupabase();
  if (!supabase) {
    return { persisted: false as const, count: 0, message: "Supabase is not configured." };
  }

  const entries = Object.entries(lyrics).filter(([trackId]) => Boolean(trackId));
  if (!entries.length) {
    return { persisted: true as const, count: 0, message: "No lyrics entries to persist." };
  }

  let count = 0;
  for (const [trackId, lyricsText] of entries) {
    const { error } = await supabase
      .from("tracks")
      .update({ lyrics_text: lyricsText.trim() || null })
      .eq("id", trackId)
      .eq("release_id", releaseId);
    if (!error) count += 1;
  }

  return {
    persisted: count > 0,
    count,
    message: count ? `Persisted lyrics for ${count} track(s).` : "Lyrics persistence did not update any tracks."
  };
}
