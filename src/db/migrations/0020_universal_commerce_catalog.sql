-- Universal commerce catalog: products content graph, collector cards, vault items (additive).

alter table public.products
  add column if not exists content_type text check (
    content_type is null or content_type in ('release', 'collector_card', 'vault_item', 'vault_access')
  ),
  add column if not exists content_id uuid,
  add column if not exists label text,
  add column if not exists gifting_enabled boolean not null default false;

update public.products
set label = name
where label is null and name is not null;

comment on column public.products.content_type is 'release | collector_card | vault_item | vault_access';
comment on column public.products.content_id is 'UUID of releases, collector_cards, or vault_items row.';
comment on column public.products.label is 'Storefront-facing product label; defaults from linked content title.';

create table if not exists public.collector_cards (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  cover_url text,
  price_in_cents integer check (price_in_cents is null or price_in_cents >= 0),
  edition_size integer check (edition_size is null or edition_size > 0),
  edition_label text,
  gifting_enabled boolean not null default false,
  active boolean not null default true,
  visibility text not null default 'draft' check (visibility in ('draft', 'published', 'archived')),
  published_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists collector_cards_visibility_idx
  on public.collector_cards (visibility, active, updated_at desc);

create table if not exists public.vault_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category text not null,
  title text not null,
  description text not null default '',
  access_tier text not null default 'inner_circle' check (access_tier in ('public', 'inner_circle', 'vault_pass')),
  media_type text not null default 'text' check (
    media_type in ('audio', 'video', 'image', 'text', 'mixed', 'schedule', 'archive', 'commentary')
  ),
  atmosphere text,
  behavior text,
  cover_url text,
  preview_storage_path text,
  media_storage_path text,
  price_in_cents integer check (price_in_cents is null or price_in_cents >= 0),
  gifting_enabled boolean not null default false,
  duration_seconds integer,
  sort_order integer not null default 100,
  featured boolean not null default false,
  visibility text not null default 'draft' check (visibility in ('draft', 'scheduled', 'published', 'archived')),
  published_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vault_items_category_idx on public.vault_items (category, sort_order);
create index if not exists vault_items_visibility_idx on public.vault_items (visibility, access_tier);

alter table public.collector_cards enable row level security;
alter table public.vault_items enable row level security;

drop policy if exists "server only collector_cards" on public.collector_cards;
create policy "server only collector_cards" on public.collector_cards for all using (false) with check (false);

drop policy if exists "server only vault_items" on public.vault_items;
create policy "server only vault_items" on public.vault_items for all using (false) with check (false);
