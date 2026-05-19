import { NextResponse, type NextRequest } from "next/server";

const DEFAULT_FRONTEND_ORIGINS = [
  "https://artist-platform-silk.vercel.app",
  "https://2mrrw-official.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
];

function configuredFrontendOrigins() {
  return [
    ...DEFAULT_FRONTEND_ORIGINS,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.CONTROL_SYSTEM_ALLOWED_ORIGINS
  ]
    .flatMap((value) => String(value || "").split(","))
    .map((value) => value.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

function isAllowedFrontendOrigin(origin: string | null) {
  if (!origin) return false;
  const normalized = origin.replace(/\/+$/, "");
  if (configuredFrontendOrigins().includes(normalized)) return true;
  if (/^https:\/\/artist-platform-silk-[a-z0-9-]+\.vercel\.app$/i.test(normalized)) return true;
  if (/^https:\/\/2mrrw-official-[a-z0-9-]+\.vercel\.app$/i.test(normalized)) return true;
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalized);
}

function applyApiCors(response: NextResponse, request: NextRequest) {
  const origin = request.headers.get("origin");
  response.headers.set("Vary", "Origin");
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    [
      "Accept",
      "Content-Type",
      "Stripe-Signature",
      "x-control-session-id",
      "x-control-system-signature",
      "x-control-system-timestamp",
      "x-control-user-id",
      "x-guest-user-id",
      "x-session-id",
      "x-user-id"
    ].join(", ")
  );

  if (isAllowedFrontendOrigin(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin || "");
  }

  return response;
}

export function proxy(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return applyApiCors(new NextResponse(null, { status: 204 }), request);
  }

  return applyApiCors(NextResponse.next(), request);
}

export const config = {
  matcher: "/api/:path*"
};
