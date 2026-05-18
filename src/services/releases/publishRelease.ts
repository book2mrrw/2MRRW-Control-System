import { publishReleaseDurable } from "@/server/releases/releaseWriteService";

export async function publishRelease(releaseId: string) {
  return publishReleaseDurable(releaseId);
}
