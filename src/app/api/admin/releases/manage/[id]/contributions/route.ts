import { created, fail, parseJson, requireAdmin } from "@/server/http";
import { attachTrackContribution } from "@/server/release-management/releaseManagementService";
import { contributionTypes } from "@/server/release-management/taxonomies";
import { z } from "zod";

const contributionSchema = z.object({
  trackId: z.string().min(1),
  songwriterProfileId: z.string().optional(),
  contributorName: z.string().min(1),
  contributionType: z.enum(contributionTypes),
  isPublisher: z.boolean().default(false),
  ownershipSplit: z.number().min(0).max(100),
  publisherName: z.string().optional()
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireAdmin(request);
    const { id } = await params;
    const { trackId, ...input } = await parseJson(request, contributionSchema);
    return created(attachTrackContribution(id, trackId, input));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid contribution request", 400);
  }
}
