insert into public.artists (id, slug, name)
values ('00000000-0000-0000-0000-000000000101', '2mrrw', '2MRRW')
on conflict (slug) do nothing;

insert into public.releases (id, artist_id, slug, title, release_date, status, published_at)
values (
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000101',
  'afterhours-control',
  'Afterhours Control',
  '2026-05-17',
  'published',
  now()
)
on conflict (slug) do nothing;

insert into public.tracks (id, release_id, title, duration_seconds, position)
values
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000201', 'Signal Opens', 201, 1),
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000201', 'Radio Independence', 244, 2)
on conflict do nothing;

insert into public.media_assets (id, owner_type, owner_id, bucket, storage_path, access_level)
values
  ('00000000-0000-0000-0000-000000000401', 'track', '00000000-0000-0000-0000-000000000301', 'protected-media', 'masters/afterhours-control/signal-opens.wav', 'entitled'),
  ('00000000-0000-0000-0000-000000000402', 'track', '00000000-0000-0000-0000-000000000302', 'protected-media', 'masters/afterhours-control/radio-independence.wav', 'entitled'),
  ('00000000-0000-0000-0000-000000000404', 'release', '00000000-0000-0000-0000-000000000201', 'protected-media', 'artwork/afterhours-control/cover.jpg', 'public'),
  ('00000000-0000-0000-0000-000000000405', 'track', '00000000-0000-0000-0000-000000000301', 'protected-media', 'previews/afterhours-control/signal-opens.mp3', 'public'),
  ('00000000-0000-0000-0000-000000000403', 'vault_content', '00000000-0000-0000-0000-000000000701', 'protected-media', 'vault/founder-room/session-notes.pdf', 'entitled')
on conflict do nothing;

insert into public.products (id, slug, name, stripe_price_id, price_cents, currency, grants)
values
  (
    '00000000-0000-0000-0000-000000000501',
    'afterhours-digital',
    'Afterhours Control Digital',
    'price_afterhours_digital',
    999,
    'usd',
    '[{"type":"release","releaseId":"00000000-0000-0000-0000-000000000201"}]'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000502',
    'founder-membership',
    'Founder Membership',
    'price_founder_membership',
    1999,
    'usd',
    '[{"type":"membership","tier":"founder"},{"type":"vault_collection","collectionId":"00000000-0000-0000-0000-000000000601"}]'::jsonb
  )
on conflict (slug) do nothing;

insert into public.vault_collections (id, slug, title, visibility)
values ('00000000-0000-0000-0000-000000000601', 'founder-room', 'Founder Room', 'entitled')
on conflict (slug) do nothing;

insert into public.vault_content (id, collection_id, slug, title, published_at)
values ('00000000-0000-0000-0000-000000000701', '00000000-0000-0000-0000-000000000601', 'session-notes', 'Session Notes', now())
on conflict do nothing;

insert into public.vault_content_assets (vault_content_id, media_asset_id)
values ('00000000-0000-0000-0000-000000000701', '00000000-0000-0000-0000-000000000403')
on conflict do nothing;

insert into public.signal_audience_segments (id, slug, rules)
values ('00000000-0000-0000-0000-000000000801', 'release-followers', '{"kind":"release_followers"}')
on conflict (slug) do nothing;

insert into public.signals (id, slug, title, audience_segment_id, starts_at, ends_at, cooldown_key, payload)
values (
  '00000000-0000-0000-0000-000000000802',
  'release-window',
  'Release Window Signal',
  '00000000-0000-0000-0000-000000000801',
  '2026-01-01T00:00:00Z',
  '2027-01-01T00:00:00Z',
  'release-window',
  '{"message":"New release window is open."}'
)
on conflict (slug) do nothing;

insert into public.radio_channels (id, slug, title, enabled)
values ('00000000-0000-0000-0000-000000000901', 'main', 'Tomorrow Radio', true)
on conflict (slug) do nothing;

insert into public.radio_feed_queue (radio_channel_id, track_id, scheduled_for, status)
values ('00000000-0000-0000-0000-000000000901', '00000000-0000-0000-0000-000000000302', now(), 'queued');
