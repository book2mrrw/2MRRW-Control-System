import { redirect } from "next/navigation";

export default async function TrackRoute({ params }: { params: Promise<{ trackId: string }> }) {
  const { trackId } = await params;
  redirect(`/tracks/${trackId}/information`);
}
