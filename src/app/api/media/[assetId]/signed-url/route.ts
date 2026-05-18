import { fail, getUserId, ok } from "@/server/http";
import { createSignedMediaUrl } from "@/server/media/signedUrlService";

const PUBLIC_MEDIA_ORIGINS = new Set(["https://2mrrw-official.vercel.app"]);
const PUBLIC_SIGNABLE_KINDS = ["artwork", "preview", "loop"] as const;

function isAllowedPublicMediaOrigin(origin: string) {
  if (PUBLIC_MEDIA_ORIGINS.has(origin)) return true;
  if (/^https:\/\/2mrrw-official-[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

function publicMediaCorsHeaders(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  const headers = new Headers({
    Vary: "Origin",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-user-id"
  });

  if (origin && isAllowedPublicMediaOrigin(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }

  return headers;
}

function withPublicMediaCors(response: Response, request: Request) {
  publicMediaCorsHeaders(request).forEach((value, key) => {
    response.headers.set(key, value);
  });
  return response;
}

export function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: publicMediaCorsHeaders(request) });
}

export async function GET(request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  const result = await createSignedMediaUrl(request.headers.get("x-user-id"), assetId, {
    publicKinds: [...PUBLIC_SIGNABLE_KINDS]
  });
  return withPublicMediaCors(result.ok ? ok(result) : fail(result.message, result.status), request);
}

export async function POST(request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  const result = await createSignedMediaUrl(getUserId(request), assetId);
  return result.ok ? ok(result) : fail(result.message, result.status);
}
