import { created, fail, ok, parseJson, requireStudioAccess } from "@/server/http";
import { createCollectorCard, listCollectorCards } from "@/server/collector-cards/collectorCardService";
import { z } from "zod";

const collectorCardSchema = z.object({
  title: z.string().trim().min(1),
  slug: z.string().trim().min(1).optional(),
  description: z.string().optional(),
  coverUrl: z.string().nullable().optional(),
  priceInCents: z.number().int().nonnegative(),
  editionSize: z.number().int().positive().nullable().optional(),
  editionLabel: z.string().nullable().optional(),
  giftingEnabled: z.boolean().optional(),
  active: z.boolean().optional(),
  visibility: z.enum(["draft", "published", "archived"]).optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export async function GET(request: Request) {
  try {
    requireStudioAccess(request);
    const cards = await listCollectorCards();
    return ok({ cards, count: cards.length });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid collector cards request", 403);
  }
}

export async function POST(request: Request) {
  try {
    requireStudioAccess(request);
    return created(await createCollectorCard(await parseJson(request, collectorCardSchema)));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid collector cards request", 400);
  }
}
