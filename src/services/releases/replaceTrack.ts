import { updateTrackInformation } from "@/server/release-management/releaseManagementService";

export function replaceTrack(releaseId: string, trackId: string, input: Parameters<typeof updateTrackInformation>[2]) {
  return updateTrackInformation(releaseId, trackId, input);
}
