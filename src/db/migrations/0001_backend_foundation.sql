create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  guest_session_id uuid,
  device_fingerprint text not null,
  push_token text,
  last_seen_at timestamptz not null default now()
);

create table public.guest_sessions (
  id uuid primary key default gen_random_uuid(),
  device_fingerprint text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.user_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  country text,
  region text,
  city text,
  source text not null default 'request',
  observed_at timestamptz not null default now()
);

create table public.artists (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.releases (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id),
  slug text unique not null,
  title text not null,
  release_date date,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.releases(id) on delete cascade,
  title text not null,
  duration_seconds integer not null check (duration_seconds >= 0),
  position integer not null,
  is_explicit boolean not null default false
);

create table public.release_credits (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.releases(id) on delete cascade,
  name text not null,
  role text not null
);

create table public.release_external_links (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.releases(id) on delete cascade,
  provider text not null,
  url text not null
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null,
  owner_id uuid not null,
  bucket text not null,
  storage_path text not null,
  access_level text not null default 'entitled' check (access_level in ('public', 'entitled', 'admin')),
  created_at timestamptz not null default now()
);

create table public.media_variants (
  id uuid primary key default gen_random_uuid(),
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  variant text not null,
  mime_type text not null,
  bytes bigint,
  storage_path text not null
);

create table public.media_access_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  media_asset_id uuid not null references public.media_assets(id),
  granted boolean not null,
  reason text,
  created_at timestamptz not null default now()
);

create table public.media_stream_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  track_id uuid references public.tracks(id),
  event_type text not null,
  position_seconds integer,
  created_at timestamptz not null default now()
);

create table public.media_playback_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  position_seconds integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, track_id)
);

create table public.player_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  device_id uuid references public.user_devices(id) on delete set null,
  status text not null default 'active',
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table public.player_queue_items (
  id uuid primary key default gen_random_uuid(),
  player_session_id uuid not null references public.player_sessions(id) on delete cascade,
  track_id uuid not null references public.tracks(id),
  position integer not null
);

create table public.saved_tracks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, track_id)
);

create table public.saved_releases (
  user_id uuid not null references public.profiles(id) on delete cascade,
  release_id uuid not null references public.releases(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, release_id)
);

create table public.playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  visibility text not null default 'private'
);

create table public.playlist_items (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  track_id uuid not null references public.tracks(id),
  position integer not null
);

create table public.video_watch_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  media_asset_id uuid references public.media_assets(id),
  event_type text not null,
  position_seconds integer,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  stripe_price_id text unique,
  active boolean not null default true,
  grants jsonb not null default '[]'::jsonb
);

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  status text not null,
  purchased_at timestamptz
);

create table public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null default 1
);

create table public.library_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_purchase_id uuid references public.purchases(id),
  item_type text not null,
  item_id uuid not null,
  created_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tier text not null,
  status text not null,
  stripe_subscription_id text unique,
  current_period_end timestamptz
);

create table public.stripe_customers (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  stripe_customer_id text unique not null,
  created_at timestamptz not null default now()
);

create table public.collector_ownerships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  release_id uuid references public.releases(id),
  edition_label text,
  acquired_at timestamptz not null default now()
);

create table public.vault_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  collection_id uuid not null,
  source text not null,
  expires_at timestamptz
);

create table public.entitlement_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text unique,
  created_at timestamptz not null default now()
);

create table public.commerce_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'stripe',
  provider_event_id text unique not null,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.vault_collections (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  visibility text not null default 'entitled'
);

create table public.vault_content (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.vault_collections(id) on delete cascade,
  slug text not null,
  title text not null,
  published_at timestamptz
);

create table public.vault_content_assets (
  id uuid primary key default gen_random_uuid(),
  vault_content_id uuid not null references public.vault_content(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id)
);

create table public.vault_content_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  vault_content_id uuid not null references public.vault_content(id) on delete cascade,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, vault_content_id)
);

create table public.signal_audience_segments (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  rules jsonb not null default '{}'::jsonb
);

create table public.signals (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  audience_segment_id uuid references public.signal_audience_segments(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  cooldown_key text not null,
  payload jsonb not null default '{}'::jsonb
);

create table public.signal_user_states (
  user_id uuid not null references public.profiles(id) on delete cascade,
  signal_id uuid not null references public.signals(id) on delete cascade,
  state text not null check (state in ('new', 'seen', 'dismissed')),
  updated_at timestamptz not null default now(),
  primary key (user_id, signal_id)
);

create table public.signal_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  signal_id uuid references public.signals(id),
  event_type text not null,
  created_at timestamptz not null default now()
);

create table public.signal_cooldowns (
  user_id uuid not null references public.profiles(id) on delete cascade,
  cooldown_key text not null,
  suppress_until timestamptz not null,
  primary key (user_id, cooldown_key)
);

create table public.signal_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  signal_id uuid references public.signals(id),
  channel text not null,
  status text not null,
  created_at timestamptz not null default now()
);

create table public.radio_channels (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  enabled boolean not null default true
);

create table public.radio_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  radio_channel_id uuid not null references public.radio_channels(id),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table public.radio_feed_queue (
  id uuid primary key default gen_random_uuid(),
  radio_channel_id uuid not null references public.radio_channels(id),
  track_id uuid references public.tracks(id),
  scheduled_for timestamptz not null,
  status text not null default 'queued'
);

create table public.radio_timeline_items (
  id uuid primary key default gen_random_uuid(),
  radio_session_id uuid references public.radio_sessions(id) on delete cascade,
  track_id uuid references public.tracks(id),
  started_at timestamptz not null,
  ended_at timestamptz
);

create table public.radio_assets (
  id uuid primary key default gen_random_uuid(),
  radio_channel_id uuid not null references public.radio_channels(id),
  media_asset_id uuid not null references public.media_assets(id)
);

create table public.radio_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  radio_channel_id uuid references public.radio_channels(id),
  item_id uuid,
  kind text not null,
  created_at timestamptz not null default now()
);

create table public.radio_presence (
  radio_channel_id uuid not null references public.radio_channels(id),
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  primary key (radio_channel_id, user_id)
);

create table public.radio_schedules (
  id uuid primary key default gen_random_uuid(),
  radio_channel_id uuid not null references public.radio_channels(id),
  starts_at timestamptz not null,
  ends_at timestamptz,
  payload jsonb not null default '{}'::jsonb
);

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  event_type text not null,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.revenue_daily (
  day date primary key,
  gross_cents bigint not null default 0,
  net_cents bigint not null default 0
);

create table public.geo_daily (
  day date not null,
  country text not null,
  users integer not null default 0,
  primary key (day, country)
);

create table public.engagement_daily (
  day date not null,
  metric text not null,
  value bigint not null default 0,
  primary key (day, metric)
);

create table public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  email_enabled boolean not null default true,
  push_enabled boolean not null default false,
  signal_enabled boolean not null default true,
  radio_enabled boolean not null default true
);

create table public.notification_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.notification_inbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.notification_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  notification_event_id uuid references public.notification_events(id),
  channel text not null,
  status text not null,
  provider_response jsonb,
  created_at timestamptz not null default now()
);

create table public.notification_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.user_devices enable row level security;
alter table public.guest_sessions enable row level security;
alter table public.user_locations enable row level security;
alter table public.artists enable row level security;
alter table public.releases enable row level security;
alter table public.tracks enable row level security;
alter table public.release_credits enable row level security;
alter table public.release_external_links enable row level security;
alter table public.media_assets enable row level security;
alter table public.media_variants enable row level security;
alter table public.media_access_logs enable row level security;
alter table public.media_stream_events enable row level security;
alter table public.media_playback_progress enable row level security;
alter table public.player_sessions enable row level security;
alter table public.player_queue_items enable row level security;
alter table public.saved_tracks enable row level security;
alter table public.saved_releases enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_items enable row level security;
alter table public.video_watch_events enable row level security;
alter table public.products enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.library_items enable row level security;
alter table public.memberships enable row level security;
alter table public.stripe_customers enable row level security;
alter table public.collector_ownerships enable row level security;
alter table public.vault_entitlements enable row level security;
alter table public.entitlement_events enable row level security;
alter table public.commerce_events enable row level security;
alter table public.vault_collections enable row level security;
alter table public.vault_content enable row level security;
alter table public.vault_content_assets enable row level security;
alter table public.vault_content_progress enable row level security;
alter table public.signal_audience_segments enable row level security;
alter table public.signals enable row level security;
alter table public.signal_user_states enable row level security;
alter table public.signal_events enable row level security;
alter table public.signal_cooldowns enable row level security;
alter table public.signal_delivery_attempts enable row level security;
alter table public.radio_channels enable row level security;
alter table public.radio_sessions enable row level security;
alter table public.radio_feed_queue enable row level security;
alter table public.radio_timeline_items enable row level security;
alter table public.radio_assets enable row level security;
alter table public.radio_interactions enable row level security;
alter table public.radio_presence enable row level security;
alter table public.radio_schedules enable row level security;
alter table public.analytics_events enable row level security;
alter table public.revenue_daily enable row level security;
alter table public.geo_daily enable row level security;
alter table public.engagement_daily enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_events enable row level security;
alter table public.notification_inbox enable row level security;
alter table public.notification_delivery_logs enable row level security;
alter table public.notification_push_subscriptions enable row level security;

create policy "profiles self read" on public.profiles for select using (auth.uid() = id);
create policy "profiles self update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));

create policy "published catalog read releases" on public.releases for select using (status = 'published');
create policy "published catalog read tracks" on public.tracks for select using (exists (select 1 from public.releases where releases.id = tracks.release_id and releases.status = 'published'));
create policy "published catalog read artists" on public.artists for select using (true);
create policy "published catalog read credits" on public.release_credits for select using (true);
create policy "published catalog read links" on public.release_external_links for select using (true);
create policy "active products read" on public.products for select using (active);

create policy "saved tracks self" on public.saved_tracks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "saved releases self" on public.saved_releases for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "playback progress self" on public.media_playback_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "player sessions self" on public.player_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "playlists self" on public.playlists for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "playlist items via owner" on public.playlist_items for all using (exists (select 1 from public.playlists where playlists.id = playlist_items.playlist_id and playlists.user_id = auth.uid()));

create policy "purchase self read" on public.purchases for select using (auth.uid() = user_id);
create policy "purchase items self read" on public.purchase_items for select using (exists (select 1 from public.purchases where purchases.id = purchase_items.purchase_id and purchases.user_id = auth.uid()));
create policy "library self read" on public.library_items for select using (auth.uid() = user_id);
create policy "memberships self read" on public.memberships for select using (auth.uid() = user_id);
create policy "vault entitlements self read" on public.vault_entitlements for select using (auth.uid() = user_id);

create policy "vault collections entitled read" on public.vault_collections for select using (
  visibility = 'public' or exists (
    select 1 from public.vault_entitlements
    where vault_entitlements.collection_id = vault_collections.id and vault_entitlements.user_id = auth.uid()
  )
);
create policy "vault content entitled read" on public.vault_content for select using (
  exists (
    select 1 from public.vault_entitlements
    where vault_entitlements.collection_id = vault_content.collection_id and vault_entitlements.user_id = auth.uid()
  )
);
create policy "vault progress self" on public.vault_content_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "signal active read" on public.signals for select using (now() between starts_at and ends_at);
create policy "signal state self" on public.signal_user_states for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "signal events self insert" on public.signal_events for insert with check (auth.uid() = user_id);

create policy "radio channels read" on public.radio_channels for select using (enabled);
create policy "radio feed read" on public.radio_feed_queue for select using (true);
create policy "radio sessions self" on public.radio_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "radio interactions self insert" on public.radio_interactions for insert with check (auth.uid() = user_id);
create policy "radio presence self" on public.radio_presence for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "notification preferences self" on public.notification_preferences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notification inbox self" on public.notification_inbox for select using (auth.uid() = user_id);
create policy "push subscriptions self" on public.notification_push_subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "analytics client insert only" on public.analytics_events for insert with check (auth.uid() = user_id);

-- No client policies are defined for commerce_events, entitlement_events, aggregate analytics,
-- Stripe customers, media access logs, Signal delivery attempts/cooldowns, or Radio schedules.
-- Those tables are written by validated server routes using server-only credentials.
