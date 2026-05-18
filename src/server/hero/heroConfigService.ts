import "server-only";

import { eventedWrite } from "@/server/events/eventedWriteService";
import { getServerSupabase } from "@/server/supabase/client";

export type HeroBackgroundMediaType = "image" | "mp4";

export type HeroConfigInput = {
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
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
    .select("title, subtitle, cta_label, cta_href, background_media_url, background_media_type, updated_at")
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

  const heroConfig = {
    title: input.title,
    subtitle: input.subtitle ?? null,
    ctaLabel: input.ctaLabel ?? null,
    ctaHref: input.ctaHref ?? null,
    backgroundMediaUrl: input.backgroundMediaUrl ?? null,
    backgroundMediaType: input.backgroundMediaType ?? null,
    version: new Date().toISOString()
  };

  return eventedWrite({
    type: "hero_updated",
    entityId: "homepage_hero",
    data: heroConfig,
    write: async () => {
      const result = await supabase
        .from("hero_config")
        .upsert({
          id: "homepage",
          title: input.title,
          subtitle: input.subtitle ?? null,
          cta_label: input.ctaLabel ?? null,
          cta_href: input.ctaHref ?? null,
          background_media_url: input.backgroundMediaUrl ?? null,
          background_media_type: input.backgroundMediaType ?? null,
          updated_at: heroConfig.version
        })
        .select("title, subtitle, cta_label, cta_href, background_media_url, background_media_type, updated_at")
        .single();
      return result;
    }
  });
}
