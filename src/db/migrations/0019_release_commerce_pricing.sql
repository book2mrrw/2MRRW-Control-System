-- Release commerce pricing and lyrics mode (forward-only, additive).

alter table public.releases
  add column if not exists price_in_cents integer check (price_in_cents is null or price_in_cents >= 0),
  add column if not exists pricing_tier text check (pricing_tier is null or pricing_tier in ('single', 'ep', 'album')),
  add column if not exists gifting_enabled boolean not null default false,
  add column if not exists deluxe_price_in_cents integer check (deluxe_price_in_cents is null or deluxe_price_in_cents >= 0),
  add column if not exists bundle_price_in_cents integer check (bundle_price_in_cents is null or bundle_price_in_cents >= 0),
  add column if not exists per_track_overrides jsonb;

alter table public.tracks
  add column if not exists lyrics_mode text not null default 'static'
    check (lyrics_mode in ('static', 'timed'));

comment on column public.releases.price_in_cents is 'Storefront price in US cents; validated server-side by pricing tier.';
comment on column public.releases.pricing_tier is 'single | ep | album — drives price validation bands.';
comment on column public.releases.gifting_enabled is 'When true, storefront may offer purchase-to-gift for linked product.';
comment on column public.tracks.lyrics_mode is 'static = plain text; timed = LRC/synced lyrics asset.';
