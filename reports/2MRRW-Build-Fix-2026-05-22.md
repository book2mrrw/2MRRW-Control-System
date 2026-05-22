# 2MRRW Build Fix — Vercel deployment — 2026-05-22

## Vercel symptom (reported)

`npm run build` exited with **1** on Vercel.

## Local reproduction (this run)

| Attempt | Env | Exit |
|---------|-----|------|
| 1 | Default (`.env.local`, `.env.production.local`) | **0** |
| 2 | Second clean `.next` build | **0** |
| 3 | `CI=1` + `VERCEL=1`, env files moved aside | **0** |
| 4 | Fresh temp dir `npm ci` + `npm run build` | **0** |
| 5 | `npx tsc --noEmit` | **0** |

**No compile error, TypeScript error, or `Failed to compile` output was captured locally.**

Full successful `npm run build` stdout/stderr is in `reports/build-fix-2026-05-22/npm-run-build-full.log`.

## Git state at verification

- **HEAD:** `e8ec9da` — `fix: resolve React #185 render loop on media page — full audit`
- **Branch:** `main`, synced with `origin/main`
- Build-related runtime fix already on `main`: stable `SERVER_SNAPSHOT` in `src/hooks/sync/useRealtimeEvents.ts` (commit `e8ec9da`)

## Application code changed in this build-fix task

**None.** Local and clean-install builds pass on current `main`; no additional source patch was required to reach exit 0.

## Related prior fixes (already on `main`)

| File | Change |
|------|--------|
| `src/hooks/sync/useRealtimeEvents.ts` | Cached client snapshot + stable `SERVER_SNAPSHOT` for `useSyncExternalStore` |
| `src/hooks/sync/useMediaSync.ts` | Media event dedupe + ref-based handler |
| `src/components/control/MediaSyncWorkspace.tsx` | Stable callbacks / refs |
| `src/components/control/MediaSyncReleaseStudio.tsx` | `selectedId` effect deps `[rows]` only |

## If Vercel still shows exit 1

1. Confirm the deployment commit is **`e8ec9da` or later** (not an older failed deploy).
2. Open the Vercel build log and find the **first** `Error:` / `Failed to compile` / `Type error` line (install phase vs build phase).
3. Redeploy with **Clear build cache** if the log references stale artifacts.

## Deliverable

Zip: `/Users/recharge/Downloads/2MRRW-Build-Fix-2026-05-22.zip`
