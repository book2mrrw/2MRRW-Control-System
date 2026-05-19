import { updateReleaseMetadata } from "@/server/release-management/releaseManagementService";

export function updateRelease(id: string, input: Parameters<typeof updateReleaseMetadata>[1]) {
  return updateReleaseMetadata(id, input);
}
