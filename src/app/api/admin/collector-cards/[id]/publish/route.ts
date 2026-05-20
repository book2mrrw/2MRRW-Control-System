import { fail, ok, requireStudioAccess } from "@/server/http";
import { publishCollectorCard } from "@/server/collector-cards/collectorCardService";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireStudioAccess(request);
    const { id } = await params;
    const result = await publishCollectorCard(id);
    if (!result.ok) return fail(result.message, 400);
    return ok(result);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Publish failed", 400);
  }
}
