export type ISODateString = string;

export type Profile = {
  id: string;
  email: string;
  displayName: string;
  role: "user" | "admin";
  createdAt: ISODateString;
};

export type Release = {
  id: string;
  slug: string;
  title: string;
  artistId: string;
  releaseDate: string;
  releaseType?: "single" | "album" | "ep" | "deluxe" | "remix_pack" | "feature";
  published: boolean;
  coverAssetId: string;
};

export type Track = {
  id: string;
  releaseId: string;
  title: string;
  durationSeconds: number;
  mediaAssetId: string;
  position: number;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  stripePriceId: string;
  priceCents?: number | null;
  currency?: string | null;
  grants: EntitlementGrant[];
};

export type EntitlementGrant =
  | { type: "release"; releaseId: string }
  | { type: "track"; trackId: string }
  | { type: "vault_collection"; collectionId: string }
  | { type: "membership"; tier: "supporter" | "collector" | "founder" };

export type NormalizedPermissions = {
  canStreamTrackIds: string[];
  canDownloadAssetIds: string[];
  canAccessVaultCollectionIds: string[];
  membershipTiers: string[];
  isAdmin: boolean;
};

export type AccountState = {
  profile: Profile | null;
  entitlements: EntitlementGrant[];
  library: {
    savedTrackIds: string[];
    savedReleaseIds: string[];
    purchasedProductIds: string[];
  };
  playback: {
    progressByTrackId: Record<string, { positionSeconds: number; updatedAt: ISODateString }>;
    activeSessionIds: string[];
  };
  notifications: {
    unreadCount: number;
    preferences: Record<string, boolean>;
  };
  activeSessions: string[];
  permissions: NormalizedPermissions;
};

export type Signal = {
  id: string;
  slug: string;
  title: string;
  audienceSegmentId: string;
  startsAt: ISODateString;
  endsAt: ISODateString;
  cooldownKey: string;
};

export type RadioChannel = {
  id: string;
  slug: string;
  title: string;
  enabled: boolean;
};
