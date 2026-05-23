# Sprint 3 Implementation Report — P2.1–P2.8, P3 (start)

**Date:** 2026-05-23  
**Audit source:** `2MRRW-Platform-Architecture-Audit-2026-05-22.zip`  
**Sprint 2 baseline:** control `cb2827d`, storefront `3c8b49e`

---

## Commits

| Repo | SHA | Message |
|------|-----|---------|
| Control | `cca3fdfe0072b4aab0a4694bd45c1b2f7f4e5502` | `fix(p3): sync reliability, publish gates, env validation` |
| Storefront | `b17771a3ceff5dffdbe7ff41f1086563ec8f3fac` | `fix(p3): gift security, sync consumer hardening` |

---

## Task status

| ID | Task | Status | Notes |
|----|------|--------|-------|
| P2.1 | Unify `STOREFRONT_SYNC_URL` + validation | Done | `storefrontSyncConfig.ts`, `.env.example` both repos |
| P2.2 | Release products in catalog sync | Done | (Sprint 2) unchanged |
| P2.3 | Normalize `storage_path` on sync | Done | `normalizeStoragePath.ts` / `normalize-storage-path.js` |
| P2.4 | Failed slugs from storefront sync API | Done | `failed[]` in catalog route + `GET /api/admin/sync/catalog-failures` |
| P2.5 | Dirty state on partial failure | Done | `markSyncDirty` when `failed.length > 0` |
| P2.6 | Publish readiness gate | Done | `assertPublishStorefrontReadiness` + `storefront_sync` readiness check |
| P2.7 | Migration manifest | Done | `docs/MIGRATION_MANIFEST.md` |
| P2.8 | Daily reconcile cron | Done | `/api/cron/reconcile-catalog` + `vercel.json` schedule |
| P3.1 | Hash gift tokens at rest | Done | `20260602000000_gift_token_hash.sql` + `token-hash.js` |
| P3.2 | Rate limit claim + preview | Done | `gifts.claim` / `gifts.preview` + catalog sync rate limit |
| P3.3 | Claim entitlements dual-write | Done | `gift_id` in entitlement metadata on claim |
| P3.4 | Gift requires synced product | Done | (Sprint 2) `resolveProductByReleaseSlug` / control `resolveProductId` |
| P3.5 | Revoke parity | Done | Control `revokeAdminGift` revokes `entitlements`; storefront uses existing helpers |

---

## Build & test results

| Repo | Command | Result |
|------|---------|--------|
| Control | `npm run typecheck` | Pass |
| Control | `npm run build` | Pass |
| Storefront | `npm run build` | Pass |

---

## Operator follow-up

1. Apply storefront migration `20260602000000_gift_token_hash.sql`.
2. Set control production env: `STOREFRONT_SYNC_URL` (canonical), `ADMIN_SEED_SECRET` (matches storefront).
3. Smoke: publish priced release → catalog sync → storefront `products.storage_path` under `protected-media/` or `digital-assets/`.
4. Partial failure test: `GET /api/admin/sync/catalog-failures` shows `failedSlugs` when ingest errors.
5. Cron: ensure `CRON_SECRET` on control for `/api/cron/reconcile-catalog` (daily 07:00 UTC in `vercel.json`).
6. New gifts use hash-only storage; reminder cron skips hash-only rows until signed reminder links (Sprint 4).

---

## Remaining gaps (Sprint 4)

| ID | Item |
|----|------|
| P4.* | Signed URL client cache, batch signed-url, SSE heartbeat |
| P3 | Gift reminder links for hash-only tokens (signed URL or encrypted store) |
| — | Full live E2E with Stripe test mode |
| — | 2-week entitlements vs `library_items` parity monitoring |
| — | `media_playback_progress` reconcile (ops) |
