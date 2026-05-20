# Migration 0020 — Apply & Verify

**File:** `src/db/migrations/0020_universal_commerce_catalog.sql`  
**Already on control `dev` at commit `d78cb9b+`** — do not re-run if tables exist.

## What it adds

- `products`: `content_type`, `content_id`, `label`, `gifting_enabled`
- `collector_cards` table
- `vault_items` table (8 archive categories)

## Manual apply (Supabase SQL editor)

1. Open Supabase → SQL → New query
2. Paste contents of `0020_universal_commerce_catalog.sql`
3. Run once

## Verify

```sql
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'products'
  and column_name in ('content_type', 'content_id', 'label', 'gifting_enabled');

select to_regclass('public.collector_cards'), to_regclass('public.vault_items');
```

Expected: four product columns, both tables non-null.

## Phase 2 follow-on

Apply `0021_vault_drops_two_layer_assets.sql` for shelf/content URLs and surprise-drop columns.

## Without Supabase

Control falls back to in-memory `vault_items` / `collector_cards` services. Storefront sync requires `ADMIN_SEED_SECRET` + artist-platform ingest API.
