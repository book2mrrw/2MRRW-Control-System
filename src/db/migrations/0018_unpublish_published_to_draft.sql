-- Allow unpublish: published → draft (Control System studio action).

create or replace function public.enforce_release_status_transition()
returns trigger
language plpgsql
as $$
declare
  allowed boolean := false;
begin
  if tg_op = 'INSERT' then
    return new;
  end if;

  if new.status is not distinct from old.status then
    return new;
  end if;

  allowed := case
    when old.status = 'draft' and new.status in (
      'metadata_incomplete', 'assets_pending', 'rights_pending', 'ready_for_review',
      'scheduled', 'published', 'archived'
    ) then true
    when old.status = 'metadata_incomplete' and new.status in (
      'draft', 'assets_pending', 'rights_pending', 'ready_for_review', 'scheduled', 'published', 'archived'
    ) then true
    when old.status = 'assets_pending' and new.status in (
      'draft', 'metadata_incomplete', 'rights_pending', 'ready_for_review', 'scheduled', 'published', 'archived'
    ) then true
    when old.status = 'rights_pending' and new.status in (
      'draft', 'metadata_incomplete', 'assets_pending', 'ready_for_review', 'scheduled', 'published', 'archived'
    ) then true
    when old.status = 'ready_for_review' and new.status in (
      'draft', 'metadata_incomplete', 'assets_pending', 'rights_pending', 'scheduled', 'published', 'archived'
    ) then true
    when old.status = 'scheduled' and new.status in (
      'draft', 'ready_for_review', 'published', 'archived'
    ) then true
    when old.status = 'published' and new.status in ('draft', 'scheduled', 'archived') then true
    when old.status = 'archived' and new.status in ('draft', 'published') then true
    else false
  end;

  if not allowed then
    raise exception 'invalid release status transition from % to %', old.status, new.status;
  end if;

  return new;
end;
$$;
