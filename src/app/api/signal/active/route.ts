import { getUserId, ok } from "@/server/http";
import { listActiveSignalsDurable } from "@/server/signal/signalDeliveryService";

export async function GET(request: Request) {
  return ok(await listActiveSignalsDurable(getUserId(request)));
}
