import { getUserId, ok } from "@/server/http";
import { listActiveSignals } from "@/server/signal/signalDeliveryService";

export async function GET(request: Request) {
  return ok(listActiveSignals(getUserId(request)));
}
