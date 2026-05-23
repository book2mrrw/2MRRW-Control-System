# Sprint 5 Implementation Report — P4.5 demo catalog gate

**Date:** 2026-05-23  
**Audit source:** `2MRRW-Platform-Architecture-Audit-2026-05-22.zip` (P4.5)  
**Sprint 4 baseline:** control `2304c9e`, storefront `4d18dc2`

---

## Commits

| Repo | SHA | Message |
|------|-----|---------|
| Control | `7fcf4d3fbe2531a6dfbdc1e7600a06b3b2a3fcdd` | `fix(p5): public catalog 503 when durable empty` |
| Storefront | `4d18dc2ef4bb1a459bcdbba577fc6913ef6ab3fe` | _(no Sprint 5 code change — P4.5 is control-only)_ |

**Note:** Sprints 1–4 commits on `main` may still be **unpushed** to `origin/main` (control ahead 6, storefront ahead 4 as of handoff). Push before relying on GitHub/Vercel auto-deploy from remote.

---

## Production deploy

| App | URL | Deployment | Git SHA |
|-----|-----|------------|---------|
| Control | https://2mrrw-control-system.vercel.app | `dpl_8DanhgyV1SGEC7sb4cb7AzREBTZy` | `7fcf4d3` |
| Storefront | https://artist-platform-silk.vercel.app | `dpl_4UL1dHuuG1DWLwbQbidQH4foAuUL` | `4d18dc2` |

---

## Platform checkpoint

Latest recovery tag (control repo): **`checkpoint-20260523-000652`**

Created via `npm run foundation:checkpoint-platform` during Sprint 5 hardening. Older tags: `checkpoint-20260522-234935`, etc.

---

## Task status

| ID | Task | Status | Notes |
|----|------|--------|-------|
| P4.5 | Remove demo catalog fallback → 503 | **Done** | `GET /api/public/releases` returns 503 `{ reason: catalog_unavailable, demoFallbackDisabled: true }` when durable read times out or is empty |
| Entitlements read path | **Done (Sprint 2)** | Documented | Storefront stream uses `userCanStreamProduct` → `unified-entitlements.js`; parity at `/api/admin/diagnostics/entitlements-parity` |
| Deploy both | **Done** | See table above |
| Platform checkpoint | **Done** | Tag `checkpoint-20260523-000652` |
| Small P2/P3 gaps | **Deferred** | See backlog below |

---

## Behavior change (P4.5)

When `getLatestReleasesDurable` returns no rows within 5s, the public catalog endpoint **no longer** serves `buildStudioCatalogFallback()` demo releases (which could imply playable catalog without DB entitlements).

Storefront `fetchControlSystemReleases` treats non-2xx as empty and may still use **static page `fallbackReleases`** for marketing layout — that is frontend-only and does not grant `/api/library/stream`.

Internal admin paths may still use `buildStudioCatalogFallback()` via `controlCatalogPayload.ts` (not public API).

---

## Build & test results

| Repo | Command | Result |
|------|---------|--------|
| Control | `npm run typecheck` | Pass |
| Control | `npm run build` | Pass |
| Storefront | `npm run typecheck` / build | Pass (no code delta) |

`npm run foundation:verify-platform` **fails** locally: `tests/backend-foundation.test.ts` top-level `await` incompatible with tsx CJS. Use smoke matrix below for prod verification.

---

## Production smoke (2026-05-23)

| Check | Result |
|-------|--------|
| `GET /api/health/basic` | 200, `ok: true` |
| `GET /api/health/storage` | 200, `ok: true` |
| `GET /api/public/releases?limit=100` | 200, **9** published releases |
| Storefront `/` | 200 |
| `GET /api/library/stream?slug=love-hz` (no auth) | **401** Unauthorized |

---

## Migrations

No new SQL migrations this sprint.

```sql
-- (none)
```

---

## Operator follow-up

1. **Push** both repos if `git status` shows `ahead` on `main`.
2. Ensure production catalog has published releases so `/api/public/releases` returns 200 (not 503).
3. Confirm storefront Supabase migrations from Sprints 2–3 are applied (see `MIGRATIONS-TO-APPLY.sql` in Sprint 2/3 zips).
4. Monitor 503 rate on `/api/public/releases` (indicates DB/sync outage or empty catalog).

---

## Remaining backlog

| Item | Notes |
|------|-------|
| `controlCatalogPayload` studio fallback | Internal/admin only |
| `media_playback_progress` reconcile | Ops-only (P2.7) |
| Wire `fetchSignedUrlsBatch` in album UI | Optional perf |
| Fix `backend-foundation.test.ts` top-level await | Unblocks `foundation:verify-platform` |
| Git push S1–S5 commits | If not yet on `origin/main` |
