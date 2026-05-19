import type { Product, Profile, RadioChannel, Release, Signal, Track } from "@/server/types";

export const nowIso = () => new Date().toISOString();

export const profiles: Profile[] = [
  {
    id: "user_demo",
    email: "demo@2mrrw.local",
    displayName: "2MRRW Listener",
    role: "user",
    createdAt: "2026-05-17T00:00:00.000Z"
  },
  {
    id: "admin_demo",
    email: "admin@2mrrw.local",
    displayName: "Control Admin",
    role: "admin",
    createdAt: "2026-05-17T00:00:00.000Z"
  }
];

export const artists = [{ id: "artist_2mrrw", name: "2MRRW", slug: "2mrrw" }];

export const releases: Release[] = [];

export const tracks: Track[] = [];

export const mediaAssets: Array<{ id: string; bucket: string; path: string; ownerType: string; ownerId: string; access: string }> = [];

export const products: Product[] = [];

export const vaultCollections: Array<{ id: string; slug: string; title: string }> = [];

export const vaultContent: Array<{
  id: string;
  collectionId: string;
  slug: string;
  title: string;
  type: string;
  category: string;
  description: string;
  teaser: string;
  order: number;
  assetId: string;
}> = [];

export const signals: Signal[] = [];

export const radioChannels: RadioChannel[] = [];

export const radioFeed: Array<{ id: string; channelId: string; kind: string; trackId: string; startsAt: string }> = [];
