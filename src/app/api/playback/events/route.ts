import { getSessionId, getUserId, ok, parseJson } from "@/server/http";
import { trackPlaybackEvent } from "@/server/releases/releaseReadService";
import { z } from "zod";

const playbackEventSchema = z.object({
  trackId: z.string().min(1),
  releaseId: z.string().optional(),
  eventType: z.enum(["play", "pause", "progress", "complete", "skip"]),
  positionSeconds: z.number().nonnegative().optional(),
  listenedSeconds: z.number().nonnegative().optional(),
  durationSeconds: z.number().nonnegative().optional(),
  countryCode: z.string().length(2).optional()
});

export async function POST(request: Request) {
  return ok(
    trackPlaybackEvent(getUserId(request), {
      ...(await parseJson(request, playbackEventSchema)),
      sessionId: getSessionId(request)
    })
  );
}
