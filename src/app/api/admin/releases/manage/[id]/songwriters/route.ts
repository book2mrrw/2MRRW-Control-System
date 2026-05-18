import { created, fail, ok, parseJson, requireAdmin } from "@/server/http";
import {
  createSongwriterProfile,
  listSongwriterProfiles
} from "@/server/release-management/releaseManagementService";
import { z } from "zod";

const songwriterSchema = z.object({
  legalName: z.string().min(1),
  displayName: z.string().optional(),
  society: z.string().optional(),
  ipiCaeNumber: z.string().optional(),
  publisherName: z.string().optional()
});

export async function GET(request: Request) {
  try {
    requireAdmin(request);
    return ok(listSongwriterProfiles());
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid songwriter bank request", 403);
  }
}

export async function POST(request: Request) {
  try {
    requireAdmin(request);
    return created(createSongwriterProfile(await parseJson(request, songwriterSchema)));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid songwriter bank request", 400);
  }
}
