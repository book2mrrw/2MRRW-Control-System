import { getUserId, ok, parseJson } from "@/server/http";
import { updateSignalStateDurable } from "@/server/signal/signalDeliveryService";
import { trackSignalEventDurable } from "@/server/signal/signalTrackingService";
import { z } from "zod";

const stateSchema = z.object({
  signalId: z.string().min(1),
  state: z.enum(["seen", "dismissed"])
});

export async function POST(request: Request) {
  const userId = getUserId(request);
  const body = await parseJson(request, stateSchema);
  const state = await updateSignalStateDurable(userId, body.signalId, body.state);
  await trackSignalEventDurable(userId, body.signalId, body.state);
  return ok(state);
}
