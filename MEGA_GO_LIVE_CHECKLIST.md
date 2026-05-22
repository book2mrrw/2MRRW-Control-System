# MEGA Go-Live Checklist — 2MRRW Control System

**Audit date:** 2026-05-19  
**Production URL:** https://2mrrw-control-system.vercel.app  
**Media Control Room:** https://2mrrw-control-system.vercel.app/media  
**Latest deploy:** `dpl_2wkbfGBxxVPoJ5DEwM78nCe2mg2w` (health, backfill API, GitHub workflows)  
**PR:** https://github.com/book2mrrw/2MRRW-Control-System/pull/2 (merged)

---

## Cron precision (Hobby vs Pro)

| Plan | `vercel.json` schedule | Behavior |
|------|------------------------|----------|
| **Hobby** (current) | `0 6 * * *` | Auto-publish runs once daily at **06:00 UTC**. Due releases within the last 24h are processed in that run. |
| **Pro** | Change to `*/5 * * * *` in `vercel.json` + redeploy | Auto-publish every 5 minutes (near-exact drop times). |

**5-minute drops on Hobby (no Pro upgrade):** enable GitHub Action (free):

1. **DONE (2026-05-19):** GitHub secrets `CRON_SECRET`, `CONTROL_SYSTEM_URL` on `book2mrrw/2MRRW-Control-System`
2. Workflow `.github/workflows/scheduled-releases.yml` runs every 5 minutes

**Manual trigger at drop time:**

```bash
./scripts/trigger-scheduled-cron.sh
# or
curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  "https://2mrrw-control-system.vercel.app/api/cron/scheduled-releases"
```

Expect JSON like `{"due":1,"results":[{"ok":true,"status":"published"}]}`. See **`DROP_REHEARSAL.md`** for full rehearsal.

### CRON_SECRET hygiene

- Rotated at go-live; **do not rotate again** unless compromised.
- **Quarterly:** rotate in Vercel → redeploy → update GitHub secret `CRON_SECRET` → `vercel env pull` (if not redacted).
- `vercel env pull` often **redacts** secrets (length 0). Copy `CRON_SECRET` once from Vercel dashboard → paste into local `.env.local` for scripts.

### GitHub CLI (`gh`)

```bash
./scripts/gh.sh auth status   # or: brew install gh && gh auth login
```

Bundled binary: `.tmp/gh/gh` (see `scripts/gh.sh`).

### Health monitoring

```bash
curl -sS https://2mrrw-control-system.vercel.app/api/health | jq .
```

- `status`: `ok` | `degraded`
- `catalog.publishedReleases`, `cron.configured`, `storage.usesFallback`

Optional: `.github/workflows/health-check.yml` (every 30 min) — set `CONTROL_SYSTEM_URL` secret.

### Storage backfill (Supabase bucket)

Fallback URLs work without bucket objects. For **true** signed URLs:

```bash
# Local (needs real SUPABASE_SERVICE_ROLE_KEY in .env.local — not the vercel pull placeholder)
npm run backfill:covers

# Production (uses Vercel service role)
curl -sS -X POST -H "Authorization: Bearer $CRON_SECRET" \
  "https://2mrrw-control-system.vercel.app/api/admin/ops/backfill-covers"
```

Verify: `/api/health` → `storage.usesFallback: false` and love-hz sample message reads `R2 signed URL OK` (CDN or presigned R2 URL, not legacy Supabase Storage).

---

## Go-live execution (2026-05-19)

| # | Task | Status | Result |
|---|------|--------|--------|
| 1 | Migration `0017_release_scheduling` on prod Supabase | **DONE** | Applied via Supabase MCP (`release_scheduling`). Columns: `release_time`, `publish_timezone`, `schedule_attempts`, `schedule_last_error`. |
| 2 | `CRON_SECRET` in Vercel production | **DONE** | Rotated via `vercel env rm/add` + redeploy `dpl_GvULKn8bU9x8zF3JVQQBEG8oX31j`. Value only in Vercel (not in repo). |
| 3 | Cron schedule | **DONE** | `vercel.json`: `0 6 * * *` (Hobby daily). **Pro:** use `*/5 * * * *`. **Precise drops:** manual `curl -H "Authorization: Bearer $CRON_SECRET" https://2mrrw-control-system.vercel.app/api/cron/scheduled-releases` |
| 4 | Scheduled drop E2E test | **DONE** | `hour-glass` set `scheduled` → hidden from public (8/9). Cron fired (`due:1`, `ok:true`). Fixed `clearScheduleFailure` to set `status=published` in DB; public API restored 9/9. |
| 5 | artist-platform API URL | **DONE** | `.env.example` already set. Local `.env.local` updated with `NEXT_PUBLIC_CONTROL_SYSTEM_API_URL`. Smoke: releases/hero/audio-visuals OK. |
| 6 | Production `/media` ops | **DONE** | 9/9 releases `coverUrl` on public API. All have `cover_links=1` in DB. `sync_state`: catalog clean (not dirty). |
| 7 | Git commit + PR | **DONE** | [PR #2](https://github.com/book2mrrw/2MRRW-Control-System/pull/2) merged to `main` |
| 8 | Production redeploy | **DONE** | Control: `dpl_GvULKn8bU9x8zF3JVQQBEG8oX31j`. artist-platform: `dpl_F7mLzQPfpkC7DY64p8aYRFepu2hk` |
| 9 | artist-platform Vercel env | **DONE** | `NEXT_PUBLIC_CONTROL_SYSTEM_API_URL` already on Production (encrypted) |

### CRON_SECRET — Vercel dashboard (if re-setting)

1. [Vercel](https://vercel.com) → **2mrrw-control-system** → **Settings** → **Environment Variables**
2. Add `CRON_SECRET` = long random string (32+ chars), environments **Production** (+ Preview optional)
3. **Redeploy** production (env vars apply on next deploy)

### Manual cron trigger (precise drop)

```bash
curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  "https://2mrrw-control-system.vercel.app/api/cron/scheduled-releases"
```

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
| `0017` scheduling columns | applied |

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
| Global release scheduling + auto-publish cron | **PASS** | Migration `0017` + schedule UI + cron endpoint. Hobby cron daily 06:00 UTC; manual trigger for precise drops. |

---

## Build / deploy

| Step | Status |
|------|--------|
| `npm run verify` | **PASS** |
| `npm run build` | **PASS** |
| `npx vercel --prod --yes` | **PASS** → https://2mrrw-control-system.vercel.app (`dpl_GvULKn8bU9x8zF3JVQQBEG8oX31j`) |

---

## Production smoke (curl)

```bash
curl -s "https://2mrrw-control-system.vercel.app/api/public/releases?limit=100"
curl -s "https://2mrrw-control-system.vercel.app/api/public/hero"
curl -s "https://2mrrw-control-system.vercel.app/api/public/audio-visuals"
```

---

## Still open (post go-live)

1. **Inspector sync log** — stub; full event stream not implemented.
2. **Audio visual auto-map** — title→release heuristic still manual.
3. ~~**Cron publish DB status**~~ — **CLOSED** (merged + deployed `clearScheduleFailure` fix).

---

## Files changed (go-live blockers pass)

- `src/lib/catalog/releaseLiveStatus.ts` — live/scheduled/draft/sync_error derivation
- `src/server/releases/scheduledPublishService.ts` — cron auto-publish + DB status fix
- `src/components/control/MediaSyncWorkspace.tsx` — Media Control Room
- `src/components/control/ReleaseScheduleSection.tsx` — global drop scheduler UI
- `vercel.json` — daily cron
- `src/db/migrations/0017_release_scheduling.sql` — scheduling columns
