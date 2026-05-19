import { corsPreflight, ok, withCors } from "@/server/http";
import { getHeroConfig } from "@/server/hero/heroConfigService";

export function OPTIONS(request: Request) {
  return corsPreflight(request);
}

export async function GET(request: Request) {
  const hero = await getHeroConfig();
  return withCors(ok(hero), request);
}
