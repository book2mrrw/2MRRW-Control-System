import { fail, ok, requireStudioAccess } from "@/server/http";
import { listAdminGifts } from "@/server/gifts/giftService";

export async function GET(request: Request) {
  try {
    requireStudioAccess(request);
    const data = await listAdminGifts();
    return ok(data);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not load gifts", 500);
  }
}
