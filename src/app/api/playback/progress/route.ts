import { getSessionId, getUserId, ok, parseJson } from "@/server/http";
import { trackPlaybackEvent } from "@/server/releases/releaseReadService";
import { z } from "zod";

const progressSchema = z.object({
  trackId: z.string().min(1),
  releaseId: z.string().optional(),
  positionSeconds: z.number().nonnegative(),
  listenedSeconds: z.number().nonnegative().optional()
});

export async function POST(request: Request) {
  const body = await parseJson(request, progressSchema);
  return ok(
    trackPlaybackEvent(getUserId(request), {
      ...body,
      eventType: "progress",
      sessionId: getSessionId(request)
    })
  );
}
