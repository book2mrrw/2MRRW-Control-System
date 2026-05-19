import Link from "next/link";
import { FormSection, PageHeader } from "@/components/control/OperationalPrimitives";
import { ReleaseReviewSchedulePanel } from "@/components/control/ReleaseReviewSchedulePanel";
import { getReadinessSummary, getReleaseDraft, listReleaseDrafts } from "@/server/release-management/releaseManagementService";

export default async function ReleaseSchedulerStepPage() {
  const draft = getReleaseDraft(listReleaseDrafts()[0]?.id ?? "") ?? listReleaseDrafts()[0] ?? null;
  if (!draft) {
    return (
      <>
        <PageHeader eyebrow="Scheduler" title="Schedule a release" description="Create a release draft first, then return here to set a global drop time." />
        <Link className="control-button" href="/releases/new">
          Create release
        </Link>
      </>
    );
  }
  const readiness = getReadinessSummary(draft.id);
  return (
    <>
      <PageHeader
        eyebrow="Global drop"
        title="Schedule release"
        description="Choose the exact local date, 12-hour time, and timezone. Auto-publish runs on the cron worker at the UTC instant."
      />
      <FormSection title={draft.title} description="Stored as UTC in scheduled_publish_at with publish_timezone + release_time.">
        <ReleaseReviewSchedulePanel draft={draft} readinessReady={readiness.ready} />
      </FormSection>
    </>
  );
}
