import { TrackInformationPage } from "@/components/control/ReleasePages";

export default async function TrackInformationRoute({ params }: { params: Promise<{ trackId: string }> }) {
  const { trackId } = await params;
  return <TrackInformationPage trackId={trackId} />;
}
