import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { assertAdminSessionActive, ADMIN_SESSION_EXPIRED_MESSAGE } from "@/server/auth/adminSession";
import { getPublicR2Url, r2Client, R2_BUCKET } from "@/lib/storage/r2";
import { getSupabasePublicConfig } from "@/utils/supabase/config";

const ALLOWED_ARTWORK_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_AUDIO_TYPES = ["audio/wav", "audio/aiff", "audio/x-aiff", "audio/flac", "audio/x-flac", "audio/mpeg"];

async function requireAdmin(request: Request) {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabasePublicConfig();
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {},
    },
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).maybeSingle();
  if (profile?.role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  try {
    assertAdminSessionActive(request);
  } catch {
    return { error: NextResponse.json({ error: ADMIN_SESSION_EXPIRED_MESSAGE }, { status: 401 }) };
  }

  return { supabase };
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth && auth.error) return auth.error;

  if (!R2_BUCKET) {
    return NextResponse.json({ error: "R2 bucket not configured" }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const type = body?.type;
  const releaseId = body?.releaseId;
  const trackId = body?.trackId;
  const contentType = body?.contentType;
  const ext = String(body?.ext || "bin").replace(/^\./, "");

  if (!releaseId) {
    return NextResponse.json({ error: "releaseId required" }, { status: 400 });
  }

  let r2Key: string;
  if (type === "artwork") {
    if (!ALLOWED_ARTWORK_TYPES.includes(contentType)) {
      return NextResponse.json({ error: "Invalid artwork type" }, { status: 400 });
    }
    r2Key = `releases/${releaseId}/artwork.${ext}`;
  } else if (type === "master") {
    if (!trackId) {
      return NextResponse.json({ error: "trackId required for master" }, { status: 400 });
    }
    if (!ALLOWED_AUDIO_TYPES.includes(contentType)) {
      return NextResponse.json({ error: "Invalid audio type" }, { status: 400 });
    }
    r2Key = `releases/${releaseId}/tracks/${trackId}/master.${ext}`;
  } else {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: r2Key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
  const publicUrl = getPublicR2Url(r2Key);

  return NextResponse.json({ uploadUrl, publicUrl, r2Key });
}
