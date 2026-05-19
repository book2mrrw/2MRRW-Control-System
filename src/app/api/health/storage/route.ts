import { ok } from "@/server/http";
import { createSignedMediaUrl } from "@/server/media/signedUrlService";

const SAMPLE_ASSET_ID = "60869b4b-7867-551f-a0b2-a9532d720d26";

export async function GET() {
  const started = Date.now();
  const signed = await createSignedMediaUrl(null, SAMPLE_ASSET_ID, {
    studioBypass: true,
    publicKinds: ["artwork", "loop"]
  });
  const timingMs = Date.now() - started;

  if (!signed.ok) {
    return ok(
      {
        ok: false,
        timestamp: new Date().toISOString(),
        timingMs,
        message: signed.message
      },
      { status: 503 }
    );
  }

  return ok({
    ok: true,
    timestamp: new Date().toISOString(),
    timingMs,
    signedUrlSample: `${signed.url.slice(0, 80)}…`
  });
}
