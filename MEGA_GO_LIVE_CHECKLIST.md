# MEGA Go-Live Checklist — 2MRRW Control System

**Audit date:** 2026-05-19  
**Production URL:** https://2-mrrw-control-system.vercel.app  
**Media Control Room:** https://2-mrrw-control-system.vercel.app/media  
**Latest deploy:** `dpl_EunR5oGxYerdxd6kUp1CagRQF6qZ` (prod alias active)

---

## Production counts (Supabase `xzghdntnvslvpxedgfku`)

| Metric | Count |
|--------|------:|
| `releases` | 9 |
| `release_media` (total rows) | 67 |
| Releases with primary `cover_art` / `background_loop` | 9 / 9 |
| `media_assets` | 71 |
| `hero_config` rows | 1 (`homepage`) |
| `tracks.lyrics_text` column | applied |

---

## Verify / fix (items 1–9)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | Cover art on Releases + Media cards (static + MP4 loop as ONE cover) | **PASS** | `pickCardVisual` prefers motion loop; singles merge loop into card cover via `controlCatalogPayload`. Cards render `<video>` or `<img>` in `MediaSyncReleaseStudio`. |
| 2 | Audio full + preview populate with players | **PASS** | Catalog resolves `audioUrl` / `previewUrl` via `catalogMediaUrl`; workspace shows `AudioMiniPlayer` + expand when linked. Prod public API returns preview/full asset paths for Love Hz tracks. |
| 3 | Default tab Singles | **PASS** | `MediaLibrary` initializes `activeSection` to `"singles"`. |
| 4 | Scroll overflow | **PASS** | `media-sync-section-scroll`, `media-sync-ws-body` max-height, horizontal `media-sync-card-scroll`. |
| 5 | Edit + overflow menus | **PASS** | Edit on cards/workspace; `ReleaseOverflowMenu` added (publish/unpublish/archive/duplicate/sync). Releases page retains `ReleaseOverflowMenu`. |
| 6 | Media tabs: Singles, Albums & EPs, Features, Hero, Vault, Audio Visuals, Press & Promo | **PASS** | `controlRoomRootSections` + sticky tabs in `MediaSyncWorkspace`. |
| 7 | Singles workspace: Cover \| Audio \| Lyrics \| Metadata | **PASS** | Tabs wired in `ReleaseWorkspacePanel`; lyrics + metadata now editable (this pass). |
| 8 | Albums: Cover \| Audio \| Tracklist \| Lyrics \| Metadata | **PASS** | Album-like types get tracklist tab; tracklist editor added (this pass). |
| 9 | Audio Visuals mirror frontend embeds | **PASS** | `AudioVisualsPanel` embedded; prod `/api/public/audio-visuals` returns **3** items. |

---

## Implement (items 10–16)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 10 | New release creation — Create flow + publish → catalog | **PARTIAL** | `ReleaseFlow` now calls `POST /api/admin/releases/manage`, metadata/track PATCH, and `publishReleaseAction`. Publish still blocked until artwork/audio readiness passes. Media “New” card creates draft via API. Full publish-to-catalog requires completing media + readiness checks. |
| 11 | Tracklist — reorder, add, delete + sync | **PASS** | New `PATCH .../tracks/reorder`, UI `TracklistEditor` with add/delete/up/down + title save. |
| 12 | Lyrics tab — textarea save | **PASS** | `LyricsEditor` saves to release session (`PATCH .../session` lyrics map) + file upload retained. |
| 13 | Metadata tab — key fields wired | **PASS** | `MetadataEditor` PATCHes title, slug, release date, notes via `/metadata`. |
| 14 | Hero — render current frontend hero image | **PASS** | Hero seeded in prod `hero_config` (title 2MRRW, bg `/videos/A2B.mp4`). `/api/public/hero` + `/api/hero` return JSON after deploy. |
| 15 | Run `npm run ingest:frontend -- --activate` | **PASS** | Prod Supabase: 9 releases, 71 media_assets, **67 release_media**, 9/9 primary `cover_art`. Ingest linker now writes `release_media` on every run via `releaseMediaLinkService`. |
| 16 | Frontend bidirectional — public API reads Supabase | **PASS** | Public APIs return 9 releases + coverUrl, 3 audio visuals, hero JSON. artist-platform `.env.example` documents `NEXT_PUBLIC_CONTROL_SYSTEM_API_URL`; `/api/releases` CORS extended for artist-platform. |

---

## UI

| Item | Status | Notes |
|------|--------|-------|
| Glassmorphism on `media-sync-*` only | **PASS** | Enhanced backdrop blur on workspace, selected cards, inspector, asset panels, overflow menu. No global redesign. |
| Live release status badges (Singles / Albums / Features carousels) | **PASS** | `/api/admin/catalog` exposes `liveStatus` + `liveStatusReasons` from `releaseLiveStatusEngine` (DB status, `sync_state`, cover/audio, `release_media` routing). Carousel cards show scoped `.media-sync-status-*` badges + last updated. |
| Global release scheduling + auto-publish cron | **PASS** | Migration `0017_release_scheduling.sql` (`publish_timezone`, `release_time`, retry fields). UI: `ReleaseScheduleSection` on Review + Creator flow. API: `POST .../schedule`. Cron: `vercel.json` → `/api/cron/scheduled-releases` daily 06:00 UTC (`CRON_SECRET`; use `*/5 * * * *` on Vercel Pro for sub-hour precision). Public API hides non-published / future scheduled. |

---

## Build / deploy

| Step | Status |
|------|--------|
| `npm run verify` | **PASS** |
| `npm run build` | **PASS** |
| `npx vercel --prod --yes` | **PASS** → https://2-mrrw-control-system.vercel.app (`dpl_EunR5oGxYerdxd6kUp1CagRQF6qZ`) |

---

## Production smoke (curl)

```bash
# 9 releases with artwork + coverUrl
curl -s "https://2-mrrw-control-system.vercel.app/api/public/releases?limit=100"

# Hero config (seeded)
curl -s "https://2-mrrw-control-system.vercel.app/api/public/hero"

# 3 audio visuals
curl -s "https://2-mrrw-control-system.vercel.app/api/public/audio-visuals"
```

---

## Still open (post go-live)

1. ~~**Supabase migration gap**~~ — **CLOSED** (prod: 67 `release_media`, 9/9 primary cover_art; migrations through 0016 applied).
2. ~~**Hero media**~~ — **CLOSED** (`hero_config` seeded; `/api/public/hero` returns JSON).
3. ~~**Publish readiness**~~ — **CLOSED** for frontend-import releases with cover+audio in DB (readiness auto-pass + publish hydrates from Supabase).
4. ~~**Lyrics durable storage**~~ — **CLOSED** (`tracks.lyrics_text` migration 0014; session + track PATCH persist; public track contract exposes `lyricsText`).
5. ~~**artist-platform**~~ — **CLOSED** (`.env.example` has API URL; `/api/releases` CORS includes artist-platform; hooks unchanged).
6. **Inspector sync log** — stub; full event stream not implemented.
7. **Audio visual auto-map** — title→release heuristic still manual.

---

## Files changed (go-live blockers pass)

- `src/server/release-management/releaseMediaLinkService.ts` — cover_art primary before background_loop
- `src/lib/catalog/releaseLiveStatus.ts` — shared live/scheduled/draft/sync_error derivation
- `src/server/catalog/releaseLiveStatusEngine.ts` — catalog sync_state batch + server wrapper
- `src/server/catalog/controlCatalogPayload.ts` — cover/loop from `release_media` fallback + `lyricsText` + `liveStatus`
- `src/server/catalog/releaseCatalogService.ts` — `lyrics_text` on tracks
- `src/services/catalog/controlCatalogClient.ts` — `published` → Live UI; `lyricsText` type
- `src/server/release-management/releaseManagementService.ts` — imported readiness bypass without pre-published status
- `src/server/releases/releaseService.ts` — publish hydrates draft; imported media bypass
- `src/server/release-management/releaseCatalogHydrationService.ts` — export `hydrateDraftFromCatalogRelease`
- `src/app/api/admin/releases/manage/[id]/session/route.ts` — persist lyrics without `cloudSynced` gate
- `src/db/migrations/0015_hero_config_seed.sql` — hero upsert
- `src/db/migrations/0016_release_media_backfill.sql` — idempotent media_assets → release_media backfill
- `MEGA_GO_LIVE_CHECKLIST.md` — production counts updated

**No git commit** (per request).
