import { GetObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let cachedR2Client: S3Client | null = null;

function createR2Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ?? ""
    }
  });
}

export function getR2Client(): S3Client {
  if (!cachedR2Client) {
    cachedR2Client = createR2Client();
  }
  return cachedR2Client;
}

/** Lazy singleton — avoids import-time failures when R2 env is unset. */
export const r2Client = new Proxy({} as S3Client, {
  get(_target, prop, receiver) {
    const client = getR2Client();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  }
});

export const R2_BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME;

/** Former Supabase bucket names → R2 key prefixes inside the unified bucket. */
export const R2_PREFIX = {
  DIGITAL_ASSETS: "digital-assets",
  PROTECTED_MEDIA: "protected-media",
} as const;

export type R2Prefix = (typeof R2_PREFIX)[keyof typeof R2_PREFIX];

export function buildR2Key(prefix: string, path: string): string {
  const normalizedPrefix = String(prefix || "").replace(/\/$/, "");
  const normalizedPath = String(path || "").replace(/^\//, "");
  if (!normalizedPath) return normalizedPrefix;
  return `${normalizedPrefix}/${normalizedPath}`;
}

export function getPublicR2Url(path: string): string | null {
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (!base) return null;
  const normalized = String(path || "").replace(/^\//, "");
  if (!normalized) return base.replace(/\/$/, "");
  return `${base.replace(/\/$/, "")}/${normalized}`;
}

export async function createR2SignedGetUrl(key: string, expiresIn = 300): Promise<string> {
  const command = new GetObjectCommand({ Bucket: R2_BUCKET, Key: key });
  return getSignedUrl(r2Client, command, { expiresIn });
}

export async function createR2SignedPutUrl(key: string, contentType: string, expiresIn = 300): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(r2Client, command, { expiresIn });
}

/** Dev mock when R2 credentials are absent (replaces signed.local / signed-upload.local). */
export function r2MockSignedUrl(key: string): string {
  const endpoint = (process.env.CLOUDFLARE_R2_ENDPOINT || "https://r2.local").replace(/\/$/, "");
  const bucket = R2_BUCKET || "2mrrw-media";
  return `${endpoint}/${bucket}/${key}`;
}

export async function checkR2Connectivity(): Promise<{ ok: boolean; bucket?: string; message?: string }> {
  if (!R2_BUCKET || !process.env.CLOUDFLARE_R2_ENDPOINT) {
    return { ok: false, message: "R2 env not configured" };
  }
  try {
    await r2Client.send(new HeadBucketCommand({ Bucket: R2_BUCKET }));
    return { ok: true, bucket: R2_BUCKET };
  } catch (err) {
    const message = err instanceof Error ? err.message : "R2 HeadBucket failed";
    return { ok: false, message };
  }
}
