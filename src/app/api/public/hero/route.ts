import { ok } from "@/server/http";
import { getHeroConfig } from "@/server/hero/heroConfigService";
import { getServerSupabase } from "@/server/supabase/client";

const PUBLIC_FRONTEND_ORIGINS = new Set([
  "https://2mrrw.com",
  "https://www.2mrrw.com",
  "https://artist-platform-silk.vercel.app",
  "https://2mrrw-official.vercel.app"
]);

function publicReadCorsHeaders(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  const headers = new Headers({
    Vary: "Origin",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  if (origin && (PUBLIC_FRONTEND_ORIGINS.has(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin))) {
    headers.set("Access-Control-Allow-Origin", origin);
  }
  return headers;
}

export function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: publicReadCorsHeaders(request) });
}

export async function GET(request: Request) {
  const heroConfig = await getHeroConfig();
  if (heroConfig.data) {
    return ok(
      {
        hero: {
          title: heroConfig.data.title,
          subtitle: heroConfig.data.subtitle,
          ctaLabel: heroConfig.data.cta_label,
          ctaHref: heroConfig.data.cta_href,
          backgroundMediaUrl: heroConfig.data.background_media_url,
          backgroundMediaType: heroConfig.data.background_media_type,
          updatedAt: heroConfig.data.updated_at
        }
      },
      { headers: publicReadCorsHeaders(request) }
    );
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    return ok({ hero: null }, { headers: publicReadCorsHeaders(request) });
  }
  const { data } = await supabase.from("hero_config").select("*").eq("id", "homepage").maybeSingle();
  return ok({ hero: data ?? null }, { headers: publicReadCorsHeaders(request) });
}
