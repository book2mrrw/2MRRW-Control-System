import { getAccountState } from "@/server/account/accountStateService";
import { getUserId, ok } from "@/server/http";

export async function GET(request: Request) {
  return ok(getAccountState(getUserId(request)));
}
