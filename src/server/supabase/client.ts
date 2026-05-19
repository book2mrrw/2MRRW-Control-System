import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { fetchWithTimeout } from "@/server/supabase/fetchWithTimeout";

function nonEmptyEnvValue(value: string | undefined) {
  return value && value.length > 0 ? value : undefined;
}

export function getSupabaseServerKey(env: Record<string, string | undefined> = process.env) {
  return nonEmptyEnvValue(env.SUPABASE_SERVICE_ROLE_KEY) ?? nonEmptyEnvValue(env.SUPABASE_SECRET_KEY);
}

let cachedServerClient: SupabaseClient | null = null;

export function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = getSupabaseServerKey();

  if (!url || !serviceRoleKey) {
    return null;
  }

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
