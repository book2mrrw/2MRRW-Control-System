import { ReleaseDetailPage } from "@/components/control/ReleasePages";
import { ensureFrontendReleaseEcosystemImported } from "@/server/release-management/frontendReleaseIngestionService";

export default async function ReleaseDetailRoute({ params }: { params: Promise<{ releaseId: string }> }) {
  await ensureFrontendReleaseEcosystemImported();
  const { releaseId } = await params;
  return <ReleaseDetailPage releaseId={releaseId} />;
}
