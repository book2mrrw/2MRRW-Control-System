/**
 * Upload primary cover_art into Supabase Storage.
 * Fetches source images from artist-platform public URLs (works locally and on Vercel).
 *
 * Local: requires SUPABASE_SERVICE_ROLE_KEY in .env.local (copy from Supabase dashboard if vercel pull redacts).
 * Production: POST /api/admin/ops/backfill-covers with Authorization: Bearer $CRON_SECRET
 */
import { loadEnvLocal } from "@/server/lib/loadEnvLocal";
import { backfillPrimaryCoversFromPublicUrls } from "@/server/media/storageBackfillService";

loadEnvLocal();

const result = await backfillPrimaryCoversFromPublicUrls();
console.log(JSON.stringify(result, null, 2));
if (result.failed > 0) process.exitCode = 1;
