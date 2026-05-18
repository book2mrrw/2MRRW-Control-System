import { getUserId, ok } from "@/server/http";
import { getPlayerState } from "@/server/playback/playbackService";

export async function GET(request: Request) {
  return ok(getPlayerState(getUserId(request)));
}
