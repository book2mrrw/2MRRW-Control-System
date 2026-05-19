import { fail, ok } from "@/server/http";
import { runScheduledPublishJob } from "@/server/releases/scheduledPublishService";

function authorizeCron(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  if (header === `Bearer ${secret}`) return true;
  return request.headers.get("x-cron-secret") === secret;
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return fail("Unauthorized cron request", 401);
  }
  try {
    const result = await runScheduledPublishJob();
    return ok(result);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Scheduled publish job failed", 500);
  }
}

export async function POST(request: Request) {
  return GET(request);
}
