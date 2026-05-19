import { ok } from "@/server/http";
import { getServerSupabase } from "@/server/supabase/client";

export async function GET() {
  const started = Date.now();
  const supabase = getServerSupabase();

  if (!supabase) {
    return ok(
      {
        ok: false,
        timestamp: new Date().toISOString(),
        timingMs: Date.now() - started,
        message: "Supabase not configured"
      },
      { status: 503 }
    );
  }

  const { count, error } = await supabase
    .from("releases")
    .select("id", { count: "exact", head: true })
    .limit(1);

  const timingMs = Date.now() - started;

  if (error) {
    return ok(
      {
        ok: false,
        timestamp: new Date().toISOString(),
        timingMs,
        message: error.message
      },
      { status: 503 }
    );
  }

  return ok({
    ok: true,
    timestamp: new Date().toISOString(),
    timingMs,
    releases: count ?? 0
  });
}
