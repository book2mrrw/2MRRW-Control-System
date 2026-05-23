# Storefront Supabase migrations checklist

Apply on **production Supabase** (storefront project) in order. Control has no new migrations for Sprints 5–6.

**Verify after each block** with the post-check SQL at the bottom.

---

## 0. Enable pgcrypto (required for gift tokens)

Run once if not already enabled (also in `001_auth_commerce_library.sql`):

```sql
create extension if not exists "pgcrypto";
```

---

## 1. Rate limits + profile lookup (if missing)

File: `artist-platform/supabase/migrations/20260517011000_api_rate_limits_and_identity_lookup.sql`

```sql
create table if not exists public.api_rate_limits (
  key text primary key,
  route_key text not null,
  identifier_hash text not null,
  window_start timestamptz not null,
  expires_at timestamptz not null,
  count integer not null default 0 check (count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists api_rate_limits_expires_at_idx
  on public.api_rate_limits (expires_at);

create index if not exists api_rate_limits_route_window_idx
  on public.api_rate_limits (route_key, window_start desc);

alter table public.api_rate_limits enable row level security;

drop trigger if exists api_rate_limits_updated_at on public.api_rate_limits;
create trigger api_rate_limits_updated_at before update on public.api_rate_limits
  for each row execute function public.set_updated_at();

create index if not exists profiles_email_phone_lookup_idx
  on public.profiles (lower(email), phone)
  where email is not null and phone is not null;

create index if not exists profiles_phone_lookup_idx
  on public.profiles (phone)
  where phone is not null;
```

---

## 2. Gifting system base (if missing)

File: `artist-platform/supabase/migrations/20260522140000_gifting_system.sql`

```sql
create extension if not exists "pgcrypto";

alter table public.profiles
  add column if not exists role text not null default 'user' check (role in ('user', 'admin'));

alter table public.profiles
  add column if not exists phone_verified boolean not null default false;

create table if not exists public.gifts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sender_id uuid references auth.users (id) on delete set null,
  recipient_id uuid references auth.users (id) on delete set null,
  recipient_email text not null,
  recipient_phone text,
  item_type text check (item_type in ('single', 'ep', 'album', 'deluxe', 'collector_card')),
  item_id uuid not null,
  item_title text,
  message text,
  claimed boolean not null default false,
  claimed_at timestamptz,
  gift_link_token text unique default encode(gen_random_bytes(32), 'hex'),
  expires_at timestamptz not null default (now() + interval '15 days'),
  notified_email boolean not null default false,
  reminder_sent boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'claimed', 'expired', 'revoked'))
);
```

> Apply the remainder of that migration file (RLS, indexes, triggers) via Supabase CLI or SQL editor if the table already exists partially.

---

## 3. Unified entitlements (Sprint 2)

File: `supabase/migrations/20260601000000_unified_entitlements.sql`

```sql
create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  resource_type text not null check (resource_type in ('product', 'track', 'release', 'vault_collection')),
  resource_id uuid not null,
  source_type text not null check (source_type in (
    'purchase', 'gifted', 'subscription', 'collector_card', 'promo', 'admin_grant'
  )),
  source_id uuid,
  status text not null default 'active' check (status in ('active', 'revoked', 'expired')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists entitlements_active_unique
  on public.entitlements (
    user_id,
    resource_type,
    resource_id,
    source_type,
    coalesce(source_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where status = 'active';

create index if not exists entitlements_user_resource_idx
  on public.entitlements (user_id, resource_type, resource_id);

create index if not exists entitlements_source_idx
  on public.entitlements (source_type, source_id)
  where source_id is not null;

alter table public.entitlements enable row level security;

drop policy if exists "entitlements_select_own" on public.entitlements;
create policy "entitlements_select_own" on public.entitlements
  for select using (auth.uid() = user_id);

drop trigger if exists entitlements_updated_at on public.entitlements;
create trigger entitlements_updated_at before update on public.entitlements
  for each row execute function public.set_updated_at();

insert into public.entitlements (
  user_id,
  resource_type,
  resource_id,
  source_type,
  source_id,
  status,
  starts_at,
  metadata
)
select
  li.user_id,
  'product'::text,
  li.product_id,
  case li.source
    when 'purchase' then 'purchase'
    when 'gift' then 'gifted'
    when 'grant' then 'admin_grant'
    when 'bundle' then 'purchase'
    else 'purchase'
  end,
  li.purchase_id,
  'active',
  coalesce(li.granted_at, now()),
  jsonb_build_object('backfill', 'library_items', 'library_item_id', li.id)
from public.library_items li
where not exists (
  select 1
  from public.entitlements e
  where e.user_id = li.user_id
    and e.resource_type = 'product'
    and e.resource_id = li.product_id
    and e.source_type = case li.source
      when 'purchase' then 'purchase'
      when 'gift' then 'gifted'
      when 'grant' then 'admin_grant'
      when 'bundle' then 'purchase'
      else 'purchase'
    end
    and coalesce(e.source_id, '00000000-0000-0000-0000-000000000000'::uuid)
      = coalesce(li.purchase_id, '00000000-0000-0000-0000-000000000000'::uuid)
    and e.status = 'active'
);
```

---

## 4. Products content parity (Sprint 2)

File: `supabase/migrations/20260601000001_products_content_parity.sql`

```sql
alter table public.products
  add column if not exists content_type text check (
    content_type is null or content_type in ('release', 'collector_card', 'vault_item', 'vault_access', 'track')
  ),
  add column if not exists content_id uuid,
  add column if not exists gifting_enabled boolean not null default false;

create index if not exists products_content_idx
  on public.products (content_type, content_id)
  where content_id is not null;

update public.products
set
  content_type = coalesce(content_type, nullif(metadata->>'content_type', '')),
  content_id = coalesce(content_id, nullif(metadata->>'content_id', '')::uuid),
  gifting_enabled = coalesce(gifting_enabled, (metadata->>'gifting_enabled')::boolean, false)
where content_type is null
   or content_id is null;
```

---

## 5. Gift token hash at rest (Sprint 3)

Requires **pgcrypto** (`digest`). File: `supabase/migrations/20260602000000_gift_token_hash.sql`

```sql
create extension if not exists "pgcrypto";

alter table public.gifts
  add column if not exists gift_link_token_hash text;

create unique index if not exists idx_gifts_token_hash
  on public.gifts (gift_link_token_hash)
  where gift_link_token_hash is not null;

update public.gifts
set gift_link_token_hash = encode(digest(gift_link_token, 'sha256'), 'hex')
where gift_link_token is not null
  and gift_link_token_hash is null;
```

---

## Post-migrate checks

```sql
select count(*) as active_entitlements from public.entitlements where status = 'active';
select slug, content_type, content_id from public.products where slug like '%-digital' limit 5;
select count(*) as gifts_with_hash from public.gifts where gift_link_token_hash is not null;
```

**CLI alternative:** from `artist-platform`, `supabase db push` or apply migrations in Supabase dashboard SQL editor in filename order.
