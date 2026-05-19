import { fail, ok, parseJson, requireStudioAccess } from "@/server/http";
import {
  archiveReleaseDraft,
  dryRunReleasePublish,
  duplicateReleaseDraft,
  markReleaseForDeletion,
  recoverReleaseDraft,
  undoLastReleaseChange,
  unpublishReleaseDraft,
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
  }),
  z.object({
    action: z.literal("unpublish")
  }),
  z.object({
    action: z.literal("duplicate")
  })
]);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireStudioAccess(request);
    const { id } = await params;
    const input = await parseJson(request, actionSchema);

    if (input.action === "archive") return ok(archiveReleaseDraft(id, input.reason));
    if (input.action === "recover") return ok(recoverReleaseDraft(id));
    if (input.action === "undo") return ok(undoLastReleaseChange(id));
    if (input.action === "publish_dry_run") return ok(dryRunReleasePublish(id));
    if (input.action === "mark_for_deletion") return ok(markReleaseForDeletion(id));
    if (input.action === "unpublish") return ok(await unpublishReleaseDraft(id));
    if (input.action === "duplicate") {
      const draft = duplicateReleaseDraft(id);
      return ok({ id: draft.id, slug: draft.slug, title: draft.title });
    }
    return ok(updateReleaseMetadata(id, { visibilityState: input.visibilityState }));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid release action request", 400);
  }
}
