import { getServerSupabase } from "@/server/supabase/client";
import { assertCanAccessMedia } from "@/server/media/mediaAssetService";
import type { MediaAssetContract } from "@/server/media/mediaObjects";

export async function createSignedMediaUrl(
  userId: string | null | undefined,
  assetId: string,
  options: { publicKinds?: MediaAssetContract["kind"][] } = {}
) {
  const access = assertCanAccessMedia(userId, assetId, options);
  if (!access.allowed || !access.asset) {
    return { ok: false as const, status: access.asset ? 403 : 404, message: access.reason };
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    return {
      ok: true as const,
      url: `https://signed.local/${access.asset.bucket}/${access.asset.path}?asset=${assetId}`,
      expiresIn: 300,
      mocked: true
    };
  }

  const { data, error } = await supabase.storage
    .from(access.asset.bucket)
    .createSignedUrl(access.asset.path, 300);

  if (error || !data?.signedUrl) {
    return { ok: false as const, status: 502, message: error?.message ?? "Unable to create signed URL" };
  }

  return { ok: true as const, url: data.signedUrl, expiresIn: 300, mocked: false };
}
