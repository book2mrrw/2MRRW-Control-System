import { fail, ok, requireStudioAccess } from "@/server/http";
import { publishAudioVisual } from "@/server/audio-visuals/audioVisualService";
import { markSyncDirty } from "@/server/sync/syncStateService";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireStudioAccess(request);
    const { id } = await params;
    const visual = await publishAudioVisual(id);
    if (visual) await markSyncDirty("audio_visuals", { visualId: id, action: "published" });
    return visual ? ok(visual) : fail("Audio visual not found", 404);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid audio visuals request", 403);
  }
}
