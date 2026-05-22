# 2MRRW Media Page — React #185 Full Audit — 2026-05-22

## Executive summary

**Maximum update depth exceeded** (React error #185) on `/media` (Media Control Room via `CreatorReleaseSystem` → `MediaLibrary`) was caused primarily by an **unstable `useSyncExternalStore` snapshot** in `useRealtimeEvents`, with secondary amplification from SSE replay into `refreshCatalog` / `refreshSync` and a `selectedId` effect dependency cycle in `ReleaseManagementSection`.

Fix is in commits `3fbb62c` → `b15f8be` → `2309f24`, with an additional SSR hardening in this audit (`SERVER_SNAPSHOT` constant).

---

## Step 1 — Last 3 media-related commits & files touched

| Commit | Message | Files |
|--------|---------|-------|
| `3fbb62c` | fix: SSE singleton + remove duplicate useMediaSync in workspace | `src/components/control/MediaSyncWorkspace.tsx`, `src/hooks/sync/useRealtimeEvents.ts` |
| `b15f8be` | fix: restore media page render after useMediaSync consolidation | `reports/2MRRW-Media-Page-Fix-2026-05-22.md`, `reports/2MRRW-Media-Page-Fix-README.txt`, `src/components/control/MediaSyncReleaseStudio.tsx`, `src/components/control/MediaSyncWorkspace.tsx`, `src/hooks/sync/useMediaSync.ts` |
| `2309f24` | fix: resolve React #185 render loop on media page | `reports/2MRRW-Media-Page-Loop-Fix-2026-05-22.md`, `reports/2MRRW-Media-Page-Loop-Fix-README.txt`, `src/components/control/MediaSyncReleaseStudio.tsx`, `src/components/control/MediaSyncWorkspace.tsx`, `src/hooks/sync/useMediaSync.ts`, `src/hooks/sync/useRealtimeEvents.ts` |

**Recent HEAD (3 commits):**

```
2309f24 fix: resolve React #185 render loop on media page
b15f8be fix: restore media page render after useMediaSync consolidation
3fbb62c fix: SSE singleton + remove duplicate useMediaSync in workspace
```

---

## Step 2–3 — Effect inventory & static trace (no loop-debug logs committed)

Route: `OperationalShell` → `CreatorReleaseSystem` (`pathname.startsWith("/media")` → `page === "media"`) → `MediaLibrary` → single `useMediaSync` → `useRealtimeEvents`.

### `useRealtimeEvents.ts` (1 effect)

| Effect | Deps | Loop risk |
|--------|------|-----------|
| SSE refCount connect/disconnect | `[]` | None — mount once per consumer |

**Primary #185 cause (pre-2309f24):** `getSnapshot()` returned `return { events, connected }` — **new object every call**. `useSyncExternalStore` uses `Object.is` on snapshots; unstable identity ⇒ “store changed” every render ⇒ subscribe churn ⇒ infinite re-render (#185). Heartbeats amplified via `notifyStore()` even when `connected` was already `true`.

**Fix:** Cache `cachedSnapshot`; recreate only when `events` array ref or `connected` boolean changes.

**Audit addition:** `getServerSnapshot()` now returns stable `SERVER_SNAPSHOT` constant (avoids new object per SSR/hydration read).

### `useMediaSync.ts` (1 effect)

| Effect | Deps | Loop risk |
|--------|------|-----------|
| React to `events[0]` media types | `[events]` | Was secondary: each new `events` ref fired handler → `refreshCatalog` |

**Fix:** Dedupe by `mediaEventKey()`; `onMediaEventRef` updated during render (not in effect deps).

### `MediaSyncWorkspace.tsx` (2 effects in tree)

| Location | Effect | Deps | Loop risk |
|----------|--------|------|-----------|
| `HeroControlSection` | `loadHero()` | `[loadHero]` | None — `loadHero` is `useCallback([])` |
| `MediaLibrary` | `refreshSync()` | `[refreshSync]` | None — stable callback |

**Fix:** `onUploadCompleteRef` / `refreshSyncRef` so `handleMediaSyncEvent` and `handleUploadComplete` are stable (`useCallback([])`); avoids re-subscribing media handler chain when parent `refreshCatalog` identity is stable (it is — `useCallback([])` in `CreatorReleaseSystem`).

### `MediaSyncReleaseStudio.tsx` (4 effects)

| Location | Effect | Deps | Loop risk |
|----------|--------|------|-----------|
| `ReleaseOverflowMenu` | pointer-down close | `[open]` | None |
| `TracklistEditor` | sync `rows` from props | `[tracks]` | None |
| `LyricsEditor` | load lyrics session | `[release.id, track.id]` | None |
| `ReleaseManagementSection` | sync `selectedId` | `[rows]` only (was `[rows, selectedId]`) | **Was tertiary:** catalog refresh → `rows` new → effect sets `selectedId` → deps included `selectedId` → extra cycles |

**Fix:** Functional `setSelectedId((current) => …)`; deps only `[rows]`.

### Reproduction note

Dev/browser not required for diagnosis: the `useSyncExternalStore` + fresh object pattern is the documented React #185 class for external stores. `npm run build` passes with zero TypeScript errors after fix.

---

## Step 4 — Exact fixes applied

1. **`useRealtimeEvents.ts`** — Stable client snapshot cache; stable `SERVER_SNAPSHOT` for server reads.
2. **`useMediaSync.ts`** — Event key dedupe; ref-based callback.
3. **`MediaSyncWorkspace.tsx`** — Ref-based upload/sync refresh handlers; one `useMediaSync` in `MediaLibrary` only.
4. **`MediaSyncReleaseStudio.tsx`** — `selectedId` effect decoupled from `selectedId` in dependency array.

**Not changed (intentionally):** SSE singleton, `refCount`, `EVENT_TYPES` listeners — correct architecture; only snapshot identity was wrong.

---

## Step 5–7 — Verification

- No `loop-debug` `console.log` in committed code.
- `npm run build` — success, zero errors.
- Single `useMediaSync` call site in `src/` (`MediaSyncWorkspace.tsx`).

---

## Which effect “looped”

**Definitive loop:** implicit re-render loop from **`useRealtimeEvents` → `useSyncExternalStore(getSnapshot)`** returning a new object reference on every snapshot read (not a single `useEffect` firing repeatedly — effects were symptoms of render churn).

**Contributing cascade (when snapshot was unstable):** `useMediaSync` effect → `handleMediaSyncEvent` → `refreshCatalog` + `refreshSync` → catalog/`rows` update → `ReleaseManagementSection` `selectedId` effect (pre-fix deps).

---

## Commit reference

- Primary fix: `2309f24`
- Full audit hardening + this report: current commit message `fix: resolve React #185 render loop on media page — full audit`
