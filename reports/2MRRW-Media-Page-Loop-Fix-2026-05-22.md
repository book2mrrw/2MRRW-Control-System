# 2MRRW Media Page Loop Fix — React #185 — 2026-05-22

## Summary

Fixed **Maximum update depth exceeded** (React error #185) on `/media` (Media Control Room) without reverting the SSE singleton in `useRealtimeEvents`.

## Root cause

Two compounding issues:

### 1. Unstable `useSyncExternalStore` snapshot (primary)

`useRealtimeEvents.getSnapshot()` returned a **new object** `{ events, connected }` on every call. React compares snapshots with `Object.is`; a fresh object on each read makes the store appear to change every render → subscribe → re-render → **infinite loop** (#185).

Heartbeats and connection events called `notifyStore()` often, which amplified re-renders across all SSE consumers.

### 2. SSE replay + media handler (secondary)

`useMediaSync` reacted to `events[0]` whenever the `events` array reference changed. On mount, a buffered media event at `events[0]` called `refreshCatalog` + `refreshSync`. Without deduplication, strict remounts or duplicate effect runs could re-fire the same event.

`ReleaseManagementSection` also synced `selectedId` in an effect that depended on `selectedId`, causing extra render cycles when rows updated after catalog refresh.

## Fix

| File | Change |
|------|--------|
| `useRealtimeEvents.ts` | Cache snapshot object; only recreate when `events` ref or `connected` changes. SSE singleton unchanged. |
| `useMediaSync.ts` | Ref for callback (no `onMediaEvent` in effect deps); dedupe by event key before `setState` / handler. |
| `MediaSyncWorkspace.tsx` | Refs for `onUploadComplete` / `refreshSync` so `handleMediaSyncEvent` stays stable. |
| `MediaSyncReleaseStudio.tsx` | `setSelectedId` functional updater; effect deps only `[rows]`. |

## Verification

- `npm run build` — success, zero TypeScript errors
- Single `useMediaSync` in `MediaLibrary`; `ReleaseManagementSection` receives `syncConnected` only (no duplicate hook)

## Commit

`fix: resolve React #185 render loop on media page`
