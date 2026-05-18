import { fail, ok, parseJson, requireAdmin } from "@/server/http";
import { getHeroConfig, updateHeroConfig } from "@/server/hero/heroConfigService";
import { z } from "zod";

const heroConfigSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional(),
  ctaLabel: z.string().optional(),
  ctaHref: z.string().optional(),
  backgroundMediaUrl: z.string().optional(),
  backgroundMediaType: z.enum(["image", "mp4"]).optional()
});

export async function GET(request: Request) {
  try {
    requireAdmin(request);
    return ok(await getHeroConfig());
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid hero config request", 400);
  }
}

export async function POST(request: Request) {
  try {
    requireAdmin(request);
    return ok(await updateHeroConfig(await parseJson(request, heroConfigSchema)));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Hero config could not be saved", 400);
  }
}
