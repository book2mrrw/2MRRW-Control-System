import { created, fail, ok, parseJson, requireAdmin } from "@/server/http";
import {
  getReleaseManagementOverview,
  listReleaseDrafts
} from "@/server/release-management/releaseManagementService";
import { createRelease } from "@/server/releases/releaseWriteService";
import { releaseTypes } from "@/server/release-management/taxonomies";
import { z } from "zod";

const createDraftSchema = z.object({
  releaseType: z.enum(releaseTypes),
  title: z.string().optional(),
  artistName: z.string().optional(),
  trackCount: z.number().int().nonnegative().optional()
});

export async function GET(request: Request) {
  try {
    requireAdmin(request);
    return ok({ overview: getReleaseManagementOverview(), drafts: listReleaseDrafts() });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid release-management request", 403);
  }
}

export async function POST(request: Request) {
  try {
    requireAdmin(request);
    return created(createRelease(await parseJson(request, createDraftSchema)));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid release-management request", 400);
  }
}
