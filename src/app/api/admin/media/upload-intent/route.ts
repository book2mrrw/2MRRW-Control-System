import { fail, ok, parseJson, requireAdmin } from "@/server/http";
import {
  createMediaUploadIntent,
  mediaUploadCategories,
  releaseUploadAssetTypes
} from "@/server/media/uploadIntentService";
import { frontendDestinations, mediaDestinations, routedMediaTypes } from "@/services/sync/contentRouting";
import { z } from "zod";

const destinationSchema = z.union([z.enum(mediaDestinations), z.enum(frontendDestinations)]);

const uploadIntentSchema = z.object({
  category: z.enum(mediaUploadCategories).optional(),
  assetType: z.enum(releaseUploadAssetTypes).optional(),
  destination: z.union([destinationSchema, z.array(destinationSchema)]).optional(),
  mediaType: z.enum(routedMediaTypes).optional(),
  releaseId: z.string().min(1).optional(),
  trackId: z.string().min(1).optional(),
  signalId: z.string().min(1).optional(),
  radioId: z.string().min(1).optional(),
  collectorId: z.string().min(1).optional(),
  vaultContentId: z.string().min(1).optional(),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive()
});

export async function POST(request: Request) {
  try {
    requireAdmin(request);
    const intent = await createMediaUploadIntent(await parseJson(request, uploadIntentSchema));
    return ok(intent);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid upload intent request", 400);
  }
}
