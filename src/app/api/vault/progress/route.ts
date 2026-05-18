import { getUserId, ok, parseJson } from "@/server/http";
import { updateVaultProgress } from "@/server/vault/vaultService";
import { z } from "zod";

const progressSchema = z.object({
  contentId: z.string().min(1),
  completed: z.boolean()
});

export async function POST(request: Request) {
  const body = await parseJson(request, progressSchema);
  return ok(updateVaultProgress(getUserId(request), body.contentId, body.completed));
}
