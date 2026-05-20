export type PricingTier = "single" | "ep" | "album";

const TIER_BANDS: Record<PricingTier, { min: number; max: number }> = {
  single: { min: 299, max: 799 },
  ep: { min: 799, max: 5000 },
  album: { min: 799, max: 5000 }
};

export function normalizePricingTier(
  releaseType?: string | null,
  explicitTier?: string | null
): PricingTier | null {
  if (explicitTier === "single" || explicitTier === "ep" || explicitTier === "album") {
    return explicitTier;
  }
  if (releaseType === "single" || releaseType === "feature") return "single";
  if (releaseType === "ep") return "ep";
  if (releaseType === "album" || releaseType === "deluxe" || releaseType === "remix_pack") return "album";
  return null;
}

export function validateReleasePriceInCents(
  priceInCents: number | null | undefined,
  tier: PricingTier | null
): { ok: true } | { ok: false; message: string } {
  if (priceInCents == null) return { ok: true };
  if (!Number.isInteger(priceInCents) || priceInCents < 0) {
    return { ok: false, message: "priceInCents must be a non-negative integer." };
  }
  if (!tier) {
    return { ok: false, message: "pricingTier is required when priceInCents is set." };
  }
  const band = TIER_BANDS[tier];
  if (priceInCents < band.min || priceInCents > band.max) {
    return {
      ok: false,
      message: `Price for ${tier} must be between ${band.min} and ${band.max} cents.`
    };
  }
  return { ok: true };
}

export function validateOptionalPriceInCents(
  value: number | null | undefined,
  label: string
): { ok: true } | { ok: false; message: string } {
  if (value == null) return { ok: true };
  if (!Number.isInteger(value) || value < 0) {
    return { ok: false, message: `${label} must be a non-negative integer.` };
  }
  return { ok: true };
}
