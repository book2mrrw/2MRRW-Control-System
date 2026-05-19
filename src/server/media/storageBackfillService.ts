import "server-only";

import { artworkPublicFallbackUrl } from "@/server/media/artworkPublicFallback";
import { getServerSupabase } from "@/server/supabase/client";

export type BackfillCoverResult = {
  slug: string;
  status: string;
  path?: string;
  sourceUrl?: string;
};

export async function backfillPrimaryCoversFromPublicUrls(): Promise<{
  bucket: string;
  results: BackfillCoverResult[];
  uploaded: number;
  failed: number;
}> {
  const supabase = getServerSupabase();
  const bucket = process.env.SUPABASE_MEDIA_BUCKET ?? "protected-media";
  if (!supabase) {
    throw new Error("Supabase unavailable (missing URL or service role key)");
  }

  const { data: rows, error } = await supabase
    .from("releases")
    .select(
      `slug,
      release_media!inner(asset_role,is_primary,media_assets(id,bucket,storage_path))`
    )
    .eq("release_media.asset_role", "cover_art")
    .eq("release_media.is_primary", true);

  if (error || !rows) {
    throw new Error(error?.message ?? "Failed to query releases");
  }

  const results: BackfillCoverResult[] = [];

  for (const row of rows as unknown as Array<{
    slug: string;
    release_media: Array<{
      media_assets: { id: string; bucket: string; storage_path: string } | { id: string; bucket: string; storage_path: string }[];
    }>;
  }>) {
    const rawMedia = row.release_media[0]?.media_assets;
    const asset = Array.isArray(rawMedia) ? rawMedia[0] : rawMedia;
    if (!asset) {
      results.push({ slug: row.slug, status: "no_asset" });
      continue;
    }

    const sourceUrl = artworkPublicFallbackUrl(asset.storage_path);
    if (!sourceUrl) {
      results.push({ slug: row.slug, status: "no_public_url", path: asset.storage_path });
      continue;
    }

    const response = await fetch(sourceUrl, { cache: "no-store" });
    if (!response.ok) {
      results.push({
        slug: row.slug,
        status: `fetch_error:${response.status}`,
        path: asset.storage_path,
        sourceUrl
      });
      continue;
    }

    const body = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") ?? "image/jpeg";

    const { error: uploadError } = await supabase.storage.from(asset.bucket).upload(asset.storage_path, body, {
      upsert: true,
      contentType
    });

    if (uploadError) {
      results.push({
        slug: row.slug,
        status: `upload_error:${uploadError.message}`,
        path: asset.storage_path,
        sourceUrl
      });
      continue;
    }

    results.push({
      slug: row.slug,
      status: "uploaded",
      path: asset.storage_path,
      sourceUrl
    });
  }

  const uploaded = results.filter((r) => r.status === "uploaded").length;
  return { bucket, results, uploaded, failed: results.length - uploaded };
}
