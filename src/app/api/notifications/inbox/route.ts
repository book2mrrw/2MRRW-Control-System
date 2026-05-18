import { getUserId, ok } from "@/server/http";
import { listInbox } from "@/server/notifications/notificationService";

export async function GET(request: Request) {
  return ok(listInbox(getUserId(request)));
}
