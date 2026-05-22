import { ok } from "@/server/http";
import { checkR2Connectivity } from "@/lib/storage/r2";

export async function GET() {
  const started = Date.now();
  const r2 = await checkR2Connectivity();
  const timingMs = Date.now() - started;

  if (!r2.ok) {
    return ok(
      {
        ok: false,
        timestamp: new Date().toISOString(),
        timingMs,
        message: r2.message,
      },
      { status: 503 }
    );
  }

  return ok({
    ok: true,
    timestamp: new Date().toISOString(),
    timingMs,
    bucket: r2.bucket,
  });
}
