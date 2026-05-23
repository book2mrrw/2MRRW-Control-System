import "server-only";

const FULL_PREFIXES = ["digital-assets/", "protected-media/"] as const;

/**
 * Canonical relative R2 path for storefront products.storage_path.
 * Strips leading slashes and maps bare masters/previews under protected-media.
 */
export function normalizeStoragePathForStorefront(path?: string | null) {
  const normalized = String(path ?? "").trim().replace(/^\/+/, "");
  if (!normalized) return "";

  if (FULL_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return normalized;
  }

  if (normalized.startsWith("masters/") || normalized.startsWith("previews/")) {
    return `protected-media/${normalized}`;
  }

  return `digital-assets/${normalized}`;
}
