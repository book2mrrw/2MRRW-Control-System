import { createRelease as createReleaseDraft } from "@/server/releases/releaseWriteService";

export function createRelease(input: Parameters<typeof createReleaseDraft>[0]) {
  return createReleaseDraft({
    ...input,
    trackCount: input.releaseType === "single" ? 1 : input.trackCount
  });
}
