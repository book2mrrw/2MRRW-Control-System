import { corsPreflight, fail, getUserId, ok, withCors } from "@/server/http";
import { createSignedMediaUrl } from "@/server/media/signedUrlService";

const PUBLIC_SIGNABLE_KINDS = ["artwork", "preview", "loop"] as const;

export function OPTIONS(request: Request) {
  return corsPreflight(request);
}

export async function GET(request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  const result = await createSignedMediaUrl(request.headers.get("x-user-id"), assetId, {
    publicKinds: [...PUBLIC_SIGNABLE_KINDS]
  });
  return withCors(result.ok ? ok(result) : fail(result.message, result.status), request);
}

export async function POST(request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  const result = await createSignedMediaUrl(getUserId(request), assetId);
  return result.ok ? ok(result) : fail(result.message, result.status);
}
