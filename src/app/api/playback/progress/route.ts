import { fail, getSessionId, getUserId, ok } from "@/server/http";
import { trackPlaybackEventDurable } from "@/server/releases/releaseReadService";
import { z } from "zod";

const progressSchema = z.object({
  trackId: z.string().min(1),
  releaseId: z.string().optional(),
  positionSeconds: z.number().nonnegative(),
  listenedSeconds: z.number().nonnegative().optional()
});

export async function POST(request: Request) {
  const raw = await request.json().catch(() => ({}));
  const parsed = progressSchema.safeParse({
    ...raw,
    trackId: raw.trackId ?? raw.controlSystemTrackId ?? raw.control_system_track_id ?? raw.slug,
    releaseId: raw.releaseId ?? raw.controlSystemReleaseId ?? raw.control_system_release_id
  });
  if (!parsed.success) {
    return fail("Invalid playback progress payload", 400, parsed.error.flatten());
  }

  const body = parsed.data;
  return ok(
    await trackPlaybackEventDurable(getUserId(request), {
      ...body,
      eventType: "progress",
      sessionId: getSessionId(request)
    })
  );
}
