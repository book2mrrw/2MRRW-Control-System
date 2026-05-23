import "server-only";

const LEGACY_ENV_KEYS = [
  "STOREFRONT_SYNC_URL",
  "ARTIST_PLATFORM_API_URL",
  "NEXT_PUBLIC_FRONTEND_URL",
  "ARTIST_PLATFORM_PUBLIC_URL",
  "NEXT_PUBLIC_ARTIST_PLATFORM_URL",
  "STOREFRONT_URL",
  "NEXT_PUBLIC_STOREFRONT_URL"
] as const;

function trimUrl(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/\/+$/, "") : "";
}

/**
 * Canonical storefront base URL for catalog sync and admin push.
 * Prefer STOREFRONT_SYNC_URL; fall back to legacy names for backward compatibility.
 */
export function resolveStorefrontSyncBaseUrl() {
  for (const key of LEGACY_ENV_KEYS) {
    const url = trimUrl(process.env[key]);
    if (url) return { url, source: key };
  }
  return { url: "http://localhost:3000", source: "default" as const };
}

export function storefrontSyncBaseUrl() {
  return resolveStorefrontSyncBaseUrl().url;
}

export function isStorefrontSyncConfigured() {
  const { source } = resolveStorefrontSyncBaseUrl();
  return source !== "default";
}

export function isStorefrontSyncPushReady() {
  return isStorefrontSyncConfigured() && Boolean(process.env.ADMIN_SEED_SECRET?.trim());
}

export function validateStorefrontSyncEnv(options?: { log?: boolean }) {
  const { url, source } = resolveStorefrontSyncBaseUrl();
  const secret = Boolean(process.env.ADMIN_SEED_SECRET?.trim());
  const isProd = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
  const issues: string[] = [];

  if (isProd && source === "default") {
    issues.push("STOREFRONT_SYNC_URL is not set (catalog sync will be skipped in production).");
  }
  if (isProd && !secret) {
    issues.push("ADMIN_SEED_SECRET is not set (storefront catalog push will fail).");
  }
  if (source !== "STOREFRONT_SYNC_URL" && source !== "default") {
    issues.push(
      `Using legacy env ${source} for storefront sync; set STOREFRONT_SYNC_URL to the canonical storefront origin.`
    );
  }

  if (options?.log !== false && issues.length) {
    for (const message of issues) {
      console.warn(`[storefront-sync] ${message}`);
    }
  }

  return {
    ok: issues.length === 0,
    url,
    source,
    secretConfigured: secret,
    issues
  };
}
