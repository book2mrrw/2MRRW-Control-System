import { listAudioVisuals } from "@/server/audio-visuals/audioVisualService";
import { ok } from "@/server/http";

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
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? 24);
  const visuals = await listAudioVisuals({ publicOnly: true, limit: Number.isFinite(limit) ? limit : 24 });
  return ok({ visuals, count: visuals.length }, { headers: publicReadCorsHeaders(request) });
}
