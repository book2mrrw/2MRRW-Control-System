import { validateMediaUploadIntent } from "@/server/media/uploadIntentService";

export function validateMedia(input: Parameters<typeof validateMediaUploadIntent>[0]) {
  return validateMediaUploadIntent(input);
}
