import { ReleaseIndexPage } from "@/components/control/ReleasePages";
import { ensureFrontendReleaseEcosystemImported } from "@/server/release-management/frontendReleaseIngestionService";

export default async function PublishedReleasesPage() {
  await ensureFrontendReleaseEcosystemImported();
  return <ReleaseIndexPage status="published" />;
}
