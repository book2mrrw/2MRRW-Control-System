import { fail, ok, parseJson, requireAdmin } from "@/server/http";
import { updateReleaseMetadata } from "@/server/release-management/releaseManagementService";
import { lyricReadinessStates, uploadReadinessStates } from "@/server/release-management/taxonomies";
import { z } from "zod";

const genreSchema = z.object({
  category: z.string().min(1),
  subgenre: z.string().min(1)
});

const metadataSchema = z.object({
  title: z.string().min(1).optional(),
  language: z.string().min(2).optional(),
  recordLabel: z.string().optional(),
  copyrightOwner: z.string().optional(),
  upc: z.string().optional(),
  scheduledPublishAt: z.string().optional(),
  primaryGenre: genreSchema.optional(),
  secondaryGenre: genreSchema.optional(),
  moodStyles: z.array(z.string()).optional(),
  artistLocation: z
    .object({
      city: z.string().optional(),
      region: z.string().optional(),
      countryCode: z.string().length(2).optional(),
      territory: z.string().optional()
    })
    .optional(),
  famousArtistReferences: z.array(z.string()).max(3).optional(),
  coverArtState: z.enum(uploadReadinessStates).optional(),
  audioAssetsState: z.enum(uploadReadinessStates).optional(),
  lyricsState: z.enum(lyricReadinessStates).optional()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireAdmin(request);
    const { id } = await params;
    return ok(updateReleaseMetadata(id, await parseJson(request, metadataSchema)));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid metadata request", 400);
  }
}
