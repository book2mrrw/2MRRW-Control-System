# 2MRRW Media Page Fix — 2026-05-22

## Summary

Restored `/media` (Media Control Room) after Phase 1 `useMediaSync` consolidation in commit `3fbb62c` removed the parent hook while leaving a duplicate child subscription with an unstable callback.

## What broke (3fbb62c vs 5befa0f)

| Location | 5befa0f (working) | 3fbb62c (broken) |
|----------|-------------------|------------------|
| `MediaLibrary` | `useMediaSync(() => { onUploadComplete(); refreshSync(); })` — SSE drove catalog refresh + sync-state poll | Hook removed; only `handleUploadComplete` for direct uploads |
| `ReleaseManagementSection` | `useMediaSync(() => onUploadComplete?.())` — second SSE subscriber | Same hook kept; `onUploadComplete` became `handleUploadComplete` |
| Net effect | Two `useMediaSync` instances (parent + child), but parent owned `refreshSync` on SSE | One child hook with **inline** `() => onUploadComplete?.()` recreated every render |

### Root cause

`useMediaSync` runs its effect when `onMediaEvent` identity changes:

```ts
useEffect(() => { ... onMediaEvent?.(latest); }, [events, onMediaEvent]);
```

`ReleaseManagementSection` passed a new inline function each render. With persisted SSE `events[0]`, each render re-fired the handler → `refreshCatalog` + `refreshSync` → re-render loop → **page crash / freeze**.

Removing `MediaLibrary`'s hook also dropped library-level SSE handling (`refreshSync` on remote media events) for hero/vault/press tabs.

## What changed (fix)

1. **`MediaSyncWorkspace.tsx` — `MediaLibrary`**
   - Restored **one** `useMediaSync` with stable `handleMediaSyncEvent` → `handleUploadComplete` (`refreshCatalog` + `refreshSync`).
   - Passes `syncConnected` into `ReleaseManagementSection` for the realtime pill UI.

2. **`MediaSyncReleaseStudio.tsx` — `ReleaseManagementSection`**
   - Removed duplicate `useMediaSync` import/call.
   - Accepts `syncConnected: boolean` from parent.

3. **`useMediaSync.ts`**
   - Stores `onMediaEvent` in a ref so the effect depends only on `events`, not callback identity (prevents future render loops).

4. **`useRealtimeEvents.ts`**
   - **Unchanged** — SSE singleton / ref-count behavior from `3fbb62c` retained.

## Verification

- `npm run build` — success, zero TypeScript errors
- Scope: media sync components + `useMediaSync` hook only (no auth/stripe/layout/client.ts)

## Commits

- Fix commit: `fix: restore media page render after useMediaSync consolidation`
