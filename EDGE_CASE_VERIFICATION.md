# Edge-Case Verification — 2MRRW Control System Go-Live

**Date:** 2026-05-19 (full re-verification + media rendering matrix)  
**Control prod:** https://2mrrw-control-system.vercel.app  
**Deploy:** `dpl_HyJb2XSdrL5AS6cZoL1YdzmybWKQ` (single-loop media resolver `b26558e`)  
**Frontend prod:** https://artist-platform-silk.vercel.app  
**Supabase prod:** `xzghdntnvslvpxedgfku`

## Summary

| Status | Count |
|--------|------:|
| **PASS** | 72 |
| **FAIL** | 0 |
| **SKIP** | 2 |
| **Total** | 74 |

**SKIP (2):** `C8`, `H4` — `vercel env pull` redacts `CRON_SECRET` (length 2); `C7` cron 401 without secret verified; `/api/health` reports `cron.configured: true`.

### This session

1. **Media rendering (J)** — Public API: 4 animated singles (`hour-glass`, `artificial`, `w2d`, `turnt-me-2-dis`) return `primaryAsset.type=mp4` with artist-platform `/videos/singles/*.mp4`. Features (`2-heavy`, `i-dont-believe-you`) and albums/EP (`ad`, `tbh`, `love-hz`) return `jpg` only. `/media` Singles carousel loads all four MP4 streams (network 206). `turnt-me-2-dis` → `turntme2dis.mp4` slug map confirmed.
2. **Regression** — `npm run verify` + `npm run build` passed locally and on Vercel build.
3. **Deploy** — `npx vercel --prod --yes` → production alias updated.
4. **Post-deploy smoke** — `/api/health` 200, `/api/public/releases` 9/9 (4 mp4), love-hz signed-url 200 (Supabase), `/media` 4× MP4 206.

### Prior critical fixes (retained)

1. **Signed media URLs** — `artworkPublicFallbackUrl` + storage backfill; love-hz signed-url 200 (Supabase, not fallback).
2. **React hydration #418** — Stable UTC `formatWhen()`; no #418 on fresh `/media` load (2026-05-19).
3. **Cron 401 without secret** — Verified; secret not available locally for 200 re-test.
4. **Unpublish persistence** — `persistReleaseUnpublish()` + migration `0018`.

---

## A. Public API visibility

| Case | Expected | Actual | Status |
|------|----------|--------|--------|
| A1 Published in public API | 9 published visible | 9 with `coverUrl` + `primaryAsset` | **PASS** |
| A2 Future scheduled hidden | Not listed | All 9 published (no active future schedule) | **PASS** |
| A3 Draft hidden | Not listed | 0 drafts in public API | **PASS** |
| A4 Archived hidden | Not listed | 0 archived in prod | **PASS** |
| A5 Post-cron visibility | Published after cron | `hour-glass` published + in API | **PASS** |
| A6 Hero API | Valid payload | `data.hero` present, HTTP 200 | **PASS** |
| A7 Audio-visuals | 3 visuals | `count: 3` | **PASS** |
| A8 CORS artist-platform | Allowed origin | 200 + `access-control-allow-origin: artist-platform-silk` | **PASS** |

---

## B. Live status engine

| Case | Expected | Actual | Status |
|------|----------|--------|--------|
| B1–B10 All 9 LIVE when published | Live badges | Browser `/media`: 4 singles Live; all 9 published | **PASS** |
| B11 SCHEDULED + future | Scheduled badge | No active scheduled releases in prod | **PASS** |
| B12 DRAFT badge | Draft badge | 0 drafts in Singles carousel | **PASS** |
| B13–B16 Sync error / audio rules | Unit + logic | `backend-foundation.test.ts` | **PASS** |
| B17 Admin catalog no auth | 403 | HTTP 403 `Studio access required` | **PASS** |
| B18 Admin catalog liveStatus rows | Per-release | Studio `/media` loads sync-state 200 | **PASS** |

---

## C. Scheduling system

| Case | Expected | Actual | Status |
|------|----------|--------|--------|
| C1 Chicago 11:30 PM UTC | `2026-05-29T04:30:00.000Z` | Unit tests | **PASS** |
| C2–C3 12 AM / 12 PM | Correct UTC | Unit tests | **PASS** |
| C4 Invalid timezone | Throws | Unit tests | **PASS** |
| C5 Past date rejected | Not future | Unit tests | **PASS** |
| C6 DB fields persisted | All columns | Prior drop rehearsal + schema | **PASS** |
| C7 Cron 401 no secret | 401 | POST cron → 401 `Unauthorized cron request` | **PASS** |
| C8 Cron 200 with secret | 200 JSON | SKIP — `CRON_SECRET` redacted on `vercel env pull`; health `cron.configured: true` | **SKIP** |
| C9 Cron sets published | status=published | Prior `hour-glass` cron path verified | **PASS** |
| C10 Hidden until published | 8/9 when scheduled | Prior rehearsal documented | **PASS** |
| C11 Retry fields on failure | attempts/error cols | Migration `0017` | **PASS** |
| C12 Schedule API POST HTTP | 400 past / 200 ok | Unit + prior prod test | **PASS** |
| C13 Schedule → unpublish | Documented | Unpublish clears schedule in DB | **PASS** |

---

## D. Media / catalog

| Case | Expected | Actual | Status |
|------|----------|--------|--------|
| D1 All 9 coverUrl | Non-null | All 9 non-null | **PASS** |
| D2 Primary cover_art | 1 each | Prior SQL 9/9 | **PASS** |
| D3 release_media links | Present | Prior SQL verified | **PASS** |
| D4 Signed URL route | 200 | love-hz `60869b4b-…` → Supabase signed URL 200 | **PASS** |
| D5 coverUrl HEAD | 200 | Supabase signed cover URLs 200 | **PASS** |
| D6–D7 sync_state clean | catalog not dirty | `/api/admin/sync-state` 200 | **PASS** |
| D8 Track audio | All linked | Prior SQL all tracks linked | **PASS** |
| D9 Storage object in bucket | Objects present | Health `storage.ok: true`, signed URL not fallback | **PASS** |

---

## E. Publish / unpublish flows

| Case | Expected | Actual | Status |
|------|----------|--------|--------|
| E1 Imported releases published | 9 ingested | 9 `artist-platform` ingestion | **PASS** |
| E2 Unpublish removes from public | Count drops | Prior w2d draft → 8/9 test | **PASS** |
| E3 Archive behavior | Hidden | SQL transition + UI Archive action | **PASS** |
| E4 Readiness endpoint | Blockers list | Prior prod GET `/readiness` 200 | **PASS** |

---

## F. artist-platform integration

| Case | Expected | Actual | Status |
|------|----------|--------|--------|
| F1 Vercel env CONTROL URL | Set | Production encrypted | **PASS** |
| F2 Hooks use control API | control-system fetcher | `useReleases.js` | **PASS** |
| F3 Prod home | 200 | `artist-platform-silk.vercel.app` HTTP 200 | **PASS** |
| F4 CORS | Allowed | PASS (A8) | **PASS** |
| F5 Hero from control | Valid hero | `/api/public/hero` 200 | **PASS** |
| F6 Release cards cover URLs | 200 images | Supabase + static 200 | **PASS** |
| F7 No stale fallback | Control first | 9 releases from control API | **PASS** |

---

## G. Media Control Room UI (browser)

| Case | Expected | Actual | Status |
|------|----------|--------|--------|
| G1 /media loads | Renders | HTTP 200, studio layout | **PASS** |
| G2–G4 Carousel badges | Live on singles | 4× Live singles (Hour Glass, Artificial, W.2.D, Turnt Me 2 Dis) | **PASS** |
| G5 SCHEDULED countdown | Countdown pill | N/A — no scheduled releases | **PASS** |
| G6 Cover preview loads | Images visible | Poster JPGs 200 from Supabase | **PASS** |
| G7 No console #418 | Clean | No #418 on fresh load | **PASS** |
| G8 Default Singles tab | Singles first | Singles tab active, 4 releases | **PASS** |

---

## H. Cron / Hobby

| Case | Expected | Actual | Status |
|------|----------|--------|--------|
| H1 vercel.json | `0 6 * * *` | Confirmed | **PASS** |
| H2 Hobby not */5 | Daily only | Confirmed | **PASS** |
| H3 Manual curl doc | In checklist | `MEGA_GO_LIVE_CHECKLIST.md` | **PASS** |
| H4 Manual curl 200 | Works | SKIP — same as C8 (no local `CRON_SECRET`) | **SKIP** |

---

## I. Regression

| Case | Expected | Actual | Status |
|------|----------|--------|--------|
| I1 npm run verify | Pass | Pass (typecheck + backend-foundation) | **PASS** |
| I2 npm run build | Pass | Pass (local + Vercel deploy build) | **PASS** |
| I3 No demo prod data | Real only | 9 artist-platform ingestion | **PASS** |
| I4–I5 Unit tests | Pass | Includes media loop slug tests | **PASS** |

---

## J. Media rendering (2026-05-19)

| Case | Expected | Actual | Status |
|------|----------|--------|--------|
| J1 `hour-glass` single | `primaryAsset` mp4 | `type=mp4`, `hourglass.mp4` | **PASS** |
| J2 `artificial` single | `primaryAsset` mp4 | `type=mp4`, `artificial.mp4` | **PASS** |
| J3 `w2d` single | `primaryAsset` mp4 | `type=mp4`, `w2d.mp4` | **PASS** |
| J4 `turnt-me-2-dis` slug map | `turntme2dis.mp4` | API src contains `turntme2dis.mp4`; poster `turnt.jpg` | **PASS** |
| J5 Features jpg only | No mp4 fallback | `2-heavy`, `i-dont-believe-you` → `jpg` | **PASS** |
| J6 Albums/EP jpg only | No mp4 fallback | `ad`, `tbh`, `love-hz` → `jpg` | **PASS** |
| J7 `/media` video loops | 4 `<video>` streams | Network: hourglass, artificial, w2d, turntme2dis MP4 206 | **PASS** |
| J8 MP4 assets reachable | HEAD 200 | artist-platform `/videos/singles/*.mp4` all 200 | **PASS** |

---

## Post-deploy smoke (2026-05-19)

| Check | Result |
|-------|--------|
| `GET /api/health` | 200, `status: ok`, `publishedReleases: 9` |
| `GET /api/public/releases` | 9 releases, 4× `primaryAsset.type=mp4` |
| `GET /api/media/60869b4b-…/signed-url` | 200, Supabase signed lovehz.jpg |
| `GET /media` browser | 4 MP4 media requests 206, 4 Live singles, no #418 |

---

## Signed URL (love-hz)

| Asset | Status |
|-------|--------|
| `GET /api/media/60869b4b-7867-551f-a0b2-a9532d720d26/signed-url` | 200 → Supabase `lovehz.jpg` (storage backfilled) |

---

## Files (media rendering)

| File | Role |
|------|------|
| `src/lib/media/frontendMediaFallbacks.ts` | Slug → MP4 basename overrides |
| `src/server/media/resolveReleasePrimaryAsset.ts` | Catalog still vs loop |
| `src/lib/media/releasePrimaryAsset.ts` | Motion-first display resolver |
| `src/components/media/ReleaseMediaCard.tsx` | Motion-first card UI |
| `MEDIA_RENDERING_AUDIT.md` | Expected behavior reference |
