import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

function isAuthorized(request: Request) {
  const secret = process.env.CONTROL_SYSTEM_ADMIN_API_KEY || process.env.CRON_SECRET;
  if (!secret) return true;
  const header = request.headers.get("authorization") || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const apiKey = request.headers.get("x-control-system-api-key") || "";
  return bearer === secret || apiKey === secret;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const tag = typeof body?.tag === "string" ? body.tag : undefined;
  const path = typeof body?.path === "string" ? body.path : undefined;

  if (tag) revalidateTag(tag, "max");
  if (path) revalidatePath(path);

  return NextResponse.json({ revalidated: true, at: Date.now(), tag: tag ?? null, path: path ?? null });
}
