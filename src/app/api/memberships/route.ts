import { getAccountState } from "@/server/account/accountStateService";
import { getUserId, ok } from "@/server/http";

export async function GET(request: Request) {
  return ok({ tiers: getAccountState(getUserId(request)).permissions.membershipTiers });
}
