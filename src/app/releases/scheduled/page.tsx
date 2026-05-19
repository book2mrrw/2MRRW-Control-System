import { ReleaseIndexPage } from "@/components/control/ReleasePages";
import { ensureFrontendReleaseEcosystemImported } from "@/server/release-management/frontendReleaseIngestionService";

export default async function ScheduledReleasesPage() {
  await ensureFrontendReleaseEcosystemImported();
  return <ReleaseIndexPage status="scheduled" />;
}
