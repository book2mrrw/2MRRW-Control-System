import { fail, ok } from "@/server/http";
import { backfillPrimaryCoversFromPublicUrls } from "@/server/media/storageBackfillService";

function authorizeOps(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  if (header === `Bearer ${secret}`) return true;
  return request.headers.get("x-cron-secret") === secret;
}

export async function POST(request: Request) {
  if (!authorizeOps(request)) {
    return fail("Unauthorized ops request", 401);
  }
  try {
    const result = await backfillPrimaryCoversFromPublicUrls();
    return ok(result);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Cover backfill failed", 500);
  }
}

export async function GET(request: Request) {
  return POST(request);
}
