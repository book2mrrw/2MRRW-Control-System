import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_SESSION_EXPIRED_MESSAGE,
  clearAdminSessionCookie,
  isAdminSessionExpired,
  parseAdminSessionStartedAt
} from "@/server/auth/adminSession";
import { isAdminUserId } from "@/lib/auth/adminAuth";
import { getSupabasePublicConfig } from "@/utils/supabase/config";

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

async function applyAuthGuard(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, publishableKey } = getSupabasePublicConfig();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  const {
    data: { session }
  } = await supabase.auth.getSession();

  const isLoginPage = request.nextUrl.pathname === "/login";
  const isPublicPage =
    isLoginPage ||
    request.nextUrl.pathname === "/api/revalidate" ||
    request.nextUrl.pathname === "/api/auth/admin-session";

  const isAdminUser = isAdminUserId(session?.user?.id);

  if (!session && !isPublicPage) {
    const loginUrl = new URL("/login", request.url);
    const returnTo = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    if (returnTo && returnTo !== "/") {
      loginUrl.searchParams.set("returnTo", returnTo);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (session && isLoginPage && isAdminUser) {
    const returnTo = request.nextUrl.searchParams.get("returnTo");
    const destination = returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/dashboard";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  return response;
}

async function applyAdminSessionApiGuard(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const needsAdminSession =
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/gifts") ||
    pathname === "/api/r2/presign";

  if (!needsAdminSession) {
    return applyApiCors(NextResponse.next(), request);
  }

  const startedAt = parseAdminSessionStartedAt(request.headers.get("cookie") ?? "");
  if (!isAdminSessionExpired(startedAt)) {
    return applyApiCors(NextResponse.next(), request);
  }

  const response = applyApiCors(
    NextResponse.json({ error: { message: ADMIN_SESSION_EXPIRED_MESSAGE } }, { status: 401 }),
    request
  );
  clearAdminSessionCookie(response);
  return response;
}

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api")) {
    if (request.method === "OPTIONS") {
      return applyApiCors(new NextResponse(null, { status: 204 }), request);
    }
    if (request.nextUrl.pathname === "/api/auth/admin-session") {
      return applyApiCors(NextResponse.next(), request);
    }
    return applyAdminSessionApiGuard(request);
  }

  return applyAuthGuard(request);
}

export const config = {
  matcher: ["/api/:path*", "/((?!_next/static|_next/image|favicon.ico).*)"]
};
