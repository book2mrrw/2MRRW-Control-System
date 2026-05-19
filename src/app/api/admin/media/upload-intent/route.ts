import { fail, ok, parseJson, requireStudioAccess } from "@/server/http";
import {
  createMediaUploadIntent,
  mediaUploadCategories,
  releaseUploadAssetTypes
} from "@/server/media/uploadIntentService";
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
  sizeBytes: z.number().int().positive(),
  audioMetadata: audioMetadataSchema
});

export async function POST(request: Request) {
  try {
    requireStudioAccess(request);
    const intent = await createMediaUploadIntent(await parseJson(request, uploadIntentSchema));
    return ok(intent);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid upload intent request", 400);
  }
}
