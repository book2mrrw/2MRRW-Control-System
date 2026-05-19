import { ok } from "@/server/http";
import { assertSupabaseServiceRoleKeyConfigured, getServerSupabase } from "@/server/supabase/client";
import { SUPABASE_FETCH_TIMEOUT_MS } from "@/server/supabase/fetchWithTimeout";

const HEALTH_DB_TIMEOUT_MS = Math.min(SUPABASE_FETCH_TIMEOUT_MS, 10_000);

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

export async function GET() {
  const started = Date.now();
  const keyCheck = assertSupabaseServiceRoleKeyConfigured();
  if (!keyCheck.ok) {
    return ok(
      {
        ok: false,
        timestamp: new Date().toISOString(),
        timingMs: Date.now() - started,
        message: keyCheck.message
      },
      { status: 503 }
    );
  }

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

  let count: number | null = null;
  let error: { message: string } | null = null;
  try {
    const result = await withTimeout(
      Promise.resolve(supabase.from("releases").select("id", { count: "exact", head: true }).limit(1)),
      HEALTH_DB_TIMEOUT_MS,
      "Supabase releases count"
    );
    count = result.count;
    error = result.error;
  } catch (caught) {
    const timingMs = Date.now() - started;
    const message = caught instanceof Error ? caught.message : "Supabase query failed";
    return ok(
      {
        ok: false,
        timestamp: new Date().toISOString(),
        timingMs,
        message
      },
      { status: 503 }
    );
  }

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
