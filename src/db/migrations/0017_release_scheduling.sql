-- Global release scheduling: local wall-clock + IANA timezone with canonical UTC instant.

alter table public.releases
  add column if not exists release_time time,
  add column if not exists publish_timezone text,
  add column if not exists schedule_attempts integer not null default 0,
  add column if not exists schedule_last_error text;

comment on column public.releases.scheduled_publish_at is
  'Canonical UTC instant (timestamptz) when a scheduled release auto-publishes.';
comment on column public.releases.release_time is
  'Local wall-clock time (in publish_timezone) chosen for the global drop.';
comment on column public.releases.publish_timezone is
  'IANA timezone identifier for schedule conversion (e.g. America/Chicago).';
comment on column public.releases.schedule_attempts is
  'Auto-publish retry counter for scheduled releases.';
comment on column public.releases.schedule_last_error is
  'Last cron publish failure message for operator diagnostics.';

create index if not exists releases_scheduled_publish_due_idx
  on public.releases (scheduled_publish_at)
  where status = 'scheduled' and scheduled_publish_at is not null;
