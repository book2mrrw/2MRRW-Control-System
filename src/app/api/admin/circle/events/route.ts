import { fail, ok, parseJson, requireAdmin } from "@/server/http";
import { circleEventTypes, createCircleEvent } from "@/server/community/circleEventService";
import { z } from "zod";

const circleEventSchema = z.object({
  type: z.enum(circleEventTypes),
  actorId: z.string().min(1).optional(),
  actorDisplayName: z.string().min(1).optional(),
  targetUserId: z.string().min(1).optional(),
  postId: z.string().min(1).optional(),
  commentId: z.string().min(1).optional(),
  audience: z.enum(["public", "members", "inner_circle", "vault"]).optional(),
  payload: z.record(z.string(), z.unknown()).optional()
});

export async function POST(request: Request) {
  try {
    requireAdmin(request);
    return ok(createCircleEvent(await parseJson(request, circleEventSchema)));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid Circle event request", 400);
  }
}
