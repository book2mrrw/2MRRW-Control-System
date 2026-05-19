import { ReleaseWizardPage } from "@/components/control/ReleasePages";
import { ensureFrontendReleaseEcosystemImported } from "@/server/release-management/frontendReleaseIngestionService";

export default async function NewReleasePage() {
  await ensureFrontendReleaseEcosystemImported();
  return <ReleaseWizardPage step="setup" />;
}
