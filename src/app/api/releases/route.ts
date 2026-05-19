import { getLatestReleasesDurable } from "@/server/releases/releaseReadService";
import { getUserId, ok } from "@/server/http";
import type { PublicReleaseCategory, PublicReleaseType } from "@/server/releases/releaseService";

const PUBLIC_FRONTEND_ORIGINS = new Set([
  "https://2mrrw.com",
  "https://www.2mrrw.com",
  "https://artist-platform-silk.vercel.app",
  "https://2mrrw-official.vercel.app"
]);

function isAllowedPublicFrontendOrigin(origin: string) {
  if (PUBLIC_FRONTEND_ORIGINS.has(origin)) return true;
  if (/^https:\/\/artist-platform-silk-[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;
  if (/^https:\/\/2mrrw-official-[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

function publicReadCorsHeaders(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  const headers = new Headers({
    Vary: "Origin",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-user-id"
  });

  if (origin && isAllowedPublicFrontendOrigin(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }

  return headers;
}

export function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: publicReadCorsHeaders(request) });
}

function parseReleaseType(value: string | null): PublicReleaseType | undefined {
  if (value === "single" || value === "album" || value === "ep" || value === "feature" || value === "deluxe" || value === "remix_pack") {
    return value;
  }

  return undefined;
}

function parseReleaseCategory(value: string | null): PublicReleaseCategory | undefined {
  if (value === "single" || value === "album" || value === "feature") {
    return value;
  }

  return undefined;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? 12);
  const typeParam = url.searchParams.get("type");
  const releaseCategory = parseReleaseCategory(url.searchParams.get("category") ?? url.searchParams.get("releaseCategory") ?? typeParam);
  const releaseType = parseReleaseType(url.searchParams.get("releaseType")) ?? (releaseCategory ? undefined : parseReleaseType(typeParam));
  return ok(await getLatestReleasesDurable({ limit: Number.isFinite(limit) ? limit : 12, userId: getUserId(request), releaseType, releaseCategory }), {
    headers: publicReadCorsHeaders(request)
  });
}
