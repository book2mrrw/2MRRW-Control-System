import { fail, ok, parseJson, requireStudioAccess } from "@/server/http";
import { applyMediaSyncRouting } from "@/server/media/mediaSyncRoutingService";
import {
  confirmMediaUpload,
  mediaUploadCategories,
  releaseUploadAssetTypes
} from "@/server/media/uploadIntentService";
import { sectionForUploadCategory } from "@/services/sync/mediaSyncContract";
import { professionalAudioFormats } from "@/services/media/audioSupport";
import { frontendDestinations, mediaDestinations, routedMediaTypes } from "@/services/sync/contentRouting";
import { z } from "zod";

const destinationSchema = z.union([z.enum(mediaDestinations), z.enum(frontendDestinations)]);
const audioMetadataSchema = z.object({
  format: z.enum(professionalAudioFormats).optional(),
  bitDepth: z.union([z.literal(16), z.literal(24), z.literal("32_float"), z.literal("unknown")]).optional(),
  sampleRateHz: z.union([z.literal(44100), z.literal(48000), z.literal(88200), z.literal(96000), z.literal("unknown")]).optional(),
  channels: z.union([z.number().int().positive(), z.literal("unknown")]).optional(),
  durationSeconds: z.number().positive().optional()
}).optional();

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
  audioMetadata: audioMetadataSchema,
  retryOfAssetId: z.string().min(1).optional()
});

export async function POST(request: Request) {
  try {
    requireStudioAccess(request);
    const body = await parseJson(request, uploadCompleteSchema);
    const record = confirmMediaUpload(body);
    if (body.releaseId) {
      await applyMediaSyncRouting({
        relatedReleaseId: body.releaseId,
        releaseType: undefined,
        uploadCategory: body.category,
        assetRole: body.assetType,
        destination: body.destination,
        mediaType: body.mediaType,
        mediaSection: sectionForUploadCategory(body.category),
        storagePath: body.path,
        mediaAssetId: record.id
      });
    }
    return ok(record);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid upload completion request", 400);
  }
}
