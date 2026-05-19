import { listSyncEventsAfter } from "@/server/events/syncEventPersistenceService";

const PUBLIC_FRONTEND_ORIGINS = new Set(["https://2mrrw-official.vercel.app"]);

function isAllowedPublicFrontendOrigin(origin: string) {
  if (PUBLIC_FRONTEND_ORIGINS.has(origin)) return true;
  if (/^https:\/\/2mrrw-official-[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

function replayCorsHeaders(request: Request) {
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
  return new Response(null, { status: 204, headers: replayCorsHeaders(request) });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lastEventTime = url.searchParams.get("lastEventTime");
  const limit = Number(url.searchParams.get("limit") ?? 100);
  const replay = await listSyncEventsAfter(lastEventTime, Number.isFinite(limit) ? limit : 100);
  return Response.json(replay.events, {
    headers: replayCorsHeaders(request)
  });
}
