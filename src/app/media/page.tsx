import { MediaPage } from "@/components/control/ReleasePages";
import { ensureFrontendReleaseEcosystemImported } from "@/server/release-management/frontendReleaseIngestionService";

export default async function MediaRoute() {
  await ensureFrontendReleaseEcosystemImported();
  return <MediaPage />;
}
