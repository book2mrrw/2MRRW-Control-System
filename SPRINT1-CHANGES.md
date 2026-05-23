# Sprint 1 — Ownership & playback (P1.1–P1.6)

**Date:** 2026-05-23  
**WHY:** Platform audit P0 — storefront `library_items.product_id` vs control `item_id` fork; playback leaked full URLs from catalog; collector/vault ledgers not granted or revoked on purchase/refund.

## P1.1 — Control `signedUrlService`

- Entitlement checks `library_items.product_id` via `products.content_id` (track/release).
- Legacy `item_id` query retained for control-only DB rows.
- Track assets also match release-level product ownership.

**File:** `src/server/media/signedUrlService.ts`

## Storefront (artist-platform)

| Task | Summary |
|------|---------|
| P1.2 | `lib/playback/resolve-playback-key.js` — product → release/track → `media_assets` / `release_media`, fallback `products.storage_path` |
| P1.3 | Catalog mapping no longer resolves entitled full URLs; `mapItemToAudioTrack` gates full src on account state |
| P1.4 | `lib/playback/playback-gate.js` — owned slugs + membership/collector from `account/state` |
| P1.5 | `fulfill-purchase.js` calls `grantCollectorOwnerships` + `grantVaultPassEntitlement` |
| P1.6 | `revoke-entitlements.js` + webhook extended revocation |

## Deferred (Sprint 2+)

- P1.7–P1.8 entitlements table + dual-write
- P1.9–P1.10 control seed webhook + catalog fallback
- P2 release catalog sync on publish
