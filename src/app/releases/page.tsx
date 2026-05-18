import { ReleaseIndexPage } from "@/components/control/ReleasePages";

type ReleaseTypeFilter = "single" | "album" | "ep";

export default async function ReleasesPage({ searchParams }: { searchParams?: Promise<{ type?: string }> }) {
  const params = await searchParams;
  const type = params?.type === "single" || params?.type === "album" || params?.type === "ep" ? (params.type as ReleaseTypeFilter) : undefined;
  return <ReleaseIndexPage type={type} />;
}
