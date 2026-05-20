-- Phase 2: two-layer vault assets (shelf vs content payload) + surprise drops (additive).

alter table public.vault_items
  add column if not exists shelf_storage_path text,
  add column if not exists shelf_url text,
  add column if not exists content_storage_path text,
  add column if not exists content_url text,
  add column if not exists is_drop_item boolean not null default false,
  add column if not exists drop_type text check (drop_type is null or drop_type in ('surprise', 'promo', 'limited')),
  add column if not exists expires_at timestamptz,
  add column if not exists tier_visibility text[] not null default '{}',
  add column if not exists claim_limit integer check (claim_limit is null or claim_limit > 0),
  add column if not exists claim_count integer not null default 0 check (claim_count >= 0),
  add column if not exists notification_sent boolean not null default false,
  add column if not exists glow_effect boolean not null default false,
  add column if not exists promo_code text,
  add column if not exists promo_code_hash text;

create index if not exists vault_items_drop_idx
  on public.vault_items (is_drop_item, visibility, expires_at)
  where is_drop_item = true;

create table if not exists public.vault_drop_claims (
  id uuid primary key default gen_random_uuid(),
  vault_item_id uuid not null references public.vault_items(id) on delete cascade,
  user_id text,
  claim_token_hash text not null,
  promo_code_snapshot text,
  metadata jsonb not null default '{}'::jsonb,
  claimed_at timestamptz not null default now(),
  unique (vault_item_id, claim_token_hash)
);

create index if not exists vault_drop_claims_item_idx on public.vault_drop_claims (vault_item_id, claimed_at desc);

alter table public.vault_drop_claims enable row level security;

drop policy if exists "server only vault_drop_claims" on public.vault_drop_claims;
create policy "server only vault_drop_claims" on public.vault_drop_claims for all using (false) with check (false);

comment on column public.vault_items.shelf_storage_path is 'Shelf presence asset (jpg/png/mp4/mov/gif).';
comment on column public.vault_items.content_storage_path is 'Unlocked content payload (audio/video/text/promo).';
