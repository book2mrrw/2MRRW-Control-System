-- Seed active homepage hero row for public /api/public/hero.

insert into public.hero_config (
  id,
  title,
  subtitle,
  cta_label,
  cta_href,
  background_media_url,
  background_media_type,
  metadata,
  updated_at
)
values (
  'homepage',
  '2MRRW',
  'Official Catalog',
  'Explore Music',
  '/',
  '/videos/A2B.mp4',
  'mp4',
  '{"source":"go_live_seed"}'::jsonb,
  now()
)
on conflict (id) do update set
  title = excluded.title,
  subtitle = excluded.subtitle,
  cta_label = excluded.cta_label,
  cta_href = excluded.cta_href,
  background_media_url = excluded.background_media_url,
  background_media_type = excluded.background_media_type,
  metadata = hero_config.metadata || excluded.metadata,
  updated_at = now();
