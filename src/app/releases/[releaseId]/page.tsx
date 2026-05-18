import { ReleaseDetailPage } from "@/components/control/ReleasePages";

export default async function ReleaseDetailRoute({ params }: { params: Promise<{ releaseId: string }> }) {
  const { releaseId } = await params;
  return <ReleaseDetailPage releaseId={releaseId} />;
}
