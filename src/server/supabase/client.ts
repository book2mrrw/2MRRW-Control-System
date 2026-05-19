import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { fetchWithTimeout } from "@/server/supabase/fetchWithTimeout";
import { isValidSupabaseServiceRoleKey, normalizeServiceRoleKey } from "@/server/supabase/validateServiceRoleKey";

function nonEmptyEnvValue(value: string | undefined) {
  return value && value.length > 0 ? value : undefined;
}

export function getSupabaseServerKey(env: Record<string, string | undefined> = process.env) {
  const raw =
    nonEmptyEnvValue(env.SUPABASE_SERVICE_ROLE_KEY) ?? nonEmptyEnvValue(env.SUPABASE_SECRET_KEY);
  return normalizeServiceRoleKey(raw);
}

export function assertSupabaseServiceRoleKeyConfigured(env: Record<string, string | undefined> = process.env) {
  const key = getSupabaseServerKey(env);
  if (!key) {
    return { ok: false as const, message: "SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY is not set" };
  }
  if (!isValidSupabaseServiceRoleKey(key)) {
    return {
      ok: false as const,
      message:
        "SUPABASE_SERVICE_ROLE_KEY is invalid (expected service-role JWT starting with eyJ, not publishable/anon key)"
    };
  }
  return { ok: true as const, key };
}

let cachedServerClient: SupabaseClient | null = null;

export function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const keyCheck = assertSupabaseServiceRoleKeyConfigured();
  if (!url || !keyCheck.ok) {
    return null;
  }
  const serviceRoleKey = keyCheck.key;

  if (cachedServerClient) {
    return cachedServerClient;
  }

  // This module is server-only; never import it from browser components or expose the service role key.
  cachedServerClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      fetch: fetchWithTimeout
    }
  });
  return cachedServerClient;
}
