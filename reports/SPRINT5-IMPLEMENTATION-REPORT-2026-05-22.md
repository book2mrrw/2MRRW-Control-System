# Sprint 5 Implementation Report — P4.5 demo catalog gate

**Date:** 2026-05-23  
**Audit source:** `2MRRW-Platform-Architecture-Audit-2026-05-22.zip` (P4.5)  
**Sprint 4 baseline:** control `2304c9e`, storefront `4d18dc2`

---

## Commits

| Repo | SHA | Message |
|------|-----|---------|
| Control | _(see git log)_ | `fix(p5): public catalog 503 when durable empty` |
| Storefront | — | No code change (P4.1–P4.4 completed in Sprint 4) |

---

## Task status

| ID | Task | Status | Notes |
|----|------|--------|-------|
| P4.5 | Remove demo catalog fallback → 503 | Done | `GET /api/public/releases` returns 503 `{ reason: catalog_unavailable, demoFallbackDisabled: true }` when durable read times out or is empty |
| P4.1–P4.4 | Performance (prior sprint) | Done | Sprint 4 commits |

---

## Behavior change

When `getLatestReleasesDurable` returns no rows within 5s, the public catalog endpoint no longer serves `buildStudioCatalogFallback()` demo releases. Storefront `fetchControlSystemReleases` already treats non-2xx as empty and falls back to static `fallbackReleases` in page data.

---

## Build & test results

| Repo | Command | Result |
|------|---------|--------|
| Control | `npm run typecheck` | Pass |
| Control | `npm run build` | Pass |

---

## Migrations

No new SQL migrations this sprint.

```sql
-- (none)
```

---

## Operator follow-up

1. Ensure production catalog has published releases so `/api/public/releases` returns 200.
2. Monitor 503 rate on `/api/public/releases` after deploy (indicates DB/sync outage or empty catalog).

---

## Remaining gaps

| Item | Notes |
|------|-------|
| `controlCatalogPayload` studio fallback | Internal/admin paths only; not public API |
| `media_playback_progress` reconcile | Ops-only (P2.7) |
| Wire `fetchSignedUrlsBatch` in album UI | Optional perf follow-up |
