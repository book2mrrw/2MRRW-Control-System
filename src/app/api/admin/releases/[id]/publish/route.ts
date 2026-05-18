import { fail, ok, requireAdmin } from "@/server/http";
import { publishRelease } from "@/server/releases/releaseWriteService";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireAdmin(request);
    const { id } = await params;
    const release = publishRelease(id);
    if (!release) {
      return fail("Release not found", 404);
    }

    return release.ok ? ok(release) : fail(release.message, 409, release.checks);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid admin request", 403);
  }
}
