import { fail, noContent, ok, parseJson, requireStudioAccess } from "@/server/http";
import { deleteVaultItem, getVaultItem, updateVaultItem } from "@/server/vault/vaultItemService";
import { z } from "zod";

const vaultItemUpdateSchema = z.object({
  category: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1).optional(),
  slug: z.string().trim().min(1).optional(),
  description: z.string().optional(),
  accessTier: z.enum(["public", "inner_circle", "vault_pass"]).optional(),
  mediaType: z
    .enum(["audio", "video", "image", "text", "mixed", "schedule", "archive", "commentary"])
    .optional(),
  atmosphere: z.string().nullable().optional(),
  behavior: z.string().nullable().optional(),
  coverUrl: z.string().nullable().optional(),
  previewStoragePath: z.string().nullable().optional(),
  mediaStoragePath: z.string().nullable().optional(),
  priceInCents: z.number().int().nonnegative().nullable().optional(),
  giftingEnabled: z.boolean().optional(),
  durationSeconds: z.number().int().nonnegative().nullable().optional(),
  sortOrder: z.number().int().optional(),
  featured: z.boolean().optional(),
  visibility: z.enum(["draft", "scheduled", "published", "archived"]).optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireStudioAccess(request);
    const { id } = await params;
    const item = await getVaultItem(id);
    return item ? ok(item) : fail("Vault item not found", 404);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid vault request", 403);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireStudioAccess(request);
    const { id } = await params;
    const item = await updateVaultItem(id, await parseJson(request, vaultItemUpdateSchema));
    return item ? ok(item) : fail("Vault item not found", 404);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid vault request", 400);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireStudioAccess(request);
    const { id } = await params;
    const removed = await deleteVaultItem(id);
    return removed ? noContent() : fail("Vault item not found", 404);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid vault request", 403);
  }
}
