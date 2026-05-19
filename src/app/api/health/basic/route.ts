import { ok } from "@/server/http";

export async function GET() {
  return ok({
    ok: true,
    timestamp: new Date().toISOString(),
    runtime: "alive"
  });
}
