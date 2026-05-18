import { fail, ok, parseJson, requireAdmin } from "@/server/http";
import {
  archiveReleaseDraft,
  dryRunReleasePublish,
  markReleaseForDeletion,
  recoverReleaseDraft,
  undoLastReleaseChange,
  updateReleaseMetadata
} from "@/server/release-management/releaseManagementService";
import { releaseVisibilityStates } from "@/server/release-management/taxonomies";
import { z } from "zod";

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("archive"),
    reason: z.string().optional()
  }),
  z.object({
    action: z.literal("recover")
  }),
  z.object({
    action: z.literal("undo")
  }),
  z.object({
    action: z.literal("publish_dry_run")
  }),
  z.object({
    action: z.literal("mark_for_deletion")
  }),
  z.object({
    action: z.literal("set_visibility"),
    visibilityState: z.enum(releaseVisibilityStates)
  })
]);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireAdmin(request);
    const { id } = await params;
    const input = await parseJson(request, actionSchema);

    if (input.action === "archive") return ok(archiveReleaseDraft(id, input.reason));
    if (input.action === "recover") return ok(recoverReleaseDraft(id));
    if (input.action === "undo") return ok(undoLastReleaseChange(id));
    if (input.action === "publish_dry_run") return ok(dryRunReleasePublish(id));
    if (input.action === "mark_for_deletion") return ok(markReleaseForDeletion(id));
    return ok(updateReleaseMetadata(id, { visibilityState: input.visibilityState }));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid release action request", 400);
  }
}
