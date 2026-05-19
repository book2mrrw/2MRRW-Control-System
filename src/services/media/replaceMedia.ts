import { confirmMediaUpload } from "@/server/media/uploadIntentService";

export function replaceMedia(input: Parameters<typeof confirmMediaUpload>[0] & { retryOfAssetId: string }) {
  return confirmMediaUpload(input);
}
