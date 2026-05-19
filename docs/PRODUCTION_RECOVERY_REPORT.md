# Production Recovery Report

**Date:** 2026-05-19  
**Production URL:** https://2-mrrw-control-system.vercel.app  
**Status:** STABILIZED (post-deploy smoke required)

## Problem

Root layout blocked every request on `buildControlCatalogPayload()` (full catalog + per-track signed URLs). Duplicate hydration on many routes, full-table `media_assets` scans, unpinned `next`/`@supabase/supabase-js`, and missing granular health probes.

## Fixes (surgical)

| Phase | Change | Files |
|-------|--------|-------|
| 1 | Health probes: `/api/health/basic`, `/db`, `/storage` | `src/app/api/health/{basic,db,storage}/route.ts` |
| 2 | Root layout: empty `initialCatalog`, removed `force-dynamic` | `src/app/layout.tsx` |
| 3 | Hydration dedupe: module-level `hydrationPromise` | `frontendReleaseIngestionService.ts` |
| 3b | Removed redundant `ensureFrontendReleaseEcosystemImported` from release/media pages; kept on `/dashboard` only | `src/app/**/page.tsx` |
| 4 | Catalog payload: cover/loop/primary only; track `previewUrl`/`audioUrl` deferred (`null`) | `controlCatalogPayload.ts` |
| 5 | Scoped `media_assets` by release/track IDs + references | `releaseCatalogService.ts`, `releaseService.ts` |
| 6 | Singleton Supabase server client | `src/server/supabase/client.ts` |
| 7 | Pin `next@16.2.6`, `@supabase/supabase-js@2.105.4` | `package.json` |
| 8 | `[recovery-timing]` logs (remove after stabilization) | `controlCatalogPayload.ts`, `releaseCatalogService.ts`, `signedUrlService.ts` |
| — | `vercel.json` framework + buildCommand restored | `vercel.json` |
| — | `force-dynamic` on `/dashboard`, `/diagnostics` (build-time timeout guard) | `dashboard/page.tsx`, `diagnostics/page.tsx` |
| — | Studio-only client catalog fetch | `CreatorReleaseSystem.tsx` |

## Before / after (observed)

| Signal | Before (estimated) | After (local/build) |
|--------|------------------|---------------------|
| Root layout | Blocked on full catalog + N× track signing | Instant (`initialCatalog=[]`) |
| `fetchDurableReleaseCatalog` (diagnostics SSG) | ~7s+ (full `media_assets` table) | Scoped queries; diagnostics `force-dynamic` |
| Build | Failed / >60s on `/diagnostics` | **Pass** (~19s total) |
| Health granularity | Single `/api/health` | basic / db / storage split |

## Deploy

```bash
npx vercel --prod --yes
```

## Post-deploy smoke

```bash
BASE=https://2-mrrw-control-system.vercel.app
curl --max-time 20 -sS -o /dev/null -w "%{http_code} %{time_total}s\n" "$BASE/api/health/basic"
curl --max-time 20 -sS -o /dev/null -w "%{http_code} %{time_total}s\n" "$BASE/api/health/db"
curl --max-time 20 -sS -o /dev/null -w "%{http_code} %{time_total}s\n" "$BASE/api/health/storage"
curl --max-time 20 -sS -o /dev/null -w "%{http_code} %{time_total}s\n" "$BASE/api/public/releases?limit=5"
curl --max-time 20 -sS -o /dev/null -w "%{http_code} %{time_total}s\n" -I "$BASE/media"
```

## Follow-up

- Remove `[recovery-timing]` `console.time`/`timeEnd` after 24–48h stable prod.
- Re-enable track URLs via `/api/media/[assetId]/signed-url` on demand in studio UI only.
