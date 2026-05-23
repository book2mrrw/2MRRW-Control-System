import { corsPreflight, fail, getUserId, ok, withCors } from "@/server/http";
import { createSignedMediaUrl } from "@/server/media/signedUrlService";

const PUBLIC_SIGNABLE_KINDS = ["artwork", "preview", "loop"] as const;
const MAX_BATCH_SIZE = 32;

export function OPTIONS(request: Request) {
  return corsPreflight(request);
}

export async function POST(request: Request) {
  let body: { assetIds?: unknown };
  try {
    body = (await request.json()) as { assetIds?: unknown };
  } catch {
    return withCors(fail("Invalid JSON body", 400), request);
  }

  const assetIds = Array.isArray(body.assetIds)
    ? body.assetIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    : [];

  if (!assetIds.length) {
    return withCors(fail("assetIds required", 400), request);
  }
  if (assetIds.length > MAX_BATCH_SIZE) {
    return withCors(fail(`assetIds exceeds max batch size (${MAX_BATCH_SIZE})`, 400), request);
  }

  const userId = getUserId(request);
  const uniqueIds = [...new Set(assetIds)];

  const results = await Promise.all(
    uniqueIds.map(async (assetId) => {
      const result = await createSignedMediaUrl(userId, assetId, {
        publicKinds: [...PUBLIC_SIGNABLE_KINDS],
        studioBypass: false
      });
      if (!result.ok) {
        return {
          assetId,
          ok: false as const,
          status: result.status,
          message: result.message
        };
      }
      return {
        assetId,
        ok: true as const,
        signedUrl: result.url,
        url: result.url,
        expiresIn: result.expiresIn ?? 3600
      };
    })
  );

  return withCors(ok({ results, expiresIn: 3600 }), request);
}
