export const pricingTiers = ["single", "ep", "album"] as const;

export const commerceContentTypes = ["release", "collector_card", "vault_item", "vault_access"] as const;
export type CommerceContentType = (typeof commerceContentTypes)[number];

/** Eight Vault archive categories — collector cards are excluded by design. */
export const vaultCategories = [
  "Audio Diaries",
  "Exclusive Interviews",
  "BTS",
  "Creative Process",
  "Archives",
  "Unreleased Archives",
  "Premium Livestream Replays",
  "Director Commentary"
] as const;

export type VaultCategory = (typeof vaultCategories)[number];

export const vaultAccessTiers = ["public", "inner_circle", "vault_pass"] as const;

export const vaultMediaTypes = [
  "audio",
  "video",
  "image",
  "text",
  "mixed",
  "schedule",
  "archive",
  "commentary"
] as const;

export function releaseProductSlug(releaseSlug: string) {
  const base = releaseSlug.trim();
  return base.endsWith("-digital") ? base : `${base}-digital`;
}

export function collectorCardProductSlug(cardSlug: string) {
  const base = cardSlug.trim();
  return base.startsWith("collector-") ? base : `collector-${base}`;
}

export function vaultItemProductSlug(itemSlug: string) {
  const base = itemSlug.trim();
  return base.startsWith("vault-") ? base : `vault-${base}`;
}
