import { NextResponse } from "next/server";
import { z } from "zod";

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

export function getUserId(request: Request) {
  return request.headers.get("x-user-id") ?? "user_demo";
}

export function getSessionId(request: Request) {
  return request.headers.get("x-session-id") ?? `session_${getUserId(request)}`;
}

export function requireAdmin(request: Request) {
  if (request.headers.get("x-admin") === "true") {
    return;
  }

  throw new Error("Admin privileges required");
}
