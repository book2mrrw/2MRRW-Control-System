import { getServerSupabase } from "@/server/supabase/client";
import { assertCanAccessMedia } from "@/server/media/mediaAssetService";
import { classifyMediaAsset } from "@/server/media/mediaObjects";
import type { MediaAssetContract } from "@/server/media/mediaObjects";

type SignableAsset = {
  id: string;
  bucket: string;
  path: string;
  ownerType?: string;
  ownerId?: string;
  access: string;
};

type PersistedEntitlementContext = {
  trackId?: string;
  releaseId?: string;
  vaultCollectionId?: string;
};

type VaultContentRelation = { collection_id?: string | null } | Array<{ collection_id?: string | null }>;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getPersistedMediaAsset(assetId: string): Promise<SignableAsset | null> {
  const supabase = getServerSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("media_assets")
    .select("id, bucket, storage_path, owner_type, owner_id, access_level")
    .eq("id", assetId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: data.id,
    bucket: data.bucket,
    path: data.storage_path,
    ownerType: data.owner_type,
    ownerId: data.owner_id,
    access: data.access_level
  };
}

function isUuid(value: string | null | undefined) {
  return Boolean(value && uuidPattern.test(value));
}

async function resolvePersistedEntitlementContext(asset: SignableAsset): Promise<PersistedEntitlementContext | null> {
  const supabase = getServerSupabase();
  if (!supabase || !isUuid(asset.ownerId)) return null;

  if (asset.ownerType === "track") {
    const { data, error } = await supabase
      .from("tracks")
      .select("id, release_id")
      .eq("id", asset.ownerId)
      .maybeSingle();
    if (error || !data) return null;
    return { trackId: data.id, releaseId: data.release_id };
  }

  if (asset.ownerType === "release") {
    return { releaseId: asset.ownerId };
  }

  if (asset.ownerType === "vault_content") {
    const { data, error } = await supabase
      .from("vault_content")
      .select("id, collection_id")
      .eq("id", asset.ownerId)
      .maybeSingle();
    if (error || !data) return null;
    return { vaultCollectionId: data.collection_id };
  }

  const { data: vaultAsset } = await supabase
    .from("vault_content_assets")
    .select("vault_content(collection_id)")
    .eq("media_asset_id", asset.id)
    .maybeSingle();

  const vaultContent = vaultAsset?.vault_content as VaultContentRelation | undefined;
  const collectionId = Array.isArray(vaultContent)
    ? vaultContent[0]?.collection_id
    : vaultContent?.collection_id;

  return collectionId ? { vaultCollectionId: collectionId } : null;
}

function grantMatchesContext(grant: unknown, context: PersistedEntitlementContext) {
  if (!grant || typeof grant !== "object" || !("type" in grant)) return false;

  const trackId = "trackId" in grant ? grant.trackId : "track_id" in grant ? grant.track_id : null;
  const releaseId = "releaseId" in grant ? grant.releaseId : "release_id" in grant ? grant.release_id : null;
  const collectionId = "collectionId" in grant ? grant.collectionId : "collection_id" in grant ? grant.collection_id : null;

  return (
    (grant.type === "track" && trackId === context.trackId) ||
    (grant.type === "release" && releaseId === context.releaseId) ||
    (grant.type === "vault_collection" && collectionId === context.vaultCollectionId)
  );
}

async function userHasPersistedEntitlement(userId: string, context: PersistedEntitlementContext) {
  const supabase = getServerSupabase();
  if (!supabase || !isUuid(userId)) return false;

  const libraryItemIds = [context.trackId, context.releaseId].filter((value): value is string => Boolean(value));
  if (libraryItemIds.length > 0) {
    const { data } = await supabase
      .from("library_items")
      .select("id")
      .eq("user_id", userId)
      .in("item_id", libraryItemIds)
      .limit(1);
    if ((data ?? []).length > 0) return true;
  }

  if (context.vaultCollectionId) {
    const { data } = await supabase
      .from("vault_entitlements")
      .select("id")
      .eq("user_id", userId)
      .eq("collection_id", context.vaultCollectionId)
      .or("expires_at.is.null,expires_at.gt.now()")
      .limit(1);
    if ((data ?? []).length > 0) return true;
  }

  const { data: purchaseItems } = await supabase
    .from("purchase_items")
    .select("products(grants), purchases!inner(user_id, status)")
    .eq("purchases.user_id", userId)
    .in("purchases.status", ["completed", "paid", "succeeded"]);

  return (purchaseItems ?? []).some((item) => {
    const product = Array.isArray(item.products) ? item.products[0] : item.products;
    return Array.isArray(product?.grants) && product.grants.some((grant) => grantMatchesContext(grant, context));
  });
}

async function canUsePersistedAsset(
  userId: string | null | undefined,
  asset: SignableAsset,
  options: { publicKinds?: MediaAssetContract["kind"][] }
): Promise<boolean> {
  const kind = classifyMediaAsset({ path: asset.path, ownerType: asset.ownerType });
  if (asset.access === "public" && (!options.publicKinds || options.publicKinds.includes(kind))) {
    return true;
  }

  if (!userId) return false;

  const context = await resolvePersistedEntitlementContext(asset);
  if (!context) return false;
  return userHasPersistedEntitlement(userId, context);
}

export async function createSignedMediaUrl(
  userId: string | null | undefined,
  assetId: string,
  options: { publicKinds?: MediaAssetContract["kind"][] } = {}
) {
  const access = assertCanAccessMedia(userId, assetId, options);
  const persistedAsset = !access.asset ? await getPersistedMediaAsset(assetId) : null;
  if ((!access.allowed || !access.asset) && !persistedAsset) {
    return { ok: false as const, status: access.asset ? 403 : 404, message: access.reason };
  }

  if (persistedAsset && !(await canUsePersistedAsset(userId, persistedAsset, options))) {
    return { ok: false as const, status: 403, message: "Entitlement required" };
  }

  const supabase = getServerSupabase();
  const signableAsset = access.asset ?? persistedAsset;
  if (!signableAsset) {
    return { ok: false as const, status: 404, message: "Media asset not found" };
  }

  if (!supabase) {
    return {
      ok: true as const,
      url: `https://signed.local/${signableAsset.bucket}/${signableAsset.path}?asset=${assetId}`,
      expiresIn: 300,
      mocked: true
    };
  }

  const { data, error } = await supabase.storage
    .from(signableAsset.bucket)
    .createSignedUrl(signableAsset.path, 300);

  if (error || !data?.signedUrl) {
    return { ok: false as const, status: 502, message: error?.message ?? "Unable to create signed URL" };
  }

  return { ok: true as const, url: data.signedUrl, expiresIn: 300, mocked: false };
}
