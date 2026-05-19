-- Media synchronization routing columns for frontend destination mapping.

alter table public.media_assets
  add column if not exists frontend_route text,
  add column if not exists frontend_component text,
  add column if not exists sync_target text,
  add column if not exists media_section text,
  add column if not exists platform_scope text[] not null default '{}',
  add column if not exists callback_group text,
  add column if not exists cache_group text;

alter table public.release_media
  add column if not exists frontend_route text,
  add column if not exists frontend_component text,
  add column if not exists sync_target text,
  add column if not exists media_section text,
  add column if not exists platform_scope text[] not null default '{}',
  add column if not exists callback_group text,
  add column if not exists cache_group text;

create index if not exists media_assets_sync_target_idx
  on public.media_assets (sync_target)
  where sync_target is not null and is_active = true;

create index if not exists release_media_media_section_idx
  on public.release_media (release_id, media_section, is_active)
  where media_section is not null;

create index if not exists release_media_cover_primary_idx
  on public.release_media (release_id, asset_role, is_primary)
  where asset_role in ('cover_art', 'cover') and is_primary = true and is_active = true;

comment on column public.release_media.media_section is
  'Control-system media tab section: singles, albums_eps, hero, vault, loops, cover, audio, previews, videos, press, lyrics, sync_status, version_history';
