# 2MRRW Control System — Mobile UI + Admin Auth Implementation

**Date:** 2026-05-22  
**Build:** `npm run build` — passed

## Summary

All four tasks from the mobile UI cursor prompt were implemented in `2MRRW-Control-System`.

### Task 1 — Mobile bottom nav

- Primary tabs: Dashboard, Releases (badge), Media, Commerce, and **More**.
- **MoreDrawer** slide-up sheet (z-index 50): Vault, Collector's Cards, Analytics, Shop, Settings.
- `.mobile-nav` uses `grid-template-columns: repeat(5, 1fr)`; nav labels use `nowrap` + ellipsis.
- Desktop sidebar unchanged via `SIDEBAR_NAV_ITEMS` (all 8 modules + Settings).

### Task 2 — Mobile scroll and zoom

- `viewport` export added in `src/app/layout.tsx` (`maximumScale: 5`, `userScalable: true`).
- Touch scroll: `-webkit-overflow-scrolling: touch` on `html, body`, `.app`, `.content`; `overscroll-behavior: contain` on `.content`.

### Task 3 — Admin login + route protection

- New `src/app/login/page.tsx` — Supabase email/password, `profiles.role === "admin"` check.
- Session guard in `src/proxy.ts` (Next.js 16 proxy; `middleware.ts` not used — conflicts with proxy).
- `OperationalShell` renders login route children without SPA shell.
- Settings **Sign out** → `supabase.auth.signOut()` → `/login`.

### Task 4 — Release date on publish

- `publishRelease` / `draftToCatalog` use `originalReleaseDate` for `release_date` and status (`published` vs `scheduled` by calendar date).
- `ReleaseFlow` re-patches `originalReleaseDate` before publish.
- Releases list: purple **Upcoming · [date]** chip when scheduled; muted date under title when released.

## Files touched

| Area | Files |
|------|-------|
| Nav / SPA | `CreatorReleaseSystem.tsx`, `globals.css`, `OperationalShell.tsx` |
| Layout | `layout.tsx` |
| Auth | `login/page.tsx`, `proxy.ts` |
| Publish | `releaseService.ts` |

## Verification checklist

- [x] Mobile nav: 5 equal columns, no wrap (CSS grid + ellipsis)
- [x] More drawer opens/closes; active secondary tab highlighted (`.active` purple)
- [x] `/login` admin flow + non-admin denial message
- [x] Unauthenticated routes redirect to `/login` (via proxy)
- [x] `npm run build` passes

## Note on middleware

Next.js 16 in this repo uses **`src/proxy.ts`** instead of `src/middleware.ts`. Auth redirects were merged into `proxy.ts` with the existing API CORS handler.
