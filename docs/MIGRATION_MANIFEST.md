# Migration manifest — control + storefront

Apply in order on production Supabase (storefront project unless noted).

| Migration | Repo | Purpose |
|-----------|------|---------|
| `20260601000000_unified_entitlements.sql` | Storefront | Unified `entitlements` table + backfill |
| `20260601000001_products_content_parity.sql` | Storefront | `products.content_id` / `content_type` |
| `20260602000000_gift_token_hash.sql` | Storefront | Gift link token hash-at-rest |
| `20260517011000_api_rate_limits_and_identity_lookup.sql` | Storefront | Rate limit table (if not applied) |
| `20260522140000_gifting_system.sql` | Storefront | Gifting tables (if not applied) |

## Post-migrate checks

1. `SELECT count(*) FROM entitlements WHERE status = 'active';`
2. Publish a priced release → verify `{slug}-digital` on storefront `products` with `storage_path`.
3. Gift send → claim → rows in `library_items` and `entitlements` with `source_type = gifted`.
4. Control `GET /api/admin/sync/catalog-failures` → `dirty: false` after successful catalog sync.

## Reconcile

- Control cron: `GET /api/cron/reconcile-catalog` (Vercel `CRON_SECRET`).
- Manual: Studio → trigger catalog sync from Media Sync workspace.

## Rollback

- `DISABLE_CATALOG_SYNC=1` on control skips automated storefront push (manual SQL seed remains).
