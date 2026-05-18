import { fail, ok, parseJson, requireAdmin } from "@/server/http";
import {
  confirmMediaUpload,
  mediaUploadCategories,
  releaseUploadAssetTypes
} from "@/server/media/uploadIntentService";
import { frontendDestinations, mediaDestinations, routedMediaTypes } from "@/services/sync/contentRouting";
import { z } from "zod";

const destinationSchema = z.union([z.enum(mediaDestinations), z.enum(frontendDestinations)]);

const uploadCompleteSchema = z.object({
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
  path: z.string().min(1),
  retryOfAssetId: z.string().min(1).optional()
});

export async function POST(request: Request) {
  try {
    requireAdmin(request);
    return ok(confirmMediaUpload(await parseJson(request, uploadCompleteSchema)));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid upload completion request", 400);
  }
}
