-- Creator OS hardening foundation.
-- Local-only migration: do not apply to live Supabase without an explicit deployment window.

alter table public.releases
  add column if not exists visibility_state text not null default 'draft',
  add column if not exists publishing_stage text not null default 'draft',
  add column if not exists save_state text not null default 'saved',
  add column if not exists parent_release_id uuid references public.releases(id) on delete set null,
  add column if not exists relationship_type text,
  add column if not exists content_priority text,
  add column if not exists timezone text not null default 'America/New_York',
  add column if not exists last_synced_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists recovery_available_until timestamptz;

create table if not exists public.release_revisions (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.releases(id) on delete cascade,
  kind text not null,
  label text not null,
  before_snapshot jsonb,
  after_snapshot jsonb,
  actor_role text not null default 'admin',
  created_at timestamptz not null default now()
);

create index if not exists release_revisions_release_idx on public.release_revisions (release_id, created_at desc);

create table if not exists public.release_activity_events (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.releases(id) on delete cascade,
  kind text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists release_activity_events_release_idx on public.release_activity_events (release_id, created_at desc);

create table if not exists public.system_tags (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  slug text not null unique,
  scopes text[] not null default '{global}'::text[],
  created_at timestamptz not null default now()
);

create table if not exists public.release_tags (
  release_id uuid not null references public.releases(id) on delete cascade,
  tag_id uuid not null references public.system_tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (release_id, tag_id)
);

create table if not exists public.release_role_assignments (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.releases(id) on delete cascade,
  actor_label text not null,
  role_type text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.media_dependencies (
  id uuid primary key default gen_random_uuid(),
  asset_id text not null,
  surface_type text not null,
  surface_id text not null,
  release_id uuid references public.releases(id) on delete cascade,
  track_id uuid references public.tracks(id) on delete cascade,
  label text not null,
  visibility text not null default 'private',
  created_at timestamptz not null default now(),
  unique (asset_id, surface_type, surface_id)
);

create index if not exists media_dependencies_asset_idx on public.media_dependencies (asset_id);
create index if not exists media_dependencies_release_idx on public.media_dependencies (release_id);

create table if not exists public.media_processing_jobs (
  id uuid primary key default gen_random_uuid(),
  asset_id text not null,
  job_type text not null,
  state text not null default 'queued',
  output_path text,
  error_message text,
  retry_count integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists media_processing_jobs_asset_idx on public.media_processing_jobs (asset_id, updated_at desc);

create table if not exists public.creator_sessions (
  id text primary key,
  release_id uuid references public.releases(id) on delete set null,
  current_step text,
  active_tab text,
  open_sections text[] not null default '{}'::text[],
  scroll_position integer not null default 0,
  unsaved_text jsonb not null default '{}'::jsonb,
  pending_upload_ids text[] not null default '{}'::text[],
  focus_mode boolean not null default false,
  local_persistence text not null default 'saved',
  cloud_persistence text not null default 'queued',
  recovery_message text,
  last_active_at timestamptz not null default now()
);

create table if not exists public.draft_session_snapshots (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.releases(id) on delete cascade,
  session_id text not null,
  reason text not null,
  step text,
  active_tab text,
  open_sections text[] not null default '{}'::text[],
  scroll_position integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  collaborators jsonb not null default '[]'::jsonb,
  uploads jsonb not null default '[]'::jsonb,
  scheduling jsonb not null default '{}'::jsonb,
  lyrics jsonb not null default '{}'::jsonb,
  local_saved_at timestamptz not null default now(),
  cloud_synced_at timestamptz,
  recovery_message text not null
);

create index if not exists draft_session_snapshots_release_idx
  on public.draft_session_snapshots (release_id, local_saved_at desc);

create table if not exists public.creator_notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  title text not null,
  detail text not null,
  release_id uuid references public.releases(id) on delete cascade,
  asset_id text,
  importance text not null default 'standard',
  created_at timestamptz not null default now()
);

create table if not exists public.feature_flags (
  key text not null,
  environment text not null,
  enabled boolean not null default false,
  description text not null default '',
  updated_at timestamptz not null default now(),
  primary key (key, environment)
);

create table if not exists public.observability_events (
  id uuid primary key default gen_random_uuid(),
  area text not null,
  severity text not null,
  message text not null,
  release_id uuid references public.releases(id) on delete set null,
  asset_id text,
  created_at timestamptz not null default now()
);

create index if not exists observability_events_area_idx
  on public.observability_events (area, severity, created_at desc);

create table if not exists public.rollback_plans (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.releases(id) on delete cascade,
  reason text not null,
  restore_point_id text,
  actions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.media_rights_attributions (
  asset_id text primary key,
  owner text not null,
  contributors jsonb not null default '[]'::jsonb,
  usage text not null,
  verified boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.search_index_documents (
  id text primary key,
  type text not null,
  title text not null,
  body text not null default '',
  tags text[] not null default '{}'::text[],
  updated_at timestamptz not null default now()
);

create index if not exists search_index_documents_title_idx
  on public.search_index_documents using gin (to_tsvector('english', title || ' ' || body));

alter table public.release_revisions enable row level security;
alter table public.release_activity_events enable row level security;
alter table public.system_tags enable row level security;
alter table public.release_tags enable row level security;
alter table public.media_dependencies enable row level security;
alter table public.media_processing_jobs enable row level security;
alter table public.creator_sessions enable row level security;
alter table public.draft_session_snapshots enable row level security;
alter table public.creator_notifications enable row level security;
alter table public.release_role_assignments enable row level security;
alter table public.feature_flags enable row level security;
alter table public.observability_events enable row level security;
alter table public.rollback_plans enable row level security;
alter table public.media_rights_attributions enable row level security;
alter table public.search_index_documents enable row level security;

-- Control System service-role routes own writes. Do not add anon write policies.
