-- Durable lyrics text on tracks (Control Room Lyrics tab + public read contract).

alter table public.tracks
  add column if not exists lyrics_text text;

create index if not exists tracks_release_lyrics_idx
  on public.tracks (release_id)
  where lyrics_text is not null and length(trim(lyrics_text)) > 0;

comment on column public.tracks.lyrics_text is
  'Plain-text lyrics authored in Control Room; exposed on public track contracts when present.';
