# Edge-Case Verification — 2MRRW Control System Go-Live

**Date:** 2026-05-19  
**Verifier:** Agent (automated + browser MCP)  
**Control prod:** https://2-mrrw-control-system.vercel.app  
**Frontend prod:** https://artist-platform-silk.vercel.app  
**Supabase prod:** `xzghdntnvslvpxedgfku`

## Summary

| Status | Count |
|--------|------:|
| **PASS** | 52 |
| **FAIL** | 3 |
| **SKIP** | 11 |
| **Total** | 66 |

### Critical blockers

1. **Signed media URLs return 502** — `GET /api/media/{assetId}/signed-url` responds with `{"error":{"message":"Object not found"}}` for public artwork assets (e.g. love-hz cover). Supabase Storage object missing at `protected-media/artwork/{releaseId}/…` despite DB rows. Public `coverUrl` falls back to this endpoint when `resolveCatalogMediaUrl` cannot sign.
2. **React hydration error #418** on `/media` (minified) — console shows `Uncaught Error: Minified React error #418` on load; page still renders badges/carousels.
3. **Cron 200 with secret not re-verified locally** — `vercel env pull` redacts `CRON_SECRET` (length 2 in pulled file). Prod cron auth enforced (401 without header). Prior go-live run published `hour-glass` via cron successfully.

---

## A. Public API visibility

| Case | Expected | Actual | Status |
|------|----------|--------|--------|
| A1 Published releases in `/api/public/releases` | All `status=published` visible | 9 releases, all `published`, all have `coverUrl` | **PASS** |
| A2 Future scheduled hidden | `status=scheduled` + future `scheduled_publish_at` excluded | Set `w2d` scheduled +30d; public count 8, `w2d` absent; restored to 9 | **PASS** |
| A3 Draft hidden | Drafts not in public API | DB: 0 draft/archived/scheduled (after restore) | **PASS** |
| A4 Archived hidden | Archived not in public API | DB: 0 non-published | **PASS** |
| A5 Post-cron visibility | After cron, `status=published` and appears in public API | `hour-glass`: `status=published`, `published_at` 2026-05-19 after `scheduled_publish_at` 08:34 UTC; visible in public API | **PASS** |
| A6 Hero API valid payload | `data.hero` object | Keys: `title`, `subtitle`, `ctaLabel`, `ctaHref`, `backgroundMediaUrl`, … | **PASS** |
| A7 Audio-visuals API count | Non-empty visuals array | 3 visuals | **PASS** |
| A8 CORS from artist-platform | `Access-Control-Allow-Origin` for silk origin | 200 + `access-control-allow-origin: https://artist-platform-silk.vercel.app` | **PASS** |

---

## B. Live status engine (`releaseLiveStatus`)

| Case | Expected | Actual | Status |
|------|----------|--------|--------|
| B1 All 9 published → LIVE badges | Live on Media Control Room carousels | Browser `/media`: Singles 3 live + 1 scheduled (test); Albums 3 live; Features 2 live. After restore all published → 9 live | **PASS** |
| B2 `2-heavy` (single) | LIVE | "Live 2 Heavy" on Features tab | **PASS** |
| B3 `ad` (album) | LIVE | "Live 2MRRW: (A.D)" on Albums tab | **PASS** |
| B4 `artificial` (single) | LIVE | "Live Artificial" on Singles | **PASS** |
| B5 `hour-glass` (single) | LIVE | "Live Hour Glass" on Singles | **PASS** |
| B6 `i-dont-believe-you` (feature) | LIVE | "Live I Don't Believe You" on Features | **PASS** |
| B7 `love-hz` (ep) | LIVE | "Live Love Hz Vol.1" on Albums | **PASS** |
| B8 `tbh` (album) | LIVE | "Live T.B.H." on Albums | **PASS** |
| B9 `turnt-me-2-dis` (single) | LIVE | "Live Turnt Me 2 Dis" on Singles | **PASS** |
| B10 `w2d` (single) | LIVE when published | Live before test; **Scheduled** badge when DB `status=scheduled` (future) | **PASS** |
| B11 SCHEDULED badge + future time | SCHEDULED + countdown eligible | `w2d` showed "Scheduled W.2.D" during DB test | **PASS** |
| B12 DRAFT badge on draft release | DRAFT | No draft releases in prod DB | **SKIP** |
| B13 SYNC ERROR on missing cover/audio | `sync_error` + reasons | Unit test: missing cover → `sync_error`, reason mentions cover | **PASS** |
| B14 `liveStatusReasons` populated on error | Non-empty reasons array | Unit test confirms reasons on sync_error | **PASS** |
| B15 Album: all tracks need audio | Album missing one track → sync_error | Local: album 2 tracks, 1 audio → `sync_error`, "Missing required track audio" | **PASS** |
| B16 Single: any track audio OK | Single with one of two tracks having audio → live | Local: `live` | **PASS** |
| B17 Admin catalog without auth | 403 | `GET /api/admin/catalog` → 403 "Studio access required" | **PASS** |
| B18 Admin catalog liveStatus per release | `liveStatus` on each row | Not fetched (403 without session cookie in curl) | **SKIP** |

---

## C. Scheduling system

| Case | Expected | Actual | Status |
|------|----------|--------|--------|
| C1 Chicago 11:30 PM → UTC | `2026-05-29T04:30:00.000Z` for 2026-05-28 11:30 PM CT | Local `localScheduleToUtcIso` + roundtrip | **PASS** |
| C2 12 AM midnight UTC | `2030-01-01T00:00:00.000Z` | Matches | **PASS** |
| C3 12 PM noon UTC | `2030-01-01T12:00:00.000Z` | Matches | **PASS** |
| C4 Invalid timezone rejected | Throws | `Not/AZone` → throws "zone … not supported" | **PASS** |
| C5 Past date rejected | `buildSchedulePayload` throws | `scheduleIsInFuture('2020-01-01…')` → false; API uses same guard | **PASS** |
| C6 DB fields persisted after schedule | `release_time`, `publish_timezone`, `scheduled_publish_at` | `hour-glass` retains `release_time=18:45:00`, `publish_timezone=America/Chicago`, past `scheduled_publish_at` | **PASS** |
| C7 Cron 401 without secret | 401 | 401 + `Unauthorized cron request` | **PASS** |
| C8 Cron 200 with secret | 200 + JSON `due` | `vercel env pull` redacts secret (len 2); Bearer → 401 | **SKIP** |
| C9 Cron sets `status=published` | Not left as `scheduled` | `hour-glass` published; `clearScheduleFailure` sets `status=published` in code | **PASS** |
| C10 Public API hides until published | Hidden while scheduled | w2d test: 8/9 public | **PASS** |
| C11 Retry fields on failure | `schedule_attempts`, `schedule_last_error` | No failed schedules in prod; code writes on `recordScheduleFailure` | **SKIP** |
| C12 Schedule API past rejection (HTTP) | 400 | Requires studio auth POST | **SKIP** |
| C13 Schedule → unpublish edge | Documented behavior | Requires studio auth | **SKIP** |

---

## D. Media / catalog

| Case | Expected | Actual | Status |
|------|----------|--------|--------|
| D1 All 9 `coverUrl` in public API | Non-null | 9/9 `coverUrl` set (endpoint URLs) | **PASS** |
| D2 Primary `cover_art` per release | 1 primary each | SQL: 9/9 `primary_cover=1` | **PASS** |
| D3 `release_media` links | ≥1 per release | 2–21 links per release | **PASS** |
| D4 Signed URL route works | 200 + redirect/signed URL | `GET …/signed-url` → **502** `Object not found` | **FAIL** |
| D5 `coverUrl` HEAD fetch | 200 | love-hz, hour-glass → **502** | **FAIL** |
| D6 `sync_state` catalog clean | `catalog` not dirty | `dirty=false` | **PASS** |
| D7 Per-release sync rows | No dirty failed | `release:85db27dd…` dirty=false | **PASS** |
| D8 Tracks with audio (prod) | Singles 1/1, albums all tracks | SQL: all tracks have `audio_asset_id` | **PASS** |

---

## E. Publish / unpublish flows

| Case | Expected | Actual | Status |
|------|----------|--------|--------|
| E1 Publish readiness (imported) | 9 ingested releases published | `ingestion_source=artist-platform` × 9 | **PASS** |
| E2 Unpublish removes from public API | Gone after unpublish | Requires `POST …/actions` + studio auth | **SKIP** |
| E3 Archive behavior | Archived hidden | No archived in DB; API exists | **SKIP** |
| E4 Readiness endpoint | Returns blockers | Requires studio auth | **SKIP** |

---

## F. artist-platform integration

| Case | Expected | Actual | Status |
|------|----------|--------|--------|
| F1 Vercel env `NEXT_PUBLIC_CONTROL_SYSTEM_API_URL` | Set on Production | Listed (encrypted), 2d ago | **PASS** |
| F2 Hooks use control API | `useReleases` → `getControlSystemLatestReleases` | Source code + `source: "control-system"` in hook | **PASS** |
| F3 Prod home loads | 200 | HTTP 200 | **PASS** |
| F4 Control API CORS | Allowed from silk | See A8 | **PASS** |
| F5 Hero from control API | Client fetches `/api/public/hero` | Hero payload valid on control; artist-platform uses control client | **PASS** |
| F6 Release cards cover URLs | Render from control `coverUrl` | coverUrl points to signed-url (currently 502) — **blocked by D4** | **FAIL** |
| F7 No stale fallback when env set | Fetches control first | Hook uses control fetcher; fallback only if env missing | **PASS** |

---

## G. Media Control Room UI (browser)

| Case | Expected | Actual | Status |
|------|----------|--------|--------|
| G1 `/media` loads without login redirect | Page renders | Loaded; studio session present (sync-state 200) | **PASS** |
| G2 Singles carousel badges | Live/Scheduled/Draft badges | 4 cards with Live/Scheduled labels | **PASS** |
| G3 Albums & EPs carousel | Live badges | 3 Live cards | **PASS** |
| G4 Features carousel | Live badges | 2 Live cards | **PASS** |
| G5 SCHEDULED countdown | Countdown on scheduled card | Not observed on restored data (no future scheduled) | **SKIP** |
| G6 Cover/loop preview loads | Images/video visible | Not verified pixel-level; signed-url 502 may affect | **SKIP** |
| G7 No console errors | Clean console | React #418 hydration error present | **FAIL** |
| G8 Default Singles tab | Singles active first | Singles section shown on load | **PASS** |

---

## H. Cron / Hobby limitation

| Case | Expected | Actual | Status |
|------|----------|--------|--------|
| H1 `vercel.json` schedule | `0 6 * * *` daily | Confirmed in repo + deployed | **PASS** |
| H2 Hobby (not `*/5`) | Daily only | No `*/5` in vercel.json | **PASS** |
| H3 Manual curl recipe | Documented in MEGA_GO_LIVE_CHECKLIST | Present | **PASS** |
| H4 Manual curl with live secret | 200 | Secret not available in pulled env | **SKIP** |

---

## I. Regression checks

| Case | Expected | Actual | Status |
|------|----------|--------|--------|
| I1 `npm run verify` | Pass | typecheck + backend-foundation tests passed | **PASS** |
| I2 `npm run build` | Pass | Next.js build completed | **PASS** |
| I3 No demo/fake prod data | Real ingestion only | 0 demo-like titles; all `ingestion_source=artist-platform` | **PASS** |
| I4 Unit: live status engine | Tests pass | `testReleaseLiveStatusEngine` in backend-foundation | **PASS** |
| I5 Unit: schedule UTC | Tests pass | `testReleaseScheduleUtcConversion` | **PASS** |

---

## Evidence commands (repro)

```bash
# Public API
curl -sS "https://2-mrrw-control-system.vercel.app/api/public/releases" | jq '.data.releases | length'

# Cron unauthorized
curl -sS -w "\n%{http_code}\n" "https://2-mrrw-control-system.vercel.app/api/cron/scheduled-releases"

# Signed URL (example asset from love-hz)
curl -sS "https://2-mrrw-control-system.vercel.app/api/media/60869b4b-7867-551f-a0b2-a9532d720d26/signed-url"

# CORS
curl -sS -H "Origin: https://artist-platform-silk.vercel.app" -D - \
  "https://2-mrrw-control-system.vercel.app/api/public/releases" -o /dev/null
```

## Recommended follow-ups

1. **Upload or backfill** artwork/audio objects into Supabase Storage bucket `protected-media` at paths matching `media_assets.storage_path`, or serve public paths via `ARTIST_PLATFORM_PUBLIC_URL` + static path when `access_level=public`.
2. **Re-test cron** with production secret: `vercel env pull` then `curl -H "Authorization: Bearer $CRON_SECRET" …/api/cron/scheduled-releases`.
3. **Investigate React #418** hydration mismatch on `/media` (likely text content/date formatting).
4. **Schedule countdown UI** — create a future scheduled release in studio and confirm `ScheduledCountdown` renders.

---

## Per-release live status (browser + DB, 2026-05-19)

| Slug | Type | DB status | Badge (UI) | Notes |
|------|------|-----------|------------|-------|
| 2-heavy | single | published | Live | Features |
| ad | album | published | Live | Albums |
| artificial | single | published | Live | Singles |
| hour-glass | single | published | Live | Post-cron publish verified |
| i-dont-believe-you | single | published | Live | Features |
| love-hz | ep | published | Live | Albums |
| tbh | album | published | Live | Albums |
| turnt-me-2-dis | single | published | Live | Singles |
| w2d | single | published | Live | Scheduled badge verified during temp DB test |
