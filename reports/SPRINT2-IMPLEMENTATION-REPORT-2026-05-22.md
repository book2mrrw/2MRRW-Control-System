# Sprint 2 Implementation Report — P1.7–P1.11, P2.2

**Date:** 2026-05-23  
**Audit source:** `2MRRW-Platform-Architecture-Audit-2026-05-22.zip`  
**Sprint 1 baseline:** control `951de2b`, storefront `ec935d1`

---

## Commits

| Repo | SHA | Message |
|------|-----|---------|
| Control | `cb2827dbe4c17cef124198bb8832e79890f0057e` | `fix(p2): entitlements dual-write, catalog sync releases, seed webhook` |
| Storefront | `3c8b49e7f7b5d057515a67a8eb9b61d6e98b81c9` | `fix(p2): entitlements read path, products schema, e2e playback test` |

---

## Task status

| ID | Task | Status | Notes |
|----|------|--------|-------|
| P1.7 | `entitlements` table + backfill | Done | `20260601000000_unified_entitlements.sql` |
| P1.8 | Dual-write fulfill + gift | Done | Via `grantLibraryItems` → `grantEntitlementsForProducts`; revoke on refund |
| P1.9 | Disable control seed webhook in prod | Done | `ALLOW_CONTROL_STRIPE_SEED=true` dev-only gate |
| P1.10 | Public catalog fallback `canStream: false` | Done | `public/releases/route.ts` |
| P1.11 | Purchase → library → stream E2E | Done | `scripts/test-library-stream-e2e.mjs` (+ logic tests) |
| P2.2 | Release products in catalog sync | Done | `listReleaseProductsForStorefrontSync`, publish hook |
| DB | `products.content_id` / `content_type` | Done | `20260601000001_products_content_parity.sql` |

---

## Build & test results

| Repo | Command | Result |
|------|---------|--------|
| Control | `npm run typecheck` | Pass |
| Control | `npm run build` | Pass |
| Control | `npm run test` | Fail (pre-existing: top-level await in `backend-foundation.test.ts`) |
| Storefront | `npm run build` | Pass |
| Storefront | `node scripts/test-entitlements-read-path.mjs` | Pass |
| Storefront | `node scripts/test-playback-gate.mjs` | Pass |
| Storefront | `node scripts/test-library-stream-e2e.mjs` | Pass (logic); live mode needs `E2E_*` env |

---

## Operator follow-up

1. Apply storefront migrations `20260601000000` and `20260601000001` on production Supabase.
2. Smoke: purchase → verify `library_items` + `entitlements` rows → `GET /api/library/stream?slug=…&redirect=1` → 302.
3. Publish release with price → confirm `{slug}-digital` product syncs to storefront with `content_id` + `storage_path`.

---

## Remaining gaps (Sprint 3)

| ID | Item |
|----|------|
| P2.1 | Unify `STOREFRONT_SYNC_URL` env + startup validation |
| P2.3–P2.8 | Sync path normalization, failed slugs, dirty state, publish readiness, reconcile cron |
| P3.* | Gifting hash-at-rest, rate limits, claim parity |
| P4.* | Signed URL caching, batch signed-url, SSE heartbeat |
| — | Full live E2E with Stripe test mode fixture |
| — | 2-week entitlements vs `library_items` parity monitoring before deprecating library reads |
