import { corsPreflight, getUserId, ok, withCors } from "@/server/http";
import { listPublishedVaultApiSections } from "@/server/vault/vaultPublicApi";
import { listVaultContent } from "@/server/vault/vaultService";

export function OPTIONS(request: Request) {
  return corsPreflight(request);
}

export async function GET(request: Request) {
  const published = await listPublishedVaultApiSections();
  const sections = published.length ? published : listVaultContent(getUserId(request));
  return withCors(
    ok({
      sections,
      vaultAccess: { tier: "public", hasInnerCircleAccess: false, hasVaultPass: false },
      syncedAt: new Date().toISOString()
    }),
    request
  );
}
