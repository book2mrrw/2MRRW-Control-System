import { NextResponse } from "next/server";

import { getServerSupabase } from "@/server/supabase/client";

const requiredEnvKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_MEDIA_BUCKET"
] as const;

const optionalEnvKeys = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SECRET_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "ADMIN_SEED_SECRET",
  "GUEST_SESSION_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "PRINTFUL_API_KEY"
] as const;

const checkedTables = [
  "artists",
  "releases",
  "contributors",
  "release_contributors",
  "tracks",
  "track_songwriters",
  "track_contributors",
  "artwork",
  "distribution_targets",
  "release_sessions",
  "validation_flags"
] as const;

function hasEnv(key: string) {
  return Boolean(process.env[key]);
}

export async function GET() {
  const env = Object.fromEntries(
    [...requiredEnvKeys, ...optionalEnvKeys].map((key) => [key, hasEnv(key)])
  );

  const missingRequired: string[] = requiredEnvKeys.filter((key) => !hasEnv(key));
  const hasServerKey = hasEnv("SUPABASE_SERVICE_ROLE_KEY") || hasEnv("SUPABASE_SECRET_KEY");

  if (!hasServerKey) {
    missingRequired.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = getServerSupabase();
  let missingTables: string[] = [];
  let databaseError: string | null = null;

  if (!supabase) {
    databaseError = "Supabase server client is not configured.";
    missingTables = [...checkedTables];
  } else {
    for (const table of checkedTables) {
      const { error } = await supabase.from(table).select("*", { count: "exact", head: true });

      if (error) {
        missingTables.push(table);
        databaseError ??= error.message;
      }
    }
  }

  const payload = {
    ok: missingRequired.length === 0 && missingTables.length === 0 && !databaseError,
    checks: {
      env: {
        ok: missingRequired.length === 0,
        env,
        missingRequired
      },
      database: {
        ok: missingTables.length === 0 && !databaseError,
        checkedTables,
        missingTables,
        error: databaseError
      }
    }
  };

  return NextResponse.json(payload, {
    status: payload.ok ? 200 : 503
  });
}
