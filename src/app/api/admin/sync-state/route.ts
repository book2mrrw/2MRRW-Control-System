import { fail, ok, requireStudioAccess } from "@/server/http";
import { getServerSupabase } from "@/server/supabase/client";

export async function GET(request: Request) {
  try {
    requireStudioAccess(request);
    const supabase = getServerSupabase();
    if (!supabase) {
      return ok({ rows: [], message: "Supabase not configured." });
    }
    const { data, error } = await supabase
      .from("sync_state")
      .select("key, dirty, last_event_at, metadata, updated_at")
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return ok({ rows: data ?? [] });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid sync state request", 400);
  }
}
