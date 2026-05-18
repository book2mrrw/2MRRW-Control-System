import { getUserId, ok, parseJson } from "@/server/http";
import { recordRadioInteraction } from "@/server/radio/radioFeedService";
import { z } from "zod";

const interactionSchema = z.object({
  channelId: z.string().min(1),
  kind: z.string().min(1),
  itemId: z.string().min(1)
});

export async function POST(request: Request) {
  const body = await parseJson(request, interactionSchema);
  return ok(recordRadioInteraction(getUserId(request), body.channelId, body.kind, body.itemId));
}
