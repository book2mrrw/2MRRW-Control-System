import { archiveReleaseDraft } from "@/server/release-management/releaseManagementService";

export function archiveRelease(id: string, reason?: string) {
  return archiveReleaseDraft(id, reason);
}
