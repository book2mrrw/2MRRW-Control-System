import { ok, requireAdmin } from "@/server/http";
import { buildIngestionDiagnosticsReport } from "@/server/diagnostics/ingestionDiagnosticsService";

export async function GET(request: Request) {
  try {
    requireAdmin(request);
    return ok(await buildIngestionDiagnosticsReport());
  } catch (error) {
    return ok({
      error: error instanceof Error ? error.message : "Diagnostics unavailable",
      generatedAt: new Date().toISOString()
    });
  }
}
