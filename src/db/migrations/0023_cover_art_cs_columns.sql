-- Cover art control-system columns for releases and tracks.
-- Supports static image covers and MP4 animated covers with typed metadata.

alter table public.releases
  add column if not exists cover_art_type text default 'image',
  add column if not exists cs_cover text,
  add column if not exists cs_cover_type text default 'image',
  add column if not exists cs_audio text;

alter table public.tracks
  add column if not exists cover_art_type text default 'image',
  add column if not exists cs_cover text,
  add column if not exists cs_cover_type text default 'image',
  add column if not exists cs_audio text;

comment on column public.releases.cover_art_type is 'Primary cover presentation: image or video (MP4).';
comment on column public.releases.cs_cover is 'Control-system R2 storage path for release cover art.';
comment on column public.releases.cs_cover_type is 'Stored cover asset type: image or video.';
comment on column public.releases.cs_audio is 'Control-system R2 storage path for release-level audio when applicable.';
comment on column public.tracks.cover_art_type is 'Track cover presentation: image or video (MP4).';
comment on column public.tracks.cs_cover is 'Control-system R2 storage path for track cover art.';
comment on column public.tracks.cs_cover_type is 'Stored track cover asset type: image or video.';
comment on column public.tracks.cs_audio is 'Control-system R2 storage path for track master/preview audio.';
