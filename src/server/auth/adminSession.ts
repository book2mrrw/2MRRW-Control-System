import type { NextResponse } from "next/server";

/** Control System admin browser sessions — 24h sliding window from sign-in. */
export const ADMIN_SESSION_COOKIE = "2mrrw_admin_session_at";
export const ADMIN_SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const ADMIN_SESSION_MAX_AGE_SEC = 24 * 60 * 60;
export const ADMIN_SESSION_EXPIRED_MESSAGE =
  "Your admin session has expired. Please sign in again.";
export const ADMIN_SESSION_EXPIRED_QUERY = "expired=1";

export function adminSessionLoginPath(requestUrl?: string | URL) {
  const base = requestUrl ? new URL("/login", requestUrl) : new URL("http://localhost/login");
  base.searchParams.set("expired", "1");
  return `${base.pathname}?${base.searchParams.toString()}`;
}

export function parseAdminSessionStartedAt(cookieHeader: string | null): number | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${ADMIN_SESSION_COOKIE}=(\\d+)`));
  if (!match) return null;
  const startedAt = Number(match[1]);
  return Number.isFinite(startedAt) && startedAt > 0 ? startedAt : null;
}

export function isAdminSessionExpired(startedAt: number | null, now = Date.now()) {
  if (startedAt === null) return true;
  return now - startedAt >= ADMIN_SESSION_MAX_AGE_MS;
}

export function adminSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SEC
  };
}

export function setAdminSessionCookie(response: NextResponse, startedAt = Date.now()) {
  response.cookies.set(ADMIN_SESSION_COOKIE, String(startedAt), adminSessionCookieOptions());
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    ...adminSessionCookieOptions(),
    maxAge: 0
  });
}

export function assertAdminSessionActive(request: Request) {
  const startedAt = parseAdminSessionStartedAt(request.headers.get("cookie"));
  if (isAdminSessionExpired(startedAt)) {
    throw new Error(ADMIN_SESSION_EXPIRED_MESSAGE);
  }
}
