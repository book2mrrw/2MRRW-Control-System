import { created, fail, ok, parseJson, requireStudioAccess } from "@/server/http";
import { createAudioVisual } from "@/server/audio-visuals/audioVisualService";
import { ensureAudioVisualsFromFrontend, listAudioVisualsWithFrontendSync } from "@/server/audio-visuals/audioVisualSyncService";
import { z } from "zod";

const audioVisualStatusSchema = z.enum(["draft", "scheduled", "published", "archived"]);

const audioVisualCreateSchema = z
  .object({
    title: z.string().trim().min(1),
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
  })
  .refine((value) => Boolean(value.youtubeUrl || value.videoUrl), {
    message: "youtubeUrl or videoUrl is required"
  });

export async function GET(request: Request) {
  try {
    requireStudioAccess(request);
    const url = new URL(request.url);
    const sync = url.searchParams.get("sync") === "1" || url.searchParams.get("sync") === "true";
    const syncReport = sync ? await ensureAudioVisualsFromFrontend() : null;
    const visuals = await listAudioVisualsWithFrontendSync({ syncIfIncomplete: true });
    return ok({ visuals, count: visuals.length, sync: syncReport });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid audio visuals request", 403);
  }
}

export async function POST(request: Request) {
  try {
    requireStudioAccess(request);
    return created(await createAudioVisual(await parseJson(request, audioVisualCreateSchema)));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid audio visuals request", 400);
  }
}
