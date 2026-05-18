import { fail, ok, parseJson, requireAdmin } from "@/server/http";
import {
  listDraftSessionSnapshots,
  restoreDraftSession,
  saveDraftSessionSnapshot,
  upsertCreatorSession
} from "@/server/release-management/releaseLifecycleService";
import { z } from "zod";

const snapshotSchema = z.object({
  sessionId: z.string().optional(),
  reason: z.enum([
    "field_edit",
    "upload_completed",
    "step_transition",
    "schedule_change",
    "lyrics_edit",
    "mobile_background",
    "connection_interrupted",
    "manual_save"
  ]),
  step: z.enum(["setup", "tracks", "uploads", "review"]).optional(),
  activeTab: z.string().optional(),
  openSections: z.array(z.string()).optional(),
  scrollPosition: z.number().int().nonnegative().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  collaborators: z.array(z.unknown()).optional(),
  uploads: z
    .array(
      z.object({
        uploadId: z.string(),
        state: z.enum(["queued", "uploading", "retry_available", "completed", "failed"]),
        assetId: z.string().optional(),
        fileName: z.string()
      })
    )
    .optional(),
  scheduling: z.record(z.string(), z.unknown()).optional(),
  lyrics: z.record(z.string(), z.string()).optional(),
  cloudSynced: z.boolean().optional()
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireAdmin(request);
    const { id } = await params;
    const sessionId = new URL(request.url).searchParams.get("sessionId") ?? undefined;
    return ok({
      restore: restoreDraftSession({ releaseId: id, sessionId }),
      snapshots: listDraftSessionSnapshots(id)
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid release session request", 400);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireAdmin(request);
    const { id } = await params;
    const input = await parseJson(request, snapshotSchema);
    const snapshot = saveDraftSessionSnapshot({
      ...input,
      releaseId: id
    });
    const session = upsertCreatorSession({
      id: input.sessionId,
      releaseId: id,
      currentStep: input.step,
      activeTab: input.activeTab,
      openSections: input.openSections,
      scrollPosition: input.scrollPosition,
      cloudPersistence: input.cloudSynced ? "synced" : "queued"
    });
    return ok({ snapshot, session });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid release session save", 400);
  }
}
