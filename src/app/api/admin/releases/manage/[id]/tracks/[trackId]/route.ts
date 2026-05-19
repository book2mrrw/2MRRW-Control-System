import { fail, noContent, ok, parseJson, requireAdmin } from "@/server/http";
import { removeTrackFromReleaseDraft, updateTrackInformation } from "@/server/release-management/releaseManagementService";
import { persistTrackLyricsMap } from "@/server/release-management/trackLyricsService";
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
  lyricsState: z.enum(lyricReadinessStates).optional(),
  lyricsText: z.string().nullable().optional()
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; trackId: string }> }
) {
  try {
    requireAdmin(request);
    const { id, trackId } = await params;
    const input = await parseJson(request, trackInfoSchema);
    const track = updateTrackInformation(id, trackId, input);
    if (input.lyricsText !== undefined) {
      await persistTrackLyricsMap(id, { [trackId]: input.lyricsText ?? "" });
    }
    return ok(track);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid track information request", 400);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; trackId: string }> }
) {
  try {
    requireAdmin(request);
    const { id, trackId } = await params;
    removeTrackFromReleaseDraft(id, trackId);
    return noContent();
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid track deletion request", 400);
  }
}
