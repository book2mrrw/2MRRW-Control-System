-- Release media joins, ingestion audit, sync cursors, and HTML-prototype bridge columns.

alter table public.releases
  add column if not exists ingestion_source text,
  add column if not exists ingestion_ref text,
  add column if not exists catalog_version integer not null default 1;

alter table public.media_assets
  add column if not exists asset_type text,
  add column if not exists checksum_md5 text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists version integer not null default 1,
  add column if not exists is_active boolean not null default true;

alter table public.tracks
  add column if not exists audio_asset_id uuid references public.media_assets(id) on delete set null,
  add column if not exists preview_asset_id uuid references public.media_assets(id) on delete set null;

create table if not exists public.release_media (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.releases(id) on delete cascade,
  track_id uuid references public.tracks(id) on delete set null,
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  asset_role text not null check (asset_role in (
    'cover_art', 'cover', 'background_loop', 'motion', 'music_video', 'visual',
    'preview', 'audio', 'lyrics', 'hero', 'vault', 'other'
  )),
  is_primary boolean not null default false,
  version integer not null default 1 check (version > 0),
  is_active boolean not null default true,
  ingestion_ref text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (release_id, media_asset_id, asset_role, version)
);

create index if not exists release_media_release_idx on public.release_media (release_id, is_active, asset_role);
create index if not exists release_media_track_idx on public.release_media (track_id) where track_id is not null;
create index if not exists release_media_asset_idx on public.release_media (media_asset_id);

create table if not exists public.media_asset_versions (
  id uuid primary key default gen_random_uuid(),
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  version integer not null check (version > 0),
  storage_path text not null,
  checksum text,
  archived_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (media_asset_id, version)
);

create index if not exists media_asset_versions_asset_idx on public.media_asset_versions (media_asset_id, version desc);

create table if not exists public.ingestion_log (
  id uuid primary key default gen_random_uuid(),
  ingestion_ref text not null,
  phase text not null,
  status text not null check (status in ('started', 'completed', 'failed', 'skipped')),
  report jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ingestion_log_ref_idx on public.ingestion_log (ingestion_ref, created_at desc);

create table if not exists public.sync_state (
  key text primary key,
  dirty boolean not null default false,
  last_event_at timestamptz,
  last_ingestion_ref text,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.release_media enable row level security;
alter table public.media_asset_versions enable row level security;
alter table public.ingestion_log enable row level security;
alter table public.sync_state enable row level security;

drop policy if exists "Public can read release media" on public.release_media;
create policy "Public can read release media" on public.release_media for select using (true);

drop policy if exists "Public can read media asset versions" on public.media_asset_versions;
create policy "Public can read media asset versions"
  on public.media_asset_versions for select using (true);

drop policy if exists "Public can read sync state" on public.sync_state;
create policy "Public can read sync state" on public.sync_state for select using (true);

comment on table public.release_media is 'Join releases/tracks to media_assets with role semantics (cover_art, background_loop, etc.).';
