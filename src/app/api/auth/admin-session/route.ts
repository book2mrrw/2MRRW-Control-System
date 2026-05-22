import { fail, ok } from "@/server/http";
import {
  ADMIN_SESSION_MAX_AGE_MS,
  parseAdminSessionStartedAt,
  setAdminSessionCookie,
  clearAdminSessionCookie,
  isAdminSessionExpired
} from "@/server/auth/adminSession";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return fail("Unauthorized", 401);
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") {
    return fail("Admin account required", 403);
  }

  const response = ok({ startedAt: Date.now(), maxAgeMs: ADMIN_SESSION_MAX_AGE_MS });
  setAdminSessionCookie(response);
  return response;
}

export async function GET(request: Request) {
  const startedAt = parseAdminSessionStartedAt(request.headers.get("cookie"));
  if (isAdminSessionExpired(startedAt)) {
    return fail("Admin session expired", 401);
  }
  const remainingMs = ADMIN_SESSION_MAX_AGE_MS - (Date.now() - (startedAt as number));
  return ok({ startedAt, remainingMs });
}

export async function DELETE() {
  const response = new NextResponse(null, { status: 204 });
  clearAdminSessionCookie(response);
  return response;
}
