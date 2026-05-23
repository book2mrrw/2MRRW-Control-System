# Sprint 1 Implementation Report — P1.1–P1.6

**Date:** 2026-05-23  
**Audit source:** `2MRRW-Platform-Architecture-Audit-2026-05-22.zip`  
**Resume:** architecture audit agent `cf1d28f7-fab8-4ba7-b5ee-95b2bf841a62`

---

## Commits

| Repo | SHA | Message |
|------|-----|---------|
| Control (`2MRRW-Control-System`) | `951de2b1786cf785a9b6dc71a6365b71078fa856` | `fix(p1): ownership and sync hardening sprint 1` |
| Storefront (`artist-platform`) | `ec935d1fd18c64f9f76944f02b81feeadf5ea987` | `fix(p1): playback and library schema sprint 1` |

---

## P1.1 — Control signedUrlService

**Status:** Done  
**WHY:** Production storefront uses `library_items.product_id`; control queried `item_id` only → false 403 on signed URLs.

**Changes:**
- `userHasStorefrontLibraryEntitlement`: `products.content_id` → `library_items.product_id`
- Track assets inherit release product ownership via `tracks.release_id`
- Legacy `library_items.item_id` retained for control-schema rows

**File:** `src/server/media/signedUrlService.ts`

---

## P1.2 — resolvePlaybackKey + library/stream

**Status:** Done  
**WHY:** Stream route only read `products.storage_path`; release masters live on `media_assets` / `protected-media`.

**Changes:**
- `src/lib/playback/resolve-playback-key.js` — slug → product → release/track → `release_media` / `media_assets` → R2 key
- `src/lib/playback/normalize-r2-key.js` — `digital-assets` vs `protected-media` prefix
- `src/app/api/library/stream/route.js` — entitlement check first, 3600s signed GET

---

## P1.3 — No full audio in public catalog

**Status:** Done  
**WHY:** `resolveControlSystemMediaUrls` fetched entitled signed URLs at catalog load.

**Changes:**
- `releases.js` — preview-only catalog hydration; `full` cleared; `fullAssetId` preserved for entitled stream path
- `media.js` — `mapItemToAudioTrack` does not emit full URLs without account state

---

## P1.4 — Playback gate vs account/state

**Status:** Done  
**WHY:** `entitlement.canStream` from control catalog must not override ledger.

**Changes:**
- `src/lib/playback/playback-gate.js` — `catalogItemAllowsFullPlayback` uses `ownedSlugs` + membership/collector from account state
- `mapItemToAudioTrack(item, source, accountState)` optional third arg for server-aligned gate
- Client playback already uses `resolvePlaybackSrc` → `/api/library/stream` when `canStream` (music-access.js)

---

## P1.5 — Collector / vault fulfillment

**Status:** Done  
**WHY:** Helpers existed but were never called from Stripe fulfillment.

**Changes:**
- `fulfill-purchase.js` — after `grantLibraryItems`, calls `grantCollectorOwnerships` and `grantVaultPassEntitlement` for checkout + payment_intent paths

---

## P1.6 — Refund revocation parity

**Status:** Done  
**WHY:** Refunds deleted `library_items` only; collector/vault/membership rows remained.

**Changes:**
- `src/lib/commerce/revoke-entitlements.js` — revoke collector by `purchase_id`, vault status → `revoked`, membership cancel when membership SKU in slugs
- `handle-stripe-webhook.js` — `revokeExtendedEntitlementsForPurchase` after library delete

---

## Build & test results

| Repo | Command | Result |
|------|---------|--------|
| Control | `npm run typecheck` | Pass |
| Control | `npm run build` | Pass |
| Storefront | `npm run build` | Pass |
| Storefront | `node scripts/test-playback-gate.mjs` | Pass |

---

## Diff summary (high level)

**Control (+88 / -9 lines in commit)**
- `signedUrlService.ts` — storefront + legacy entitlement queries

**Storefront (+395 / -23 lines in commit)**
- New: `lib/playback/*`, `lib/commerce/revoke-entitlements.js`, `scripts/test-playback-gate.mjs`
- Updated: `library/stream`, `fulfill-purchase`, `handle-stripe-webhook`, `releases.js`, `media.js`

---

## Remaining P1 gaps (not in Sprint 1 scope)

| ID | Item | Notes |
|----|------|-------|
| P1.7–P1.8 | `entitlements` table + dual-write | Sprint 2 per tasklist |
| P1.9 | Disable control seed Stripe webhook in prod | Sprint 1 mapping but not requested in user deliverables |
| P1.10 | Public catalog fallback `canStream: false` | Control `public/releases/route.ts` |
| P1.11 | Integration test purchase → stream 200 | Needs live Stripe + Supabase fixture |
| P2.2 | Release products in `syncPublishedCatalogToStorefront` | Catalog sync still vault/cards only |
| — | `products.content_type` column on storefront DB | Migration idempotent bundle still recommended |

---

## Operator follow-up

1. Apply storefront migration if `content_id` / `content_type` missing on `products` (Control `0020` parity).
2. Smoke: purchase digital slug → `library_items` → `GET /api/library/stream?slug=…&redirect=1` returns 302 to R2.
3. Refund test: verify `collector_ownerships` / `vault_entitlements` revoked for same `purchase_id`.
