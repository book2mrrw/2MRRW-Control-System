import { fail, ok, requireAdmin } from "@/server/http";
import { publishAudioVisual } from "@/server/audio-visuals/audioVisualService";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireAdmin(request);
    const { id } = await params;
    const visual = await publishAudioVisual(id);
    return visual ? ok(visual) : fail("Audio visual not found", 404);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid audio visuals request", 403);
  }
}
