import { saveLibraryItem } from "@/server/account/accountStateService";
import { getUserId, ok, parseJson } from "@/server/http";
import { getUserLibrary } from "@/server/releases/releaseReadService";
import { z } from "zod";

const saveSchema = z.object({
  trackId: z.string().optional(),
  releaseId: z.string().optional()
});

export async function GET(request: Request) {
  return ok(getUserLibrary(getUserId(request)));
}

export async function POST(request: Request) {
  const userId = getUserId(request);
  saveLibraryItem(userId, await parseJson(request, saveSchema));
  return ok(getUserLibrary(userId));
}
