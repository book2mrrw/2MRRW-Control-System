import { ReleaseIndexPage } from "@/components/control/ReleasePages";
import { ensureFrontendReleaseEcosystemImported } from "@/server/release-management/frontendReleaseIngestionService";

type ReleaseTypeFilter = "single" | "album" | "ep";

export default async function ReleasesPage({ searchParams }: { searchParams?: Promise<{ type?: string }> }) {
  await ensureFrontendReleaseEcosystemImported();
  const params = await searchParams;
  const type = params?.type === "single" || params?.type === "album" || params?.type === "ep" ? (params.type as ReleaseTypeFilter) : undefined;
  return <ReleaseIndexPage type={type} />;
}
