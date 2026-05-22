-- Release-level credit metadata fields (FIX 9)
alter table public.releases
  add column if not exists producer text,
  add column if not exists mixing_engineer text,
  add column if not exists mastering_engineer text,
  add column if not exists written_by text;
