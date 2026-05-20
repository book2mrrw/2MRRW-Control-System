# Phase 2 E2E Checkpoints

Branches: **control** + **artist-platform** `dev`

## Prerequisites

- [ ] Migration `0020` applied (see `MIGRATION_0020_APPLY.md`)
- [ ] Migration `0021` applied (drops + two-layer assets)
- [ ] `ADMIN_SEED_SECRET` matches on control + artist-platform
- [ ] `ARTIST_PLATFORM_API_URL` set on control (e.g. `http://localhost:3000`)

## Control studio

1. [ ] `npm run verify` passes
2. [ ] **Vault** — create item with shelf URL + content URL; publish → sync dirty + storefront push (check logs)
3. [ ] **Vault drops** — toggle surprise drop, set expiry/glow; publish → vague notification event (storefront)
4. [ ] **Collector cards** — publish → `products` row + catalog sync
5. [ ] **Commerce** — inline price/gift/active save → PATCH + sync queue
6. [ ] **Manual sync** — `POST /api/admin/sync/catalog` (studio session)

## Storefront

1. [ ] `GET /api/catalog/exclusive-drops` returns items (or falls back to static in UI)
2. [ ] Vault tab / home vault grid uses API-backed exclusives when sync populated products
3. [ ] `GET /api/public/vault` — pricing: $70 regular, $27.99 subscriber, collector free
4. [ ] Inner Circle (unlocked) shows additive `VaultUnlockedRoom` 3D shelf — **locked UI unchanged**
5. [ ] `GET /api/vault/content` still serves `vault_content` (extended rows after sync)

## Regression

- [ ] Release pricing + Living Scroll unchanged
- [ ] Locked vault / Inner Circle gate unchanged for non-members
- [ ] No Commerce tab on storefront

## Edge cases

- Sync failure after publish does not block publish (retries in background)
- Missing `ADMIN_SEED_SECRET` — sync skipped, in-memory control still works
- Expired drop — storefront metadata includes `expiresAt` for future UI gating
