import { fail, getUserId, ok } from "@/server/http";
import { createSignedMediaUrl } from "@/server/media/signedUrlService";
import { getVaultContentMedia } from "@/server/vault/vaultService";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const content = getVaultContentMedia(getUserId(request), id);
  if (!content) {
    return fail("Vault content not found or not entitled", 404);
  }

  const signed = await createSignedMediaUrl(getUserId(request), content.assetId);
  return signed.ok ? ok(signed) : fail(signed.message, signed.status);
}
