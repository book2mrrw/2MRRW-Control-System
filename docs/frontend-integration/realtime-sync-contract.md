# Realtime Sync Contract

The Control System exposes two frontend-safe sync layers:

- Supabase Realtime on `public.releases`, `public.media_assets`, and `public.hero_config`: live database broadcast for zero-lag hooks.
- `GET /api/sync/stream`: Server-Sent Events for live invalidation signals.
- `GET /api/sync/replay?lastEventTime=<iso>`: ordered replay from `sync_events` for reconnect and refresh recovery.

`sync_events` is the durable recovery/audit log for missed events. Supabase Realtime is the low-latency broadcast channel; SSE/replay is the frontend-safe fail-safe layer. Do not remove either path.

Events are invalidation/refetch signals, not source-of-truth payloads. The frontend should refetch the affected release, media asset, or hero contract after processing a mutation event. `connected` and `heartbeat` messages are connection state only and should not trigger release/media refetches.

## Automatic Content Routing

The backend does not manually assign homepage cards. Published release contracts are the source for connected sections, and frontend surfaces derive their rails from this routing category:

```ts
type ReleaseCategory =
  | "single"
  | "album"
  | "feature"
```

`feature` is a routing/category value, not a separate release architecture. The core unified release model remains `type: "single" | "album"`; category-aware renderers should use `category` for automatic routing and `type` for single-vs-album workflow behavior.

All frontend sections derive from the unified `releases[]` contract. Do not keep hardcoded arrays, manually curated card lists, or duplicated release objects for homepage rows, music tab subtabs, discography, singles, albums, or features.

```ts
const latestSingles = releases.filter(
  r => r.category === "single" && r.status === "live"
)

const features = releases.filter(
  r => r.category === "feature" && r.status === "live"
)

const albums = releases.filter(
  r => r.category === "album" && r.status === "live"
)
```

Apply newest-first ordering after these filters, using `releaseDate` first and `updatedAt` or `createdAt` as fallback. Do not change the filter conditions.

```ts
function deriveAutomaticContentRoutes(releases) {
  return {
    homepage: {
      latestSingles,
      albums,
      features
    },
    musicTab: {
      singlesSubtab: {
        singles: latestSingles,
        features
      },
      albumsSubtab: albums
    }
  }
}
```

Routing destinations:

- `category: "single"` populates Homepage -> Latest Singles Section and Music Tab -> Singles Subtab. Newest single appears first, existing horizontal scroll/mobile swipe/card sizing are preserved by the public frontend layout.
- `category: "feature"` populates Homepage -> Features Section and Music Tab -> Singles Subtab -> Features Section. Animated artwork comes from `media.videoLoop`; JPG/static artwork comes from `media.cover`.
- `category: "album"` populates Homepage -> Albums Section and Music Tab -> Albums Subtab. Album metadata comes from `Release.metadata`; animated artwork comes from `media.videoLoop`.

The public read API accepts `category=single|album|feature` and treats `type=single|album|feature` as a compatibility alias for category routing. Older `releaseType` filtering remains available for backend compatibility, but new frontend routing should prefer `category`.

## Universal Publish Lifecycle

Publishing is one release lifecycle action for every release category: `single`, `album`, and `feature`. The single entrypoint is:

```ts
publishRelease(releaseId)
```

Do not create `publishSingle()`, `publishAlbum()`, `publishFeature()`, category-specific publish APIs, separate publish workflows, manual card creation, or page-specific mutations. Category only determines frontend routing destinations, rendering behavior, carousel placement, and metadata handling after publish. It does not determine the publishing mechanism.

The publish lifecycle is:

```txt
draft
   ↓
publishRelease()
   ↓
status = "live"
   ↓
emit sync event
   ↓
frontend propagation
   ↓
automatic section population
```

Internally, persisted database rows may use the existing `published` lifecycle value; frontend contracts and `release_published` sync payloads expose that as `status: "live"`. `publishRelease(releaseId)` confirms the lifecycle write, emits the same `release_published` event with the release category, and routing/filtering then updates latest singles, albums, features, hero eligibility, discography, carousels, and music tab sections from the same `releases[]` source.

## Global Media Destinations

The backend Media tab is the centralized media control hub. Its Hero, Vault, Audio Visuals, Press Photos, Music Videos, and Release Media panels are destination interfaces over one upload architecture, not separate upload systems. Every panel must call the shared `lib/uploads/` and `services/media/` path, create a `media_assets` record, assign destination metadata, emit a sync event, and let frontend sections repopulate automatically.

```ts
type FrontendDestination =
  | "hero"
  | "latest_singles"
  | "features"
  | "albums"
  | "vault"
  | "audio_visuals"
  | "music_singles"
  | "music_albums"
  | "music_features"

type MediaDestination =
  | "hero"
  | "vault"
  | "audio_visuals"
  | "press_photos"
  | "music_videos"
  | "release_media"
```

Upload routing is assigned by the backend at upload time:

```ts
{
  category,
  destination,
  mediaType,
  relatedReleaseId
}
```

Destination behavior:

- Hero upload -> `destination: "hero"` -> Homepage hero updates instantly with MP4 loops, animated artwork, or image fallback.
- Vault upload -> `destination: "vault"` -> Vault sections update instantly with image, MP4, or animated visual assets.
- Audio Visuals upload -> `destination: "audio_visuals"` or `"music_videos"` -> Audio Visuals sections update instantly with embeds, MP4 uploads, visual loops, and backend-controlled ordering.
- Release Media upload -> `destination: "release_media"` plus `category` -> singles, albums, and features route through the release filters above.

Required flow:

```txt
Media Tab Section
  -> Unified Upload Engine
  -> Media Asset Creation
  -> Destination Assignment
  -> Event Emission
  -> Realtime Frontend Sync
  -> Automatic Section Population
```

Use the label `Audio Visuals` everywhere in UI and schema labels. Do not use `Audiovisuals`.

Frontend clients should store:

- `lastSyncTime`: timestamp or `created_at` from the newest processed sync event.
- `lastProcessedEventId`: latest applied event id.
- A short-lived processed-event set to skip duplicate event ids.

On page load, SSE reconnect, or a heartbeat gap over 15 seconds, call replay, sort events oldest to newest, skip processed ids, then refetch affected entities. If a media event arrives before the file is ready, retry the entity fetch after 1-3 seconds up to 5 times, then show a processing state.

Use scoped soft revalidation instead of full reloads. Refetch only the changed release, media asset group, or hero config. Debounce rapid realtime notifications to prevent flicker:

```ts
let timeout
function smartRefetch(fn) {
  clearTimeout(timeout)
  timeout = setTimeout(fn, 150)
}
```

For production hooks, keep timeout state per hook instance, but preserve the same 150ms behavior.

## useReleases

Copy-ready pattern for the official frontend. The backend migration `0009_sync_events_foundation.sql` enables Supabase Realtime for `public.releases`.

```ts
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export function useReleases() {
  const [releases, setReleases] = useState([])

  async function fetchReleases() {
    const { data } = await supabase
      .from("releases")
      .select("*")
      .order("created_at", { ascending: false })

    setReleases(data || [])
  }

  useEffect(() => {
    fetchReleases()

    const channel = supabase
      .channel("releases-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "releases" },
        () => {
          smartRefetch(fetchReleases)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return releases
}
```

## useMediaSync

Use for MP4 cover loops, audio replacement, cover art, hero media, vault assets, and media library sections. The backend migration enables Supabase Realtime for `public.media_assets`.

```ts
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export function useMediaSync() {
  const [media, setMedia] = useState([])

  async function fetchMedia() {
    const { data } = await supabase.from("media_assets").select("*")
    setMedia(data || [])
  }

  useEffect(() => {
    fetchMedia()

    const channel = supabase
      .channel("media-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "media_assets" },
        () => smartRefetch(fetchMedia)
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  return media
}
```

## useHero

Use for hero title, subtitle/CTA, and image or MP4 loop background changes. The backend migration enables Supabase Realtime for `public.hero_config`, and the custom SSE stream emits `hero_updated` after successful hero writes.

```ts
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export function useHero() {
  const [hero, setHero] = useState(null)

  async function fetchHero() {
    const { data } = await supabase
      .from("hero_config")
      .select("*")
      .single()

    setHero(data)
  }

  useEffect(() => {
    fetchHero()

    const channel = supabase
      .channel("hero-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hero_config" },
        () => smartRefetch(fetchHero)
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  return hero
}
```

Optimistic UI can update selected cover/audio/hero previews immediately, but it must label them pending/processing until the upload/write succeeds and a Supabase/SSE event confirms the authoritative backend state.
