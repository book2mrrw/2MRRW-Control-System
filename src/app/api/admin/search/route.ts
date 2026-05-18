import { ok } from "@/server/http";
import { searchControlSystem } from "@/server/release-management/globalSearchService";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  return ok(searchControlSystem(query));
}
