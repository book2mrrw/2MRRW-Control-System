-- Frontend ecosystem reconstruction support.
-- Keeps release format (single/album/ep) separate from frontend grouping (single/album/feature).

alter table public.releases
  add column if not exists release_category text;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.releases'::regclass
      and conname = 'releases_release_type_check'
  ) then
    alter table public.releases drop constraint releases_release_type_check;
  end if;

  alter table public.releases
    add constraint releases_release_type_check check (
      release_type in ('single', 'album', 'ep', 'feature', 'deluxe', 'remix_pack')
    );

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.releases'::regclass
      and conname = 'releases_release_category_check'
  ) then
    alter table public.releases
      add constraint releases_release_category_check check (
        release_category is null or release_category in ('single', 'album', 'feature')
      );
  end if;
end
$$;

update public.releases
set release_category = case
  when release_type = 'feature' then 'feature'
  when release_type = 'single' then 'single'
  else 'album'
end
where release_category is null;

create index if not exists releases_release_category_idx
  on public.releases (release_category, release_date desc);

comment on column public.releases.release_category is
  'Frontend grouping for synchronized surfaces: single, album, or feature. Release type remains the release format.';
