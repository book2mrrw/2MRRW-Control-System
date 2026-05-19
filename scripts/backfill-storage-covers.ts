/**
 * Upload primary cover_art files from artist-platform into Supabase Storage
 * at paths recorded in media_assets (protected-media bucket).
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvLocal } from "@/server/lib/loadEnvLocal";

loadEnvLocal();

const ARTIST_PLATFORM = process.env.ARTIST_PLATFORM_ROOT ?? "/Users/recharge/artist-platform";

const COVER_SOURCES: Record<string, string> = {
  "2-heavy": "public/images/features/2heavy.jpg",
  ad: "public/images/albums/ad.jpg",
  artificial: "public/images/singles/artificial.jpg",
  "hour-glass": "public/images/singles/hourglass.jpg",
  "i-dont-believe-you": "public/images/features/idbu.jpg",
  "love-hz": "public/images/albums/lovehz.jpg",
  tbh: "public/images/albums/tbh.jpg",
  "turnt-me-2-dis": "/tmp/turnt-cover.jpg",
  w2d: "public/images/singles/w2d.jpg"
};

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_MEDIA_BUCKET ?? "protected-media";
  if (!url || !key || key.startsWith("npx ")) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: rows, error } = await supabase
    .from("releases")
    .select(
      `slug,
      release_media!inner(asset_role,is_primary,media_assets(id,bucket,storage_path))`
    )
    .eq("release_media.asset_role", "cover_art")
    .eq("release_media.is_primary", true);

  if (error || !rows) {
    console.error("Query failed:", error?.message);
    process.exit(1);
  }

  const results: Array<{ slug: string; status: string; path?: string }> = [];

  for (const row of rows as unknown as Array<{
    slug: string;
    release_media: Array<{ media_assets: { id: string; bucket: string; storage_path: string } }>;
  }>) {
    const asset = row.release_media[0]?.media_assets;
    if (!asset) {
      results.push({ slug: row.slug, status: "no_asset" });
      continue;
    }

    const relSource = COVER_SOURCES[row.slug];
    if (!relSource) {
      results.push({ slug: row.slug, status: "no_source_map" });
      continue;
    }

    const localPath = relSource.startsWith("/") ? relSource : resolve(ARTIST_PLATFORM, relSource);
    if (!existsSync(localPath)) {
      results.push({ slug: row.slug, status: "missing_file", path: localPath });
      continue;
    }

    const contentType = localPath.endsWith(".mp4") ? "video/mp4" : "image/jpeg";
    const body = readFileSync(localPath);

    const { error: uploadError } = await supabase.storage.from(asset.bucket).upload(asset.storage_path, body, {
      upsert: true,
      contentType
    });

    if (uploadError) {
      results.push({ slug: row.slug, status: `upload_error:${uploadError.message}` });
      continue;
    }

    results.push({ slug: row.slug, status: "uploaded", path: asset.storage_path });
  }

  console.log(JSON.stringify({ bucket, results }, null, 2));
  const failed = results.filter((r) => r.status !== "uploaded");
  if (failed.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
