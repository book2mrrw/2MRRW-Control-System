import { getUserId, ok } from "@/server/http";
import { getPlayerState, getPlaybackSummaryDurable } from "@/server/playback/playbackService";

export async function GET(request: Request) {
  const userId = getUserId(request);
  return ok({
    ...getPlayerState(userId),
    ...(await getPlaybackSummaryDurable(userId))
  });
}
