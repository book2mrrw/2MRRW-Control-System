import { artworkPublicFallbackUrl } from "@/server/media/artworkPublicFallback";
import {
  R2_BUCKET,
  R2_PREFIX,
  buildR2Key,
  createR2SignedGetUrl,
  r2MockSignedUrl
} from "@/lib/storage/r2";
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

async function userOwnsProductIds(
  supabase: NonNullable<ReturnType<typeof getServerSupabase>>,
  userId: string,
  productIds: string[]
) {
  if (!productIds.length) return false;

  const { data: byProductId } = await supabase
    .from("library_items")
    .select("id")
    .eq("user_id", userId)
    .in("product_id", productIds)
    .limit(1);
  if ((byProductId ?? []).length > 0) return true;

  const { data: byLegacyItemId } = await supabase
    .from("library_items")
    .select("id")
    .eq("user_id", userId)
    .in("item_id", productIds)
    .limit(1);
  return (byLegacyItemId ?? []).length > 0;
}

async function productIdsForContent(
  supabase: NonNullable<ReturnType<typeof getServerSupabase>>,
  contentIds: string[]
) {
  if (!contentIds.length) return [];

  const { data: products } = await supabase.from("products").select("id").in("content_id", contentIds);
  return (products ?? []).map((row) => row.id).filter((id): id is string => Boolean(id));
}

async function userHasStorefrontLibraryEntitlement(
  supabase: NonNullable<ReturnType<typeof getServerSupabase>>,
  userId: string,
  context: PersistedEntitlementContext
) {
  const contentIds = [context.trackId, context.releaseId].filter((value): value is string => Boolean(value));
  const productIds = await productIdsForContent(supabase, contentIds);
  if (await userOwnsProductIds(supabase, userId, productIds)) return true;

  if (context.trackId && !context.releaseId) {
    const { data: track } = await supabase
      .from("tracks")
      .select("release_id")
      .eq("id", context.trackId)
      .maybeSingle();
    if (track?.release_id) {
      const releaseProductIds = await productIdsForContent(supabase, [track.release_id]);
      if (await userOwnsProductIds(supabase, userId, releaseProductIds)) return true;
    }
  }

  const legacyItemIds = [context.trackId, context.releaseId].filter((value): value is string => Boolean(value));
  if (!legacyItemIds.length) return false;

  const { data: legacyLibrary } = await supabase
    .from("library_items")
    .select("id")
    .eq("user_id", userId)
    .in("item_id", legacyItemIds)
    .limit(1);
  return (legacyLibrary ?? []).length > 0;
}

async function userHasPersistedEntitlement(userId: string, context: PersistedEntitlementContext) {
  const supabase = getServerSupabase();
  if (!supabase || !isUuid(userId)) return false;

  if (await userHasStorefrontLibraryEntitlement(supabase, userId, context)) {
    return true;
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
  options: { publicKinds?: MediaAssetContract["kind"][]; studioBypass?: boolean }
): Promise<boolean> {
  const kind = classifyMediaAsset({ path: asset.path, ownerType: asset.ownerType });
  if (options.studioBypass) return true;
  if (asset.access === "public" && (!options.publicKinds || options.publicKinds.includes(kind))) {
    return true;
  }

  if (!userId) return false;

  const context = await resolvePersistedEntitlementContext(asset);
  if (!context) return false;
  return userHasPersistedEntitlement(userId, context);
}

// Stabilization: cap concurrent Supabase sign calls to avoid storage API stampedes during catalog recovery.
const MAX_CONCURRENT_SIGNS = 4;
let activeSigns = 0;
const signWaiters: Array<() => void> = [];

async function withSignSlot<T>(work: () => Promise<T>): Promise<T> {
  while (activeSigns >= MAX_CONCURRENT_SIGNS) {
    await new Promise<void>((resolve) => signWaiters.push(resolve));
  }
  activeSigns += 1;
  try {
    return await work();
  } finally {
    activeSigns -= 1;
    signWaiters.shift()?.();
  }
}

export async function createSignedMediaUrl(
  userId: string | null | undefined,
  assetId: string,
  options: { publicKinds?: MediaAssetContract["kind"][]; studioBypass?: boolean } = {}
) {
  console.log("[stabilize] createSignedMediaUrl", { assetId });
  const started = Date.now();
  return withSignSlot(async () => {
  const access = assertCanAccessMedia(userId, assetId, {
    publicKinds: options.publicKinds,
    studioBypass: options.studioBypass
  });
  const persistedAsset = !access.asset ? await getPersistedMediaAsset(assetId) : null;
  if ((!access.allowed || !access.asset) && !persistedAsset) {
    console.log("[stabilize] createSignedMediaUrl denied", { assetId, ms: Date.now() - started });
    return { ok: false as const, status: access.asset ? 403 : 404, message: access.reason };
  }

  if (persistedAsset && !(await canUsePersistedAsset(userId, persistedAsset, options))) {
    console.log("[stabilize] createSignedMediaUrl entitlement", { assetId, ms: Date.now() - started });
    return { ok: false as const, status: 403, message: "Entitlement required" };
  }

  const supabase = getServerSupabase();
  const signableAsset = access.asset ?? persistedAsset;
  if (!signableAsset) {
    console.log("[stabilize] createSignedMediaUrl missing", { assetId, ms: Date.now() - started });
    return { ok: false as const, status: 404, message: "Media asset not found" };
  }

  if (!supabase) {
    console.log("[stabilize] createSignedMediaUrl mocked", { assetId, ms: Date.now() - started });
    return {
      ok: true as const,
      url: r2MockSignedUrl(buildR2Key(R2_PREFIX.PROTECTED_MEDIA, signableAsset.path)) + `?asset=${assetId}`,
      expiresIn: 300,
      mocked: true
    };
  }

  const r2Key = buildR2Key(R2_PREFIX.PROTECTED_MEDIA, signableAsset.path);
  try {
    const signedUrl = await createR2SignedGetUrl(r2Key, 3600);
    console.log("[stabilize] createSignedMediaUrl ok", { assetId, ms: Date.now() - started });
    return { ok: true as const, url: signedUrl, expiresIn: 3600, mocked: false };
  } catch (err) {
    const fallback = artworkPublicFallbackUrl(signableAsset.path);
    if (fallback) {
      console.log("[stabilize] createSignedMediaUrl fallback", { assetId, ms: Date.now() - started });
      return { ok: true as const, url: fallback, expiresIn: 300, mocked: false, fallback: true as const };
    }
    const message = err instanceof Error ? err.message : "Unable to create signed URL";
    console.log("[stabilize] createSignedMediaUrl error", { assetId, ms: Date.now() - started });
    return { ok: false as const, status: 502, message };
  }
  });
}
