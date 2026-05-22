import { ok } from "@/server/http";
import { artworkPublicFallbackUrl } from "@/server/media/artworkPublicFallback";
import { createSignedMediaUrl } from "@/server/media/signedUrlService";
import { getServerSupabase } from "@/server/supabase/client";
import { listDueScheduledReleases } from "@/server/releases/scheduledPublishService";

const LOVE_HZ_COVER_ASSET_ID = "60869b4b-7867-551f-a0b2-a9532d720d26";
const LOVE_HZ_STORAGE_PATH = "artwork/a448db11-bf33-5e5d-a355-a55595ad4219/lovehz.jpg";

export async function GET() {
  const supabase = getServerSupabase();
  const cronConfigured = Boolean(process.env.CRON_SECRET?.length);
  const vercelCronSchedule = "0 6 * * *";

  let publishedReleases = 0;
  let dueScheduled = 0;
  let storageSample: {
    ok: boolean;
    signedUrl?: string;
    usesFallback?: boolean;
    message?: string;
  } = { ok: false, message: "Supabase not configured" };

  if (supabase) {
    const { count } = await supabase
      .from("releases")
      .select("id", { count: "exact", head: true })
      .eq("status", "published");
    publishedReleases = count ?? 0;

    dueScheduled = (await listDueScheduledReleases()).length;

    const signed = await createSignedMediaUrl(null, LOVE_HZ_COVER_ASSET_ID, {
      studioBypass: true,
      publicKinds: ["artwork", "loop"]
    });
    const usesFallback = signed.ok && "fallback" in signed && Boolean((signed as { fallback?: boolean }).fallback);
    storageSample = {
      ok: signed.ok,
      signedUrl: signed.ok ? `${signed.url.slice(0, 80)}…` : undefined,
      usesFallback,
      message: signed.ok
        ? usesFallback
          ? "Using artist-platform fallback (storage object may be missing)"
          : "R2 signed URL OK"
        : signed.message
    };

    if (!signed.ok) {
      const fallback = artworkPublicFallbackUrl(LOVE_HZ_STORAGE_PATH);
      storageSample = {
        ok: Boolean(fallback),
        signedUrl: fallback?.slice(0, 80) + "…",
        usesFallback: true,
        message: signed.message
      };
    }
  }

  const healthy =
    Boolean(supabase) &&
    publishedReleases >= 1 &&
    cronConfigured &&
    storageSample.ok;

  return ok(
    {
      status: healthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      cron: {
        configured: cronConfigured,
        vercelSchedule: vercelCronSchedule,
        githubActionAlternative: "every 5 min via .github/workflows/scheduled-releases.yml"
      },
      catalog: { publishedReleases, dueScheduled },
      storage: storageSample
    },
    { status: healthy ? 200 : 503 }
  );
}
