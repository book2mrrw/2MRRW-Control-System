import { fail, ok, requireStudioAccess } from "@/server/http";
import { syncPublishedCatalogToStorefront } from "@/server/sync/frontendCatalogSyncService";

export async function POST(request: Request) {
  try {
    requireStudioAccess(request);
    const result = await syncPublishedCatalogToStorefront({ reason: "manual_studio_sync" });
    if (!result.ok) {
      const message = "message" in result && result.message ? result.message : "Catalog sync failed";
      return fail(message, 502);
    }
    return ok(result);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Catalog sync failed", 400);
  }
}
