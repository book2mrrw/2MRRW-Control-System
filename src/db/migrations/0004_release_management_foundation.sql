-- Release management foundation for the 2MRRW Control System.
-- Forward-only local migration: expands the existing catalog into a draft,
-- metadata, contributor, publishing, and readiness workflow surface.

alter table public.artists
  add column if not exists city text,
  add column if not exists region text,
  add column if not exists country_code char(2),
  add column if not exists territory text;

alter table public.releases
  add column if not exists language text not null default 'en',
  add column if not exists record_label text,
  add column if not exists copyright_owner text,
  add column if not exists upc text,
  add column if not exists internal_upc text,
  add column if not exists release_type text not null default 'album',
  add column if not exists scheduled_publish_at timestamptz,
  add column if not exists readiness_state text not null default 'metadata_incomplete',
  add column if not exists primary_genre_category text,
  add column if not exists primary_genre_subgenre text,
  add column if not exists secondary_genre_category text,
  add column if not exists secondary_genre_subgenre text,
  add column if not exists mood_styles text[] not null default '{}'::text[],
  add column if not exists famous_artist_references jsonb not null default '[]'::jsonb,
  add column if not exists cover_art_state text not null default 'missing',
  add column if not exists audio_assets_state text not null default 'missing',
  add column if not exists lyrics_state text not null default 'not_required',
  add column if not exists metadata_completed_at timestamptz,
  add column if not exists assets_completed_at timestamptz,
  add column if not exists rights_completed_at timestamptz;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.releases'::regclass
      and conname = 'releases_status_check'
      and pg_get_constraintdef(oid) <> 'CHECK ((status = ANY (ARRAY[''draft''::text, ''metadata_incomplete''::text, ''assets_pending''::text, ''rights_pending''::text, ''ready_for_review''::text, ''scheduled''::text, ''published''::text, ''archived''::text])))'
  ) then
    alter table public.releases drop constraint releases_status_check;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.releases'::regclass
      and conname = 'releases_status_check'
  ) then
    alter table public.releases
      add constraint releases_status_check check (
        status in (
          'draft',
          'metadata_incomplete',
          'assets_pending',
          'rights_pending',
          'ready_for_review',
          'scheduled',
          'published',
          'archived'
        )
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.releases'::regclass
      and conname = 'releases_upc_key'
  ) then
    alter table public.releases add constraint releases_upc_key unique (upc);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.releases'::regclass
      and conname = 'releases_internal_upc_key'
  ) then
    alter table public.releases add constraint releases_internal_upc_key unique (internal_upc);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.releases'::regclass
      and conname = 'releases_release_type_check'
  ) then
    alter table public.releases
      add constraint releases_release_type_check check (release_type in ('single', 'album', 'ep'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.releases'::regclass
      and conname = 'releases_readiness_state_check'
  ) then
    alter table public.releases
      add constraint releases_readiness_state_check check (
        readiness_state in ('metadata_incomplete', 'assets_pending', 'rights_pending', 'ready_for_review')
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.releases'::regclass
      and conname = 'releases_upload_state_check'
  ) then
    alter table public.releases
      add constraint releases_upload_state_check check (
        cover_art_state in ('missing', 'uploaded', 'approved', 'rejected')
        and audio_assets_state in ('missing', 'partial', 'uploaded', 'approved', 'rejected')
        and lyrics_state in ('not_required', 'missing', 'uploaded', 'approved', 'rejected')
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.releases'::regclass
      and conname = 'releases_famous_artist_references_check'
  ) then
    alter table public.releases
      add constraint releases_famous_artist_references_check check (
        jsonb_typeof(famous_artist_references) = 'array'
        and jsonb_array_length(famous_artist_references) <= 3
      );
  end if;
end
$$;

alter table public.tracks
  add column if not exists lyrics_language text,
  add column if not exists is_live_version boolean not null default false,
  add column if not exists composition_type text not null default 'original',
  add column if not exists manual_isrc text,
  add column if not exists generated_isrc text,
  add column if not exists partner_platform_ids jsonb not null default '{}'::jsonb,
  add column if not exists producer_display text,
  add column if not exists audio_state text not null default 'missing',
  add column if not exists lyrics_state text not null default 'not_required';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.tracks'::regclass
      and conname = 'tracks_composition_type_check'
  ) then
    alter table public.tracks
      add constraint tracks_composition_type_check check (composition_type in ('original', 'cover', 'remix', 'public_domain'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.tracks'::regclass
      and conname = 'tracks_upload_state_check'
  ) then
    alter table public.tracks
      add constraint tracks_upload_state_check check (
        audio_state in ('missing', 'uploaded', 'approved', 'rejected')
        and lyrics_state in ('not_required', 'missing', 'uploaded', 'approved', 'rejected')
      );
  end if;
end
$$;

create table if not exists public.genre_categories (
  slug text primary key,
  label text not null,
  sort_order integer not null default 0,
  active boolean not null default true
);

create table if not exists public.genre_subgenres (
  slug text primary key,
  category_slug text not null references public.genre_categories(slug),
  label text not null,
  sort_order integer not null default 0,
  active boolean not null default true
);

create table if not exists public.release_media_requirements (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.releases(id) on delete cascade,
  media_kind text not null check (media_kind in ('cover_art', 'audio', 'lyrics')),
  allowed_extensions text[] not null,
  target_size_mb integer,
  min_width_px integer,
  min_height_px integer,
  preferred_width_px integer,
  preferred_height_px integer,
  created_at timestamptz not null default now(),
  unique (release_id, media_kind)
);

create table if not exists public.songwriter_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references public.profiles(id) on delete set null,
  legal_name text not null,
  display_name text,
  society text,
  ipi_cae_number text,
  pro_affiliation text,
  publisher_name text,
  publisher_ipi_cae_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.track_contributors (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks(id) on delete cascade,
  songwriter_profile_id uuid references public.songwriter_profiles(id) on delete set null,
  contributor_name text not null,
  contribution_type text not null check (contribution_type in ('music', 'lyrics', 'both', 'producer')),
  is_publisher boolean not null default false,
  ownership_split numeric(5,2) not null check (ownership_split >= 0 and ownership_split <= 100),
  publisher_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.track_publishing_metadata (
  track_id uuid primary key references public.tracks(id) on delete cascade,
  publishing_rights_owner text,
  composition_copyright_owner text,
  sound_recording_copyright_owner text,
  producer_names text[] not null default '{}'::text[],
  notes text,
  updated_at timestamptz not null default now()
);

create table if not exists public.release_readiness_checks (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.releases(id) on delete cascade,
  check_key text not null,
  passed boolean not null default false,
  message text,
  created_at timestamptz not null default now(),
  unique (release_id, check_key)
);

alter table public.genre_categories enable row level security;
alter table public.genre_subgenres enable row level security;
alter table public.release_media_requirements enable row level security;
alter table public.songwriter_profiles enable row level security;
alter table public.track_contributors enable row level security;
alter table public.track_publishing_metadata enable row level security;
alter table public.release_readiness_checks enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'genre_categories'
      and policyname = 'public genre categories read'
  ) then
    create policy "public genre categories read" on public.genre_categories for select using (active = true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'genre_subgenres'
      and policyname = 'public genre subgenres read'
  ) then
    create policy "public genre subgenres read" on public.genre_subgenres for select using (active = true);
  end if;
end
$$;

comment on table public.track_contributors is
  'Contributor and split rows. Application readiness validation requires music/lyrics ownership splits to total exactly 100 per track before review or publication.';

comment on table public.release_media_requirements is
  'Per-release media constraints. The initial 2MRRW policy supports png, jpg, jpeg, gif, mp4, and mov cover assets, a 60-70MB target envelope, and minimum/preferred dimensions stored as metadata. Storage prefixes are masters/, previews/, artwork/, loops/, vault/, and lyrics/ in the shared protected-media bucket.';
