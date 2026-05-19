import { ReleaseIndexPage } from "@/components/control/ReleasePages";
import { ensureFrontendReleaseEcosystemImported } from "@/server/release-management/frontendReleaseIngestionService";

export default async function DraftReleasesPage() {
  await ensureFrontendReleaseEcosystemImported();
  return <ReleaseIndexPage status="draft" />;
}
