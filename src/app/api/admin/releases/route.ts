import { fail, ok, parseJson, requireAdmin } from "@/server/http";
import { upsertRelease } from "@/server/releases/releaseWriteService";
import { z } from "zod";

const releaseSchema = z.object({
  id: z.string().optional(),
  slug: z.string().min(1),
  title: z.string().min(1),
  artistId: z.string().optional(),
  releaseDate: z.string().optional(),
  published: z.boolean().optional()
});

export async function POST(request: Request) {
  try {
    requireAdmin(request);
    return ok(upsertRelease(await parseJson(request, releaseSchema)));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid release request", 403);
  }
}
