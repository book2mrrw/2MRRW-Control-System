import { corsPreflight, getUserId, ok, withCors } from "@/server/http";
import { listVaultContent } from "@/server/vault/vaultService";

export function OPTIONS(request: Request) {
  return corsPreflight(request);
}

export async function GET(request: Request) {
  return withCors(ok(listVaultContent(getUserId(request))), request);
}
