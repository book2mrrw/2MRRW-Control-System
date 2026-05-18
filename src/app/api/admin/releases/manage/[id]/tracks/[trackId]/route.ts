import { fail, ok, parseJson, requireAdmin } from "@/server/http";
import { updateTrackInformation } from "@/server/release-management/releaseManagementService";
import {
  compositionTypes,
  lyricReadinessStates,
  uploadReadinessStates
} from "@/server/release-management/taxonomies";
import { z } from "zod";

const trackInfoSchema = z.object({
  title: z.string().min(1).optional(),
  audioFile: z.string().optional(),
  credits: z.string().optional(),
  explicit: z.boolean().optional(),
  lyricsLanguage: z.string().optional(),
  isLiveVersion: z.boolean().optional(),
  compositionType: z.enum(compositionTypes).optional(),
  manualIsrc: z.string().optional(),
  generatedIsrc: z.string().optional(),
  partnerPlatformIds: z.record(z.string(), z.string()).optional(),
  producerNames: z.array(z.string()).optional(),
  audioState: z.enum(uploadReadinessStates).optional(),
  lyricsState: z.enum(lyricReadinessStates).optional()
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; trackId: string }> }
) {
  try {
    requireAdmin(request);
    const { id, trackId } = await params;
    return ok(updateTrackInformation(id, trackId, await parseJson(request, trackInfoSchema)));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid track information request", 400);
  }
}
