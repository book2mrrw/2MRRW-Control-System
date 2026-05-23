import { corsPreflight, fail, getUserId, ok, withCors } from "@/server/http";
import { createSignedMediaUrl } from "@/server/media/signedUrlService";

const PUBLIC_SIGNABLE_KINDS = ["artwork", "preview", "loop"] as const;

export function OPTIONS(request: Request) {
  return corsPreflight(request);
}

export async function GET(request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  const result = await createSignedMediaUrl(getUserId(request), assetId, {
    publicKinds: [...PUBLIC_SIGNABLE_KINDS],
    studioBypass: false
  });
  if (!result.ok) {
    return withCors(fail(result.message, result.status), request);
  }
  return withCors(
    ok({
      signedUrl: result.url,
      url: result.url,
      expiresIn: result.expiresIn ?? 3600
    }),
    request
  );
}

export async function POST(request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  const result = await createSignedMediaUrl(getUserId(request), assetId, { studioBypass: false });
  if (!result.ok) {
    return fail(result.message, result.status);
  }
  return ok({
    signedUrl: result.url,
    url: result.url,
    expiresIn: result.expiresIn ?? 3600
  });
}
