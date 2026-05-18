-- Circle/community event foundation for backend-triggered 2MRRW activity.
-- Public frontend reads safe event state; admin/server routes remain the write surface.

create table if not exists public.circle_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('active', 'replied', 'live', 'highlighted_comment', 'reacted')),
  label text not null,
  actor_id text not null default 'artist_2mrrw',
  actor_display_name text not null default '2MRRW',
  target_user_id uuid references public.profiles(id) on delete set null,
  post_id text,
  comment_id text,
  audience text not null default 'public' check (audience in ('public', 'members', 'inner_circle', 'vault')),
  payload jsonb not null default '{}'::jsonb,
  visibility text not null default 'visible' check (visibility in ('visible', 'hidden', 'admin_only')),
  created_at timestamptz not null default now()
);

create index if not exists circle_events_created_at_idx on public.circle_events (created_at desc);
create index if not exists circle_events_event_type_idx on public.circle_events (event_type);
create index if not exists circle_events_audience_idx on public.circle_events (audience);

alter table public.circle_events enable row level security;

drop policy if exists "Public can read visible public Circle events" on public.circle_events;
create policy "Public can read visible public Circle events"
  on public.circle_events
  for select
  using (visibility = 'visible' and audience = 'public');

-- Admin/server writes should go through service-role backed Control System routes.
-- Do not add anon/authenticated insert/update/delete policies here.
