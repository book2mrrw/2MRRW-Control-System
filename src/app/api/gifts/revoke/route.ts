import { fail, ok, parseJson, requireStudioAccess } from "@/server/http";
import { revokeAdminGift } from "@/server/gifts/giftService";
import { z } from "zod";

const bodySchema = z.object({
  gift_id: z.string().uuid()
});

export async function POST(request: Request) {
  try {
    requireStudioAccess(request);
    const body = await parseJson(request, bodySchema);
    const result = await revokeAdminGift(body.gift_id);
    return ok(result);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not revoke gift", 400);
  }
}
