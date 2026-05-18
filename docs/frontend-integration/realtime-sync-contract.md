# Realtime Sync Contract

The Control System exposes two frontend-safe sync layers:

- Supabase Realtime on `public.releases`, `public.media_assets`, and `public.hero_config`: live database broadcast for zero-lag hooks.
- `GET /api/sync/stream`: Server-Sent Events for live invalidation signals.
- `GET /api/sync/replay?lastEventTime=<iso>`: ordered replay from `sync_events` for reconnect and refresh recovery.

`sync_events` is the durable recovery/audit log for missed events. Supabase Realtime is the low-latency broadcast channel; SSE/replay is the frontend-safe fail-safe layer. Do not remove either path.

Events are invalidation/refetch signals, not source-of-truth payloads. The frontend should refetch the affected release, media asset, or hero contract after processing a mutation event. `connected` and `heartbeat` messages are connection state only and should not trigger release/media refetches.

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
