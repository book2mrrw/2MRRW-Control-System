import { getNotificationSummary, updateNotificationPreferences } from "@/server/notifications/notificationService";
import { getUserId, ok, parseJson } from "@/server/http";
import { z } from "zod";

const preferencesSchema = z.record(z.string(), z.boolean());

export async function GET(request: Request) {
  return ok(getNotificationSummary(getUserId(request)).preferences);
}

export async function POST(request: Request) {
  return ok(updateNotificationPreferences(getUserId(request), await parseJson(request, preferencesSchema)));
}
