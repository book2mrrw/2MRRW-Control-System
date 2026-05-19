import { ok, fail, requireAdmin } from "@/server/http";
import { ingestFrontendReleaseEcosystem } from "@/server/release-management/frontendReleaseIngestionService";

export async function POST(request: Request) {
  try {
    requireAdmin(request);
    return ok(await ingestFrontendReleaseEcosystem());
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid frontend release import request", 400);
  }
}
