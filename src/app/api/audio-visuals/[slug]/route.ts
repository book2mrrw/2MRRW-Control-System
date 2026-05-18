import { getAudioVisualBySlug } from "@/server/audio-visuals/audioVisualService";
import { fail, ok } from "@/server/http";

const PUBLIC_FRONTEND_ORIGINS = new Set([
  "https://2mrrw-official.vercel.app",
  "https://artist-platform.vercel.app"
]);

function isAllowedPublicFrontendOrigin(origin: string) {
  if (PUBLIC_FRONTEND_ORIGINS.has(origin)) return true;
  if (/^https:\/\/2mrrw-official-[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;
  if (/^https:\/\/artist-platform-[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

function publicReadCorsHeaders(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  const headers = new Headers({
    Vary: "Origin",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });

  if (origin && isAllowedPublicFrontendOrigin(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }

  return headers;
}

function withPublicReadCors(response: Response, request: Request) {
  publicReadCorsHeaders(request).forEach((value, key) => {
    response.headers.set(key, value);
  });
  return response;
}

export function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: publicReadCorsHeaders(request) });
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const visual = await getAudioVisualBySlug(slug, { publicOnly: true });
  return visual ? ok(visual, { headers: publicReadCorsHeaders(request) }) : withPublicReadCors(fail("Audio visual not found", 404), request);
}
