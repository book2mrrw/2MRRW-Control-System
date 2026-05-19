import { fail, noContent, ok, parseJson, requireStudioAccess } from "@/server/http";
import { deleteAudioVisual, updateAudioVisual } from "@/server/audio-visuals/audioVisualService";
import { markSyncDirty } from "@/server/sync/syncStateService";
import { z } from "zod";

const audioVisualStatusSchema = z.enum(["draft", "scheduled", "published", "archived"]);

const audioVisualUpdateSchema = z.object({
  title: z.string().trim().min(1).optional(),
  slug: z.string().trim().min(1).optional(),
  youtubeUrl: z.string().trim().min(1).optional(),
  videoUrl: z.string().trim().min(1).optional(),
  mediaType: z.string().trim().min(1).optional(),
  releaseId: z.string().trim().min(1).nullable().optional(),
  trackId: z.string().trim().min(1).nullable().optional(),
  status: audioVisualStatusSchema.optional(),
  publishedAt: z.string().trim().min(1).nullable().optional(),
  sortOrder: z.number().int().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireStudioAccess(request);
    const { id } = await params;
    const visual = await updateAudioVisual(id, await parseJson(request, audioVisualUpdateSchema));
    if (visual) await markSyncDirty("audio_visuals", { visualId: id, action: "updated" });
    return visual ? ok(visual) : fail("Audio visual not found", 404);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid audio visuals request", 400);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireStudioAccess(request);
    const { id } = await params;
    const removed = await deleteAudioVisual(id);
    if (removed) await markSyncDirty("audio_visuals", { visualId: id, action: "deleted" });
    return removed ? noContent() : fail("Audio visual not found", 404);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid audio visuals request", 403);
  }
}
