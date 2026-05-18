-- Sync events foundation: durable replay log for real-time Control System propagation.
-- Server-side Control System services own writes; public clients read through API contracts.

create table if not exists public.sync_events (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  entity_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint sync_events_payload_object_check check (jsonb_typeof(payload) = 'object')
);

create index if not exists sync_events_created_at_idx on public.sync_events (created_at asc);
create index if not exists sync_events_entity_idx on public.sync_events (entity_id, created_at asc);
create index if not exists sync_events_type_idx on public.sync_events (type, created_at asc);

create table if not exists public.hero_config (
  id text primary key default 'homepage',
  title text not null,
  subtitle text,
  cta_label text,
  cta_href text,
  background_media_url text,
  background_media_type text check (background_media_type in ('image', 'mp4') or background_media_type is null),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hero_config_payload_object_check check (jsonb_typeof(metadata) = 'object')
);

create index if not exists hero_config_updated_at_idx on public.hero_config (updated_at desc);

alter table public.hero_config
  add column if not exists subtitle text,
  add column if not exists cta_label text,
  add column if not exists cta_href text;

alter table public.sync_events enable row level security;
alter table public.hero_config enable row level security;

drop policy if exists "Public can read sync events" on public.sync_events;
create policy "Public can read sync events"
  on public.sync_events
  for select
  using (true);

drop policy if exists "Public can read hero config" on public.hero_config;
create policy "Public can read hero config"
  on public.hero_config
  for select
  using (true);

-- Admin/server writes should go through service-role backed Control System routes.
-- Do not add anon/authenticated insert/update/delete policies here.

alter table public.releases replica identity full;
alter table public.media_assets replica identity full;
alter table public.hero_config replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'releases'
  ) then
    alter publication supabase_realtime add table public.releases;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'media_assets'
  ) then
    alter publication supabase_realtime add table public.media_assets;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'hero_config'
  ) then
    alter publication supabase_realtime add table public.hero_config;
  end if;
exception
  when undefined_object then
    raise notice 'supabase_realtime publication is not available in this environment';
end $$;
