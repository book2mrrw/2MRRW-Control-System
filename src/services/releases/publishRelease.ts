import { publishReleaseDurable } from "@/server/releases/releaseWriteService";

export async function publishRelease(id: string) {
  return publishReleaseDurable(id);
}
