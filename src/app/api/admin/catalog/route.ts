import { fail, ok, requireStudioAccess } from "@/server/http";
import { buildControlCatalogPayload } from "@/server/catalog/controlCatalogPayload";

export async function GET(request: Request) {
  try {
    requireStudioAccess(request);
    const url = new URL(request.url);
    const limitParam = Number(url.searchParams.get("limit") ?? 50);
    const offsetParam = Number(url.searchParams.get("offset") ?? 0);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 50;
    const offset = Number.isFinite(offsetParam) ? Math.max(offsetParam, 0) : 0;
    return ok(await buildControlCatalogPayload({ limit, offset }));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid catalog request", 403);
  }
}
