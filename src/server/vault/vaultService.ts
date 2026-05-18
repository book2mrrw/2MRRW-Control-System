import { vaultCollections, vaultContent } from "@/server/data/seedData";
import { getAccountState } from "@/server/account/accountStateService";
import { getMediaAsset } from "@/server/media/mediaAssetService";
import { classifyMediaAsset, toMediaAssetContract, type MediaAssetContract } from "@/server/media/mediaObjects";

const progress = new Map<string, Map<string, { completed: boolean; updatedAt: string }>>();

function vaultAccessForUser(userId: string, collectionId: string) {
  const state = getAccountState(userId);
  return {
    unlocked: state.permissions.canAccessVaultCollectionIds.includes(collectionId),
    membershipTiers: state.permissions.membershipTiers
  };
}

function getRequiredTier(collectionId: string) {
  if (collectionId === "vault_founder_room") return "founder";
  return "vault";
}

function getAccessLabel(unlocked: boolean, requiredTier: string) {
  if (unlocked) return "Access Granted";
  if (requiredTier === "founder") return "Founder Room";
  return "Vault Pass";
}

function getAssetContract(assetId: string | undefined, unlocked: boolean): MediaAssetContract | undefined {
  if (!unlocked || !assetId) return undefined;
  const asset = getMediaAsset(assetId);
  return asset ? toMediaAssetContract(asset) : undefined;
}

function getPublicPreviewAssetContract(assetId: string | undefined): MediaAssetContract | undefined {
  if (!assetId) return undefined;
  const asset = getMediaAsset(assetId);
  if (!asset || asset.access !== "public") return undefined;
  const kind = classifyMediaAsset(asset);
  return kind === "artwork" || kind === "preview" || kind === "loop" ? toMediaAssetContract(asset) : undefined;
}

function toVaultPreviewContract(item: (typeof vaultContent)[number], userId: string) {
  const collection = vaultCollections.find((row) => row.id === item.collectionId) ?? null;
  const access = vaultAccessForUser(userId, item.collectionId);
  const requiredTier = getRequiredTier(item.collectionId);
  const mediaAsset = getAssetContract(item.assetId, access.unlocked);
  const previewFields = item as typeof item & {
    coverAssetId?: string;
    thumbnailAssetId?: string;
    previewAssetId?: string;
  };
  const coverAsset = getPublicPreviewAssetContract(previewFields.coverAssetId ?? previewFields.thumbnailAssetId);
  const previewAsset = getPublicPreviewAssetContract(previewFields.previewAssetId);

  return {
    id: item.id,
    slug: item.slug,
    collectionId: item.collectionId,
    collectionSlug: collection?.slug ?? null,
    collectionTitle: collection?.title ?? null,
    title: item.title,
    type: item.type ?? "document",
    category: item.category ?? collection?.title ?? "Vault",
    description: item.description ?? "Preview this Vault item, then unlock the full artifact with eligible access.",
    teaser: item.teaser ?? "Private Vault artifact",
    order: item.order ?? 0,
    accessTier: requiredTier,
    accessLabel: getAccessLabel(access.unlocked, requiredTier),
    locked: !access.unlocked,
    unlocked: access.unlocked,
    canPreview: true,
    hasPreview: true,
    hasMedia: Boolean(mediaAsset),
    entitlement: {
      unlocked: access.unlocked,
      requiredGrant: "vault",
      requiredTier,
      membershipTiers: access.membershipTiers
    },
    coverAsset,
    coverAssetId: coverAsset?.assetId,
    previewAsset,
    previewAssetId: previewAsset?.assetId,
    mediaAsset,
    mediaAssetId: mediaAsset?.assetId
  };
}

export function listVaultContent(userId: string) {
  return vaultContent
    .map((item) => toVaultPreviewContract(item, userId))
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

export function getVaultContentMedia(userId: string, contentId: string) {
  return vaultContent.find((item) => {
    const access = vaultAccessForUser(userId, item.collectionId);
    return access.unlocked && (item.id === contentId || item.slug === contentId);
  }) ?? null;
}

export function updateVaultProgress(userId: string, contentId: string, completed: boolean) {
  const userProgress = progress.get(userId) ?? new Map<string, { completed: boolean; updatedAt: string }>();
  const row = { completed, updatedAt: new Date().toISOString() };
  userProgress.set(contentId, row);
  progress.set(userId, userProgress);
  return row;
}

export function listVaultCollections() {
  return vaultCollections;
}
