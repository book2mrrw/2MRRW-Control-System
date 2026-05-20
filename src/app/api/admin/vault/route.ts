import { created, fail, ok, parseJson, requireStudioAccess } from "@/server/http";
import { createVaultItem, listVaultItems } from "@/server/vault/vaultItemService";
import { z } from "zod";

const vaultItemSchema = z.object({
  category: z.string().trim().min(1),
  title: z.string().trim().min(1),
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

export async function GET(request: Request) {
  try {
    requireStudioAccess(request);
    const url = new URL(request.url);
    const category = url.searchParams.get("category") ?? undefined;
    const items = await listVaultItems(category ?? undefined);
    return ok({ items, count: items.length, category: category ?? null });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid vault request", 403);
  }
}

export async function POST(request: Request) {
  try {
    requireStudioAccess(request);
    return created(await createVaultItem(await parseJson(request, vaultItemSchema)));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid vault request", 400);
  }
}
