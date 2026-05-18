-- Audio Visuals foundation: backend-managed YouTube embeds for the public experience.
-- Public frontend reads published records; Control System/admin routes own all writes.

create table if not exists public.audio_visuals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  youtube_url text not null,
  youtube_video_id text not null,
  embed_url text not null,
  thumbnail_url text not null,
  release_id uuid references public.releases(id) on delete set null,
  track_id uuid references public.tracks(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'published', 'archived')),
  published_at timestamptz,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint audio_visuals_youtube_video_id_check check (youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'),
  constraint audio_visuals_metadata_object_check check (jsonb_typeof(metadata) = 'object')
);

create index if not exists audio_visuals_public_idx
  on public.audio_visuals (status, published_at desc, sort_order asc)
  where status = 'published';

create index if not exists audio_visuals_release_idx on public.audio_visuals (release_id);
create index if not exists audio_visuals_track_idx on public.audio_visuals (track_id);
create index if not exists audio_visuals_sort_idx on public.audio_visuals (sort_order asc, published_at desc);

alter table public.audio_visuals enable row level security;

drop policy if exists "Public can read published audio visuals" on public.audio_visuals;
create policy "Public can read published audio visuals"
  on public.audio_visuals
  for select
  using (status = 'published' and (published_at is null or published_at <= now()));

-- Admin/server writes should go through service-role backed Control System routes.
-- Do not add anon/authenticated insert/update/delete policies here.
