import { NextResponse } from "next/server";

import { requireAdmin } from "@/server/http";
import { getServerSupabase } from "@/server/supabase/client";
import { buildProductionHealthStatus, getEnvironmentSafety } from "@/server/release-management/releaseLifecycleService";

// This endpoint is expensive. Do not poll. Use /api/health/basic for uptime checks.

const requiredEnvKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
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
  "PRINTFUL_API_KEY",
  "CLOUDFLARE_R2_ACCOUNT_ID",
  "CLOUDFLARE_R2_ACCESS_KEY_ID",
  "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
  "CLOUDFLARE_R2_BUCKET_NAME",
  "CLOUDFLARE_R2_ENDPOINT",
  "NEXT_PUBLIC_R2_PUBLIC_URL"
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
  "validation_flags",
  "release_revisions",
  "release_activity_events",
  "system_tags",
  "release_tags",
  "media_dependencies",
  "media_processing_jobs",
  "release_role_assignments",
  "creator_sessions",
  "creator_notifications",
  "draft_session_snapshots",
  "feature_flags",
  "observability_events",
  "rollback_plans",
  "media_rights_attributions",
  "search_index_documents"
] as const;

function hasEnv(key: string) {
  return Boolean(process.env[key]);
}

export async function GET(request: Request) {
  try {
    requireAdmin(request);
  } catch {
    return NextResponse.json({ error: { message: "Admin privileges required" } }, { status: 403 });
  }

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
    const tableResults = await Promise.all(
      checkedTables.map(async (table) => {
        const { error } = await supabase.from(table).select("*", { count: "exact", head: true });
        return { table, error };
      })
    );

    for (const { table, error } of tableResults) {
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
      },
      operations: buildProductionHealthStatus(),
      environment: getEnvironmentSafety()
    }
  };

  return NextResponse.json(payload, {
    status: payload.ok ? 200 : 503
  });
}
