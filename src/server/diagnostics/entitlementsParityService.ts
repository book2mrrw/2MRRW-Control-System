import { getServerSupabase } from "@/server/supabase/client";

export type EntitlementsParityReport = {
  generatedAt: string;
  entitlementsTablePresent: boolean;
  libraryOnly: number;
  entitlementsOnly: number;
  matched: number;
  sampleLibraryOnly: Array<{ userId: string; productId: string }>;
  sampleEntitlementsOnly: Array<{ userId: string; productId: string }>;
  note?: string;
};

/**
 * Read-only parity between storefront library_items and entitlements when both exist on this DB.
 */
export async function buildEntitlementsParityReport(limit = 25): Promise<EntitlementsParityReport> {
  const generatedAt = new Date().toISOString();
  const supabase = getServerSupabase();
  if (!supabase) {
    return {
      generatedAt,
      entitlementsTablePresent: false,
      libraryOnly: 0,
      entitlementsOnly: 0,
      matched: 0,
      sampleLibraryOnly: [],
      sampleEntitlementsOnly: [],
      note: "Supabase unavailable"
    };
  }

  const { error: entitlementsProbe } = await supabase.from("entitlements").select("id").limit(1);
  if (entitlementsProbe && /does not exist|42P01/i.test(entitlementsProbe.message || "")) {
    return {
      generatedAt,
      entitlementsTablePresent: false,
      libraryOnly: 0,
      entitlementsOnly: 0,
      matched: 0,
      sampleLibraryOnly: [],
      sampleEntitlementsOnly: [],
      note: "entitlements table not present on control database"
    };
  }

  const { data: libraryRows, error: libraryError } = await supabase
    .from("library_items")
    .select("user_id, product_id")
    .not("product_id", "is", null);

  if (libraryError) {
    return {
      generatedAt,
      entitlementsTablePresent: true,
      libraryOnly: 0,
      entitlementsOnly: 0,
      matched: 0,
      sampleLibraryOnly: [],
      sampleEntitlementsOnly: [],
      note: libraryError.message
    };
  }

  const { data: entitlementRows, error: entitlementsError } = await supabase
    .from("entitlements")
    .select("user_id, resource_id")
    .eq("resource_type", "product")
    .eq("status", "active");

  if (entitlementsError) {
    return {
      generatedAt,
      entitlementsTablePresent: true,
      libraryOnly: 0,
      entitlementsOnly: 0,
      matched: 0,
      sampleLibraryOnly: [],
      sampleEntitlementsOnly: [],
      note: entitlementsError.message
    };
  }

  const libraryKeys = new Set(
    (libraryRows ?? []).map((row) => `${row.user_id}:${row.product_id}`).filter((key) => !key.includes("null"))
  );
  const entitlementKeys = new Set(
    (entitlementRows ?? [])
      .map((row) => `${row.user_id}:${row.resource_id}`)
      .filter((key) => !key.includes("null"))
  );

  const libraryOnlyKeys = [...libraryKeys].filter((key) => !entitlementKeys.has(key));
  const entitlementsOnlyKeys = [...entitlementKeys].filter((key) => !libraryKeys.has(key));
  const matched = [...libraryKeys].filter((key) => entitlementKeys.has(key)).length;

  const toSample = (keys: string[]) =>
    keys.slice(0, limit).map((key) => {
      const [userId, productId] = key.split(":");
      return { userId, productId };
    });

  return {
    generatedAt,
    entitlementsTablePresent: true,
    libraryOnly: libraryOnlyKeys.length,
    entitlementsOnly: entitlementsOnlyKeys.length,
    matched,
    sampleLibraryOnly: toSample(libraryOnlyKeys),
    sampleEntitlementsOnly: toSample(entitlementsOnlyKeys)
  };
}
