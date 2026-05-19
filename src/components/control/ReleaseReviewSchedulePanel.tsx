"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ReleaseScheduleSection, type ReleaseScheduleValue } from "@/components/control/ReleaseScheduleSection";
import { publishReleaseAction } from "@/services/catalog/releaseActionsClient";
import { scheduleReleaseAction } from "@/services/catalog/releaseStudioClient";
import type { ReleaseManagementDraft } from "@/server/release-management/releaseManagementService";

export function ReleaseReviewSchedulePanel({
  draft,
  readinessReady
}: {
  draft: ReleaseManagementDraft;
  readinessReady: boolean;
}) {
  const router = useRouter();
  const [schedule, setSchedule] = useState<ReleaseScheduleValue | null>(null);
  const [preview, setPreview] = useState<{ headline: string; timezone: string } | null>(null);
  const [busy, setBusy] = useState<"publish" | "schedule" | null>(null);
  const [message, setMessage] = useState("");

  async function handlePublish() {
    setBusy("publish");
    setMessage("");
    const result = await publishReleaseAction(draft.id);
    setBusy(null);
    if (!result.ok) {
      setMessage(result.error ?? "Publish failed");
      return;
    }
    setMessage(result.data?.status === "scheduled" ? "Release scheduled." : "Release published.");
    router.refresh();
  }

  async function handleSchedule() {
    if (!schedule) {
      setMessage("Set a schedule date and time first.");
      return;
    }
    setBusy("schedule");
    setMessage("");
    const result = await scheduleReleaseAction(draft.id, schedule);
    setBusy(null);
    if (!result.ok) {
      setMessage(result.error ?? "Could not schedule release");
      return;
    }
    setMessage(`Scheduled: ${preview?.headline ?? result.data.scheduledPublishAt}`);
    router.refresh();
  }

  return (
    <div className="review-schedule-stack">
      <ReleaseScheduleSection
        scheduledPublishAt={draft.scheduledPublishAt}
        timezone={draft.timezone}
        disabled={!!busy}
        onChange={(value, nextPreview) => {
          setSchedule(value);
          setPreview(nextPreview);
        }}
      />
      <p className="form-status">{message}</p>
      <div className="publish-action-row">
        <button className="control-button" disabled={!readinessReady || !!busy} type="button" onClick={handlePublish}>
          {busy === "publish" ? "Publishing…" : "Publish Release"}
        </button>
        <button className="control-button secondary" disabled={!readinessReady || !schedule || !!busy} type="button" onClick={handleSchedule}>
          {busy === "schedule" ? "Scheduling…" : "Schedule Global Drop"}
        </button>
        <Link className="control-button secondary" href={`/releases/${draft.id}`}>
          Preview Release
        </Link>
      </div>
    </div>
  );
}
