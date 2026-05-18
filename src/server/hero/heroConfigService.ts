import "server-only";

import { getServerSupabase } from "@/server/supabase/client";

export type HeroBackgroundMediaType = "image" | "mp4";

export type HeroConfigInput = {
  title: string;
  backgroundMediaUrl?: string;
  backgroundMediaType?: HeroBackgroundMediaType;
};

export async function getHeroConfig() {
  const supabase = getServerSupabase();
  if (!supabase) {
    return { configured: false as const, data: null, message: "Supabase is not configured for hero_config persistence." };
  }

  const { data, error } = await supabase
    .from("hero_config")
    .select("title, background_media_url, background_media_type, updated_at")
    .eq("id", "homepage")
    .maybeSingle();

  if (error) {
    return { configured: false as const, data: null, message: error.message };
  }

  return { configured: true as const, data: data ?? null, message: data ? "Hero config loaded." : "No hero config saved yet." };
}

export async function updateHeroConfig(input: HeroConfigInput) {
  const supabase = getServerSupabase();
  if (!supabase) {
    throw new Error("Supabase is not configured for hero_config persistence.");
  }

  const { data, error } = await supabase
    .from("hero_config")
    .upsert({
      id: "homepage",
      title: input.title,
      background_media_url: input.backgroundMediaUrl ?? null,
      background_media_type: input.backgroundMediaType ?? null,
      updated_at: new Date().toISOString()
    })
    .select("title, background_media_url, background_media_type, updated_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
