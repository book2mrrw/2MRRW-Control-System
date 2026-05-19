import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";

const DEFAULT_FRONTEND_ORIGINS = [
  "https://artist-platform-silk.vercel.app",
  "https://2mrrw-official.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
];

const IDENTITY_HEADER_NAMES = ["x-user-id", "x-control-user-id", "x-guest-user-id"];

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

export function isAllowedFrontendOrigin(origin: string | null) {
  if (!origin) return false;
  const normalized = origin.replace(/\/+$/, "");
  if (configuredFrontendOrigins().includes(normalized)) return true;
  if (/^https:\/\/artist-platform-silk-[a-z0-9-]+\.vercel\.app$/i.test(normalized)) return true;
  if (/^https:\/\/2mrrw-official-[a-z0-9-]+\.vercel\.app$/i.test(normalized)) return true;
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalized);
}

export function corsHeaders(request: Request) {
  const origin = request.headers.get("origin");
  const headers = new Headers({
    Vary: "Origin",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": [
      "Accept",
      "Content-Type",
      "Stripe-Signature",
      "x-control-user-id",
      "x-control-session-id",
      "x-control-system-signature",
      "x-control-system-timestamp",
      "x-guest-user-id",
      "x-session-id",
      "x-user-id"
    ].join(", ")
  });

  if (origin && isAllowedFrontendOrigin(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }

  return headers;
}

export function withCors<T extends Response>(response: T, request: Request) {
  corsHeaders(request).forEach((value, key) => {
    response.headers.set(key, value);
  });
  return response;
}

export function corsPreflight(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function created<T>(data: T) {
  return ok(data, { status: 201 });
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: { message, details } }, { status });
}

export async function parseJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  const body = await request.json().catch(() => ({}));
  return schema.parse(body);
}

function firstHeaderValue(request: Request, names: string[]) {
  for (const name of names) {
    const value = request.headers.get(name);
    if (value?.trim()) return value.trim();
  }
  return null;
}

function signIdentityPayload(userId: string, sessionId: string, timestamp: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(`${userId}.${sessionId}.${timestamp}`).digest("hex");
}

function isTrustedIdentityHeader(request: Request, userId: string, sessionId: string) {
  const secret = process.env.CONTROL_SYSTEM_FRONTEND_SHARED_SECRET;
  if (!secret) {
    const origin = request.headers.get("origin");
    return process.env.NODE_ENV !== "production" && (!origin || isAllowedFrontendOrigin(origin));
  }

  const timestamp = request.headers.get("x-control-system-timestamp") ?? "";
  const signature = request.headers.get("x-control-system-signature") ?? "";
  const issuedAt = Number(timestamp);
  if (!Number.isFinite(issuedAt) || Math.abs(Date.now() - issuedAt) > 1000 * 60 * 5) return false;

  const expected = signIdentityPayload(userId, sessionId, timestamp, secret);
  return signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export function getResolvedIdentity(request: Request) {
  const sessionId =
    firstHeaderValue(request, ["x-control-session-id", "x-session-id"]) ??
    request.headers.get("cf-ray") ??
    crypto.createHash("sha256").update(`${request.headers.get("user-agent") ?? "unknown"}:${request.headers.get("x-forwarded-for") ?? "local"}`).digest("hex").slice(0, 24);
  const headerUserId = firstHeaderValue(request, IDENTITY_HEADER_NAMES);
  const userId = headerUserId && isTrustedIdentityHeader(request, headerUserId, sessionId) ? headerUserId : null;

  return {
    userId,
    sessionId,
    analyticsUserId: userId ?? `anon_${crypto.createHash("sha256").update(sessionId).digest("hex").slice(0, 24)}`
  };
}

export function getUserId(request: Request) {
  return getResolvedIdentity(request).analyticsUserId;
}

export function getAuthenticatedUserId(request: Request) {
  const { userId } = getResolvedIdentity(request);
  if (!userId) {
    throw new Error("Authenticated user identity required");
  }
  return userId;
}

export function getSessionId(request: Request) {
  return getResolvedIdentity(request).sessionId;
}

export function requireAdmin(request: Request) {
  const adminToken = process.env.CONTROL_SYSTEM_ADMIN_API_KEY;
  const suppliedToken = request.headers.get("x-admin-token") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (adminToken && suppliedToken && suppliedToken === adminToken) {
    return;
  }

  if (!adminToken && process.env.NODE_ENV !== "production" && request.headers.get("x-admin") === "true") {
    return;
  }

  throw new Error("Admin privileges required");
}

function isSameOriginStudioRequest(request: Request) {
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite === "same-origin" || secFetchSite === "same-site") {
    return true;
  }

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const origin = request.headers.get("origin");
  if (!host || !origin) {
    return false;
  }

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Allows Control System browser sessions (same-origin) without client admin tokens. */
export function requireStudioAccess(request: Request) {
  try {
    requireAdmin(request);
    return;
  } catch {
    if (isSameOriginStudioRequest(request)) {
      return;
    }
    throw new Error("Studio access required");
  }
}
