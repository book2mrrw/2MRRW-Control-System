import { fail, ok, requireStudioAccess } from "@/server/http";
import { buildControlCatalogPayload } from "@/server/catalog/controlCatalogPayload";

export async function GET(request: Request) {
  try {
    requireStudioAccess(request);
    return ok(await buildControlCatalogPayload());
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid catalog request", 403);
  }
}
