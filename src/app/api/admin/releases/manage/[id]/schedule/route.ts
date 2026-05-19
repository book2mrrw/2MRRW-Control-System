import { fail, ok, parseJson, requireStudioAccess } from "@/server/http";
import { scheduleReleaseDraft } from "@/server/release-management/releaseManagementService";
import { z } from "zod";

const scheduleSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  hour12: z.number().int().min(1).max(12),
  minute: z.number().int().min(0).max(59),
  meridiem: z.enum(["AM", "PM"]),
  timezone: z.string().min(1)
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireStudioAccess(request);
    const { id } = await params;
    const input = await parseJson(request, scheduleSchema);
    return ok(await scheduleReleaseDraft(id, input));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid schedule request", 400);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return POST(request, context);
}
