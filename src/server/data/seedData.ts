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

export const releases: Release[] = [
  {
    id: "rel_afterhours",
    slug: "afterhours-control",
    title: "Afterhours Control",
    artistId: "artist_2mrrw",
    releaseDate: "2026-05-17",
    published: true,
    coverAssetId: "asset_cover_afterhours"
  }
];

export const tracks: Track[] = [
  {
    id: "trk_signal",
    releaseId: "rel_afterhours",
    title: "Signal Opens",
    durationSeconds: 201,
    mediaAssetId: "asset_audio_signal",
    position: 1
  },
  {
    id: "trk_radio",
    releaseId: "rel_afterhours",
    title: "Radio Independence",
    durationSeconds: 244,
    mediaAssetId: "asset_audio_radio",
    position: 2
  }
];

export const mediaAssets = [
  {
    id: "asset_cover_afterhours",
    bucket: "protected-media",
    path: "artwork/afterhours-control/cover.jpg",
    ownerType: "release",
    ownerId: "rel_afterhours",
    access: "public"
  },
  {
    id: "asset_audio_signal",
    bucket: "protected-media",
    path: "masters/afterhours-control/signal-opens.wav",
    ownerType: "track",
    ownerId: "trk_signal",
    access: "entitled"
  },
  {
    id: "asset_preview_signal",
    bucket: "protected-media",
    path: "previews/afterhours-control/signal-opens.mp3",
    ownerType: "track",
    ownerId: "trk_signal",
    access: "public"
  },
  {
    id: "asset_audio_radio",
    bucket: "protected-media",
    path: "masters/afterhours-control/radio-independence.wav",
    ownerType: "track",
    ownerId: "trk_radio",
    access: "entitled"
  },
  {
    id: "asset_lyrics_radio",
    bucket: "protected-media",
    path: "lyrics/afterhours-control/radio-independence.txt",
    ownerType: "track",
    ownerId: "trk_radio",
    access: "entitled"
  },
  {
    id: "asset_vault_demo",
    bucket: "protected-media",
    path: "vault/founder-room/session-notes.pdf",
    ownerType: "vault_content",
    ownerId: "vault_demo",
    access: "entitled"
  }
] as const;

export const products: Product[] = [
  {
    id: "prod_afterhours_digital",
    slug: "afterhours-digital",
    name: "Afterhours Control Digital",
    stripePriceId: "price_afterhours_digital",
    grants: [{ type: "release", releaseId: "rel_afterhours" }]
  },
  {
    id: "prod_founder_membership",
    slug: "founder-membership",
    name: "Founder Membership",
    stripePriceId: "price_founder_membership",
    grants: [
      { type: "membership", tier: "founder" },
      { type: "vault_collection", collectionId: "vault_founder_room" }
    ]
  }
];

export const vaultCollections = [{ id: "vault_founder_room", slug: "founder-room", title: "Founder Room" }];

export const vaultContent = [
  {
    id: "vault_demo",
    collectionId: "vault_founder_room",
    slug: "session-notes",
    title: "Session Notes",
    assetId: "asset_vault_demo"
  }
];

export const signals: Signal[] = [
  {
    id: "sig_release_window",
    slug: "release-window",
    title: "Release Window Signal",
    audienceSegmentId: "seg_release_followers",
    startsAt: "2026-01-01T00:00:00.000Z",
    endsAt: "2027-01-01T00:00:00.000Z",
    cooldownKey: "release-window"
  }
];

export const radioChannels: RadioChannel[] = [
  { id: "radio_main", slug: "main", title: "2MRRW Radio", enabled: true }
];

export const radioFeed = [
  {
    id: "feed_intro",
    channelId: "radio_main",
    kind: "track",
    trackId: "trk_radio",
    startsAt: "2026-05-17T00:00:00.000Z"
  }
];
