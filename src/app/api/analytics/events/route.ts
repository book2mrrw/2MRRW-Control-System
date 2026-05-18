import { getUserId, ok, parseJson } from "@/server/http";
import { recordAnalyticsEvent } from "@/server/analytics/analyticsService";
import { z } from "zod";

const analyticsSchema = z.object({
  eventType: z.string().min(1),
  properties: z.record(z.string(), z.unknown()).default({})
});

export async function POST(request: Request) {
  const body = await parseJson(request, analyticsSchema);
  return ok(recordAnalyticsEvent(getUserId(request), body.eventType, body.properties));
}
