import { ReleaseIndexPage } from "@/components/control/ReleasePages";
import { ensureFrontendReleaseEcosystemImported } from "@/server/release-management/frontendReleaseIngestionService";

export default async function ArchivedReleasesPage() {
  await ensureFrontendReleaseEcosystemImported();
  return <ReleaseIndexPage status="archived" />;
}
