import { getUserId, ok } from "@/server/http";
import { listVaultContent } from "@/server/vault/vaultService";

export async function GET(request: Request) {
  return ok(listVaultContent(getUserId(request)));
}
