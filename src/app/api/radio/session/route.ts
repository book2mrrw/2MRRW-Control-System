import { fail, getUserId, ok, parseJson } from "@/server/http";
import { startRadioSession } from "@/server/radio/radioSessionService";
import { z } from "zod";

const sessionSchema = z.object({ channelSlug: z.string().optional() });

export async function POST(request: Request) {
  const body = await parseJson(request, sessionSchema);
  const session = startRadioSession(getUserId(request), body.channelSlug);
  return session ? ok(session) : fail("Radio channel not found", 404);
}
