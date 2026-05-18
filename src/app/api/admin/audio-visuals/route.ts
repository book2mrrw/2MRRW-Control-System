import { created, fail, ok, parseJson, requireAdmin } from "@/server/http";
import { createAudioVisual, listAudioVisuals } from "@/server/audio-visuals/audioVisualService";
import { z } from "zod";

const audioVisualStatusSchema = z.enum(["draft", "scheduled", "published", "archived"]);

const audioVisualCreateSchema = z.object({
  title: z.string().trim().min(1),
  slug: z.string().trim().min(1).optional(),
  youtubeUrl: z.string().trim().min(1),
  releaseId: z.string().trim().min(1).nullable().optional(),
  trackId: z.string().trim().min(1).nullable().optional(),
  status: audioVisualStatusSchema.optional(),
  publishedAt: z.string().trim().min(1).nullable().optional(),
  sortOrder: z.number().int().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export async function GET(request: Request) {
  try {
    requireAdmin(request);
    return ok(await listAudioVisuals({ publicOnly: false, limit: 100 }));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid audio visuals request", 403);
  }
}

export async function POST(request: Request) {
  try {
    requireAdmin(request);
    return created(await createAudioVisual(await parseJson(request, audioVisualCreateSchema)));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid audio visuals request", 400);
  }
}
