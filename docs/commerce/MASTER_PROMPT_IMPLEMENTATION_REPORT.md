# Complete Master Prompt — Implementation Report

**Date:** 2026-05-19  
**Branches:** `dev` (control + artist-platform)

## Phase 0 — Audit (dev)

| Area | Status on dev before this pass |
|------|-------------------------------|
| **Phase 1 — Music releases** | **Complete** (`13ce2ff`): draft pricing columns, metadata API, `upsertReleaseProduct`, readiness, CreatorReleaseSystem pricing UI, gift proxy, `markSyncDirty` on publish |
| **Phase 6 — Lyrics (storefront)** | **Complete** (`d24d114`): Living Scroll CSS, credits, timed/static lyrics in release modal |
| **Phase 2 — Collector cards** | **Missing** control pricing write path + studio panel |
| **Phase 3 — Vault tab** | Placeholder ModulePage / media vault upload only; no `vault_items` CRUD |
| **Phase 4 — Commerce tab** | Placeholder only |
| **Phase 5 — Universal gifting** | Release-only proxy |
| **Phase 7 — Sync** | Releases + audio visuals; not collector/vault publish |
| **Phase 3B — Vault frontend** | Storefront `vault_content` exists; 3D unlocked room deferred |

## Shipped in this pass (control-system)

### Migrations

- `src/db/migrations/0020_universal_commerce_catalog.sql`
  - `products`: `content_type`, `content_id`, `label`, `gifting_enabled`
  - `collector_cards` table
  - `vault_items` table (8-category archive; not collector cards)

### Server

| Path | Role |
|------|------|
| `src/server/commerce/productCommerceService.ts` | Universal product upsert |
| `src/server/commerce/pricingTaxonomies.ts` | Content types, slug helpers, 8 vault categories |
| `src/server/commerce/pricingValidation.ts` | Release + collector + vault price bands |
| `src/server/commerce/releaseCommerceService.ts` | Uses universal upsert + `content_type: release` |
| `src/server/collector-cards/collectorCardService.ts` | CRUD + publish + product upsert |
| `src/server/vault/vaultItemService.ts` | CRUD + publish + optional priced product |
| `src/lib/commerce/vaultCategories.ts` | Client-safe category list |

### Admin APIs

| Method | Route |
|--------|-------|
| GET/POST | `/api/admin/collector-cards` |
| GET/PATCH/DELETE | `/api/admin/collector-cards/[id]` |
| POST | `/api/admin/collector-cards/[id]/publish` |
| GET/POST | `/api/admin/vault` |
| GET/PATCH/DELETE | `/api/admin/vault/[id]` |
| POST | `/api/admin/vault/[id]/publish` |
| GET | `/api/admin/commerce/products` |
| POST | `/api/admin/gifts` (extended: `contentType` + `contentId`) |

### Control studio UI

| Tab | Component |
|-----|-----------|
| **Collector's Cards** | `CollectorsCardsPanel` — dedicated nav; not in Vault |
| **Vault** | `VaultControlPanel` — 8 category tabs |
| **Commerce** | `CommerceControlPanel` — unified priced items |

Nav wired in `CreatorReleaseSystem.tsx` (`/collectors`, `/vault`, `/commerce`).

### Sync

- Collector publish → `markSyncDirty('catalog')`, `markSyncDirty('collector_card:{id}')`
- Vault publish → `markSyncDirty('vault')`, `markSyncDirty('catalog')`
- Releases unchanged (existing publish path)

## Deferred (next tranche)

| Phase | Notes |
|-------|--------|
| **3B — Vault frontend** | Additive unlocked 3D room/shelves in artist-platform; **do not** change locked vault |
| **4 — Commerce inline edit** | Read-only unified list; inline PATCH deferred |
| **5 — GiftTransaction** | Storefront `gift_transactions` exists; fan purchase flow not expanded |
| **8 — Full E2E run** | Manual checklist in `PRICING_GIFTING_E2E.md` + sections below |

## E2E checklist (manual)

### Control

1. `npm run dev` on control `dev`
2. **Releases** — confirm existing pricing + publish still works (Phase 1 regression)
3. **Collector's Cards** — create card, set price, publish → check `products` row `content_type=collector_card`
4. **Vault** — create item under each category panel, publish priced item → product slug `vault-{slug}`
5. **Commerce** — tab lists all priced rows
6. **Gifts** — POST with `contentType: collector_card`, `contentId` (requires `ADMIN_SEED_SECRET`)

### Storefront

1. Collector shop section: **no visual changes** (static `exclusiveItems` until sync ingest)
2. Vault API `/api/vault/content` — still reads `vault_content` (sync pipeline to map `vault_items` → storefront TBD)
3. Release modal lyrics/credits — unchanged (`d24d114`)

## Edge cases

- Supabase absent: in-memory fallback for collector/vault services (same pattern as audio visuals)
- Product upsert degrades if new columns missing (grants-only fallback)
- Vault items without `price_in_cents` publish without product row (entitlement-only)
- Collector cards require price to publish

## Next steps

1. Sync worker: push `vault_items` + `collector_cards` → artist-platform `vault_content` / `products`
2. Phase 3B unlocked vault room CSS (storefront only)
3. Commerce tab inline price edit + PATCH products API
4. Run full `npm run verify` in CI after migration applied to Supabase
