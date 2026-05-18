import { fail, ok, parseJson, requireAdmin } from "@/server/http";
import { updateAudioVisual } from "@/server/audio-visuals/audioVisualService";
import { z } from "zod";

const audioVisualStatusSchema = z.enum(["draft", "scheduled", "published", "archived"]);

const audioVisualUpdateSchema = z.object({
  title: z.string().trim().min(1).optional(),
  slug: z.string().trim().min(1).optional(),
  youtubeUrl: z.string().trim().min(1).optional(),
  releaseId: z.string().trim().min(1).nullable().optional(),
  trackId: z.string().trim().min(1).nullable().optional(),
  status: audioVisualStatusSchema.optional(),
  publishedAt: z.string().trim().min(1).nullable().optional(),
  sortOrder: z.number().int().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireAdmin(request);
    const { id } = await params;
    const visual = await updateAudioVisual(id, await parseJson(request, audioVisualUpdateSchema));
    return visual ? ok(visual) : fail("Audio visual not found", 404);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid audio visuals request", 400);
  }
}
