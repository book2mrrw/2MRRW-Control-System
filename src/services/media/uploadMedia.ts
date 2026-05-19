import { createMediaUploadIntent, confirmMediaUpload } from "@/server/media/uploadIntentService";

export const uploadMedia = {
  createIntent: createMediaUploadIntent,
  confirm: confirmMediaUpload
};
