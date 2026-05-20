import { fail, noContent, ok, parseJson, requireStudioAccess } from "@/server/http";
import { deleteCollectorCard, getCollectorCard, updateCollectorCard } from "@/server/collector-cards/collectorCardService";
import { z } from "zod";

const collectorCardUpdateSchema = z.object({
  title: z.string().trim().min(1).optional(),
  slug: z.string().trim().min(1).optional(),
  description: z.string().optional(),
  coverUrl: z.string().nullable().optional(),
  priceInCents: z.number().int().nonnegative().optional(),
  editionSize: z.number().int().positive().nullable().optional(),
  editionLabel: z.string().nullable().optional(),
  giftingEnabled: z.boolean().optional(),
  active: z.boolean().optional(),
  visibility: z.enum(["draft", "published", "archived"]).optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireStudioAccess(request);
    const { id } = await params;
    const card = await getCollectorCard(id);
    return card ? ok(card) : fail("Collector card not found", 404);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid collector cards request", 403);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireStudioAccess(request);
    const { id } = await params;
    const card = await updateCollectorCard(id, await parseJson(request, collectorCardUpdateSchema));
    return card ? ok(card) : fail("Collector card not found", 404);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid collector cards request", 400);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireStudioAccess(request);
    const { id } = await params;
    const removed = await deleteCollectorCard(id);
    return removed ? noContent() : fail("Collector card not found", 404);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid collector cards request", 403);
  }
}
