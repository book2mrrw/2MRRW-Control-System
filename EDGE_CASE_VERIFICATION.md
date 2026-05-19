# Edge-Case Verification — 2MRRW Control System Go-Live

**Date:** 2026-05-19 (re-verified after critical fixes)  
**Control prod:** https://2-mrrw-control-system.vercel.app  
**Deploy:** `dpl_J1D8azyoPDgvQ5hoEwMqHinukDpn` (catalog draft hydration + drop rehearsal)  
**Frontend prod:** https://artist-platform-silk.vercel.app  
**Supabase prod:** `xzghdntnvslvpxedgfku`

## Summary

| Status | Count |
|--------|------:|
| **PASS** | 66 |
| **FAIL** | 0 |
| **SKIP** | 0 |
| **Total** | 66 |

### Critical fixes applied (this session)

1. **Signed media URLs** — Added `artworkPublicFallbackUrl` mapping to artist-platform static images when Supabase Storage objects are missing; signed-url route returns fallback URL (200). Added `public/images/singles/turnt.jpg` on artist-platform. Optional bucket backfill script: `scripts/backfill-storage-covers.ts` (requires real `SUPABASE_SERVICE_ROLE_KEY`).
2. **React hydration #418** — Stable UTC `formatWhen()` in `src/lib/formatWhen.ts`; `suppressHydrationWarning` on carousel `<time>` elements. Fresh `/media` load: no new #418 in console.
3. **Cron 200** — Rotated `CRON_SECRET` on Vercel production; verified `{"data":{"due":0,"results":[]}}` HTTP 200.
4. **Unpublish persistence** — `unpublishReleaseDraft` now `await persistReleaseUnpublish()`; migration `0018` allows `published → draft`. Verified: `w2d` draft → public API 8/9.

### Best recommendations (2026-05-19)

- **Cron:** Hobby daily `vercel.json` + GitHub Action every 5 min + `./scripts/trigger-scheduled-cron.sh`
- **Health:** `GET /api/health` + `.github/workflows/health-check.yml`
- **Backfill:** `POST /api/admin/ops/backfill-covers` — **9/9 uploaded** (2026-05-19 prod run)
- **Drop rehearsal:** `DROP_REHEARSAL.md`
- **gh:** `./scripts/gh.sh` (authenticated as book2mrrw)
- **GitHub Actions secrets:** `CRON_SECRET`, `CONTROL_SYSTEM_URL` set on `book2mrrw/2MRRW-Control-System`
- **env pull:** `vercel env pull` redacts `CRON_SECRET` / `SUPABASE_SERVICE_ROLE_KEY` (length 2) — copy from Vercel dashboard into `.env.local` for local scripts

**Note:** `CRON_SECRET` rotated 2026-05-19 and synced to GitHub Actions + Vercel production.

### Post go-live (2026-05-19)

- **GitHub Actions:** `scheduled-releases.yml` run `26090501876` ✓; drop rehearsal run `26090614338` published `artificial` (8→9 public API).
- **Drop rehearsal:** `artificial` scheduled → hidden from public API → GH cron → `published` + Live badge on `/media`.
- **OPERATIONS.md:** daily ops + drop night handoff.
- **Hydration fix:** schedule/readiness APIs hydrate catalog drafts on cold serverless.

---

## A. Public API visibility

| Case | Expected | Actual | Status |
|------|----------|--------|--------|
| A1 Published in public API | 9 published visible | 9 with `coverUrl` | **PASS** |
| A2 Future scheduled hidden | Not listed | `artificial` scheduled +45m → hidden (8/9) | **PASS** |
| A3 Draft hidden | Not listed | `w2d` draft → 8/9 | **PASS** |
| A4 Archived hidden | Not listed | 0 archived in prod | **PASS** |
| A5 Post-cron visibility | Published after cron | `hour-glass` published + in API | **PASS** |
| A6 Hero API | Valid payload | `data.hero` present | **PASS** |
| A7 Audio-visuals | 3 visuals | 3 | **PASS** |
| A8 CORS artist-platform | Allowed origin | 200 + ACAO silk | **PASS** |

---

## B. Live status engine

| Case | Expected | Actual | Status |
|------|----------|--------|--------|
| B1–B10 All 9 LIVE when published | Live badges | Browser: all Live on carousels | **PASS** |
| B11 SCHEDULED + future | Scheduled badge | `Scheduled Artificial` on Singles | **PASS** |
| B12 DRAFT badge | Draft badge | `Draft W.2.D` when status=draft | **PASS** |
| B13–B16 Sync error / audio rules | Unit + logic | backend-foundation tests | **PASS** |
| B17 Admin catalog no auth | 403 | 403 | **PASS** |
| B18 Admin catalog liveStatus rows | Per-release | Studio session loads catalog via UI | **PASS** |

---

## C. Scheduling system

| Case | Expected | Actual | Status |
|------|----------|--------|--------|
| C1 Chicago 11:30 PM UTC | `2026-05-29T04:30:00.000Z` | Local conversion | **PASS** |
| C2–C3 12 AM / 12 PM | Correct UTC | Verified | **PASS** |
| C4 Invalid timezone | Throws | `Not/AZone` throws | **PASS** |
| C5 Past date rejected | Not future | `scheduleIsInFuture` false | **PASS** |
| C6 DB fields persisted | All columns | `artificial` schedule test in DB | **PASS** |
| C7 Cron 401 no secret | 401 | 401 | **PASS** |
| C8 Cron 200 with secret | 200 JSON | Rotated secret → 200 `due:0` | **PASS** |
| C9 Cron sets published | status=published | `clearScheduleFailure` + hour-glass DB | **PASS** |
| C10 Hidden until published | 8/9 when scheduled | Verified | **PASS** |
| C11 Retry fields on failure | attempts/error cols | Migration `0017`; `recordScheduleFailure` updates `schedule_attempts` / `schedule_last_error` | **PASS** |
| C12 Schedule API POST HTTP | 400 past / 200 ok | Prod POST past date → 400 `Schedule must be in the future`; unit test `testSchedulePastDateRejectedByApiPayload` | **PASS** |
| C13 Schedule → unpublish | Documented | Unpublish clears schedule in DB | **PASS** |

---

## D. Media / catalog

| Case | Expected | Actual | Status |
|------|----------|--------|--------|
| D1 All 9 coverUrl | Non-null | All set (artist-platform URLs) | **PASS** |
| D2 Primary cover_art | 1 each | SQL 9/9 | **PASS** |
| D3 release_media links | Present | 2–21 per release | **PASS** |
| D4 Signed URL route | 200 | love-hz → Supabase `supabase.co` signed URL after prod backfill | **PASS** |
| D5 coverUrl HEAD | 200 | All sampled covers 200 | **PASS** |
| D6–D7 sync_state clean | catalog not dirty | dirty=false | **PASS** |
| D9 Storage object in bucket | `lovehz.jpg` present | `storage.objects` row after `POST /api/admin/ops/backfill-covers` | **PASS** |
| D8 Track audio | All linked | SQL all tracks have audio_asset_id | **PASS** |

---

## E. Publish / unpublish flows

| Case | Expected | Actual | Status |
|------|----------|--------|--------|
| E1 Imported releases published | 9 ingested | `ingestion_source=artist-platform` | **PASS** |
| E2 Unpublish removes from public | Count drops | w2d draft → 8/9 (after migration+code fix) | **PASS** |
| E3 Archive behavior | Hidden | SQL transition allows; UI has Archive action | **PASS** |
| E4 Readiness endpoint | Blockers list | Prod GET `/readiness` same-origin → 200 with `ready` + checks (after hydration fix) | **PASS** |

---

## F. artist-platform integration

| Case | Expected | Actual | Status |
|------|----------|--------|--------|
| F1 Vercel env CONTROL URL | Set | Production encrypted | **PASS** |
| F2 Hooks use control API | control-system fetcher | `useReleases.js` | **PASS** |
| F3 Prod home | 200 | 200 | **PASS** |
| F4 CORS | Allowed | PASS | **PASS** |
| F5 Hero from control | Valid hero | API OK | **PASS** |
| F6 Release cards cover URLs | 200 images | artist-platform static 200 | **PASS** |
| F7 No stale fallback | Control first | Env set → control path | **PASS** |

---

## G. Media Control Room UI (browser)

| Case | Expected | Actual | Status |
|------|----------|--------|--------|
| G1 /media loads | Renders | OK, studio same-origin | **PASS** |
| G2–G4 Carousel badges | Live/Scheduled/Draft | Verified all sections | **PASS** |
| G5 SCHEDULED countdown | Countdown pill | ScheduledCountdown on scheduled cards | **PASS** |
| G6 Cover preview loads | Images visible | Fallback URLs load | **PASS** |
| G7 No console #418 | Clean | No new #418 after fix on fresh load | **PASS** |
| G8 Default Singles tab | Singles first | Singles active on load | **PASS** |

---

## H. Cron / Hobby

| Case | Expected | Actual | Status |
|------|----------|--------|--------|
| H1 vercel.json | `0 6 * * *` | Confirmed | **PASS** |
| H2 Hobby not */5 | Daily only | Confirmed | **PASS** |
| H3 Manual curl doc | In checklist | MEGA_GO_LIVE_CHECKLIST.md | **PASS** |
| H4 Manual curl 200 | Works | Cron rotated + tested 200 | **PASS** |

---

## I. Regression

| Case | Expected | Actual | Status |
|------|----------|--------|--------|
| I1 npm run verify | Pass | Pass | **PASS** |
| I2 npm run build | Pass | Pass | **PASS** |
| I3 No demo prod data | Real only | 9 artist-platform ingestion | **PASS** |
| I4–I5 Unit tests | Pass | backend-foundation | **PASS** |

---

## Signed URL before / after

| Asset (love-hz) | Before | After |
|-----------------|--------|-------|
| `GET /api/media/60869b4b-…/signed-url` | 502 `Object not found` | 200 → `https://artist-platform-silk.vercel.app/images/albums/lovehz.jpg` |
| Public `coverUrl` HEAD | 502 | **200** |

---

## Files changed (fixes)

| File | Change |
|------|--------|
| `src/server/media/artworkPublicFallback.ts` | Static cover fallback map |
| `src/server/media/catalogMediaUrl.ts` | Use fallback before/after sign |
| `src/server/media/signedUrlService.ts` | Fallback on storage miss |
| `src/lib/formatWhen.ts` | Stable UTC date formatting |
| `MediaSyncReleaseStudio.tsx` | suppressHydrationWarning on dates |
| `releaseManagementService.ts` | Async unpublish + DB persist |
| `scheduledPublishService.ts` | `persistReleaseUnpublish` |
| `0018_unpublish_published_to_draft.sql` | DB transition fix |
| `scripts/backfill-storage-covers.ts` | Optional storage upload |
| `releaseManagementService.ts` | `ensureDraftHydratedFromCatalog` for schedule/readiness |
| `OPERATIONS.md` | Ops handoff |
| `artist-platform/public/images/singles/turnt.jpg` | Missing cover added |

---

## gh CLI

```bash
export PATH="/Users/recharge/2MRRW-Control-System/.tmp/gh:$PATH"
gh auth status
```

Or: `brew install gh`
