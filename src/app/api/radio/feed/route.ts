import { fail, ok } from "@/server/http";
import { getRadioFeed } from "@/server/radio/radioFeedService";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const feed = getRadioFeed(url.searchParams.get("channel") ?? "main");
  return feed ? ok(feed) : fail("Radio channel not found", 404);
}
