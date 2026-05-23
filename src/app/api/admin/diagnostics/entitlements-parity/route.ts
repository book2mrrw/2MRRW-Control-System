import { ok, requireAdmin } from "@/server/http";
import { buildEntitlementsParityReport } from "@/server/diagnostics/entitlementsParityService";

export async function GET(request: Request) {
  try {
    requireAdmin(request);
    return ok(await buildEntitlementsParityReport());
  } catch (error) {
    return ok({
      error: error instanceof Error ? error.message : "Diagnostics unavailable",
      generatedAt: new Date().toISOString()
    });
  }
}
