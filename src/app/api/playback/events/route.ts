import { fail, getSessionId, getUserId, ok } from "@/server/http";
import { trackPlaybackEventDurable } from "@/server/releases/releaseReadService";
import { z } from "zod";

const playbackEventTypes = ["play", "pause", "progress", "complete", "skip"] as const;

const playbackEventSchema = z.object({
  trackId: z.string().min(1),
  releaseId: z.string().optional(),
  eventType: z.enum(playbackEventTypes),
  positionSeconds: z.number().nonnegative().optional(),
  listenedSeconds: z.number().nonnegative().optional(),
  durationSeconds: z.number().nonnegative().optional(),
  countryCode: z.string().length(2).optional()
});

function normalizeEventType(value: unknown): (typeof playbackEventTypes)[number] {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "replay") return "play";
  if (normalized === "seek" || normalized === "save" || normalized === "queue_add") return "progress";
  return playbackEventTypes.includes(normalized as (typeof playbackEventTypes)[number])
    ? (normalized as (typeof playbackEventTypes)[number])
    : "progress";
}

export async function POST(request: Request) {
  const raw = await request.json().catch(() => ({}));
  const parsed = playbackEventSchema.safeParse({
    ...raw,
    trackId: raw.trackId ?? raw.controlSystemTrackId ?? raw.control_system_track_id ?? raw.slug,
    releaseId: raw.releaseId ?? raw.controlSystemReleaseId ?? raw.control_system_release_id,
    eventType: normalizeEventType(raw.eventType ?? raw.event_type)
  });

  if (!parsed.success) {
    return fail("Invalid playback event payload", 400, parsed.error.flatten());
  }

  return ok(
    await trackPlaybackEventDurable(getUserId(request), {
      ...parsed.data,
      sessionId: getSessionId(request)
    })
  );
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  const allowed = [
    "https://www.2mrrw.com",
    "https://2mrrw.com",
    "https://artist-platform-silk.vercel.app",
    "http://localhost:3000",
  ];
  const allowOrigin = allowed.includes(origin) ? origin : allowed[0];
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": allowOrigin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}
