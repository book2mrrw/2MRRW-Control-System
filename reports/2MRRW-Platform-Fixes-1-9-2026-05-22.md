# 2MRRW Platform Fixes 1–9 — Implementation Report

**Date:** 2026-05-22  
**Repos:** `2MRRW-Control-System`, `artist-platform`  
**Supabase project:** `xzghdntnvslvpxedgfku`  
**R2 public CDN:** `https://pub-643e4a94e0184b1fabf6522cfbb16f75.r2.dev`

## Build verification

| Repo | Command | Result |
|------|---------|--------|
| 2MRRW-Control-System | `npm run build` | Exit 0 |
| artist-platform | `npm run build` | Exit 0 |

## FIX 1 — Admin role

- Located role storage on `public.profiles.role` (`user` \| `admin`).
- Inserted/updated profile for `545cd959-5cae-4009-8a91-1c46fe2f4d27` (`book2mrrw@gmail.com`) with `role = admin`.
- Verified via Supabase SQL: profile row present with `admin` role.

## FIX 2 — Cover art CDN (storefront)

- Updated `artist-platform/src/lib/control-system/media.js` with `resolvePublicArtworkUrl()` — prefers public R2 CDN URLs; skips signed URL fetch for artwork.
- Updated `artist-platform/src/lib/control-system/releases.js` to resolve release covers through public CDN only (`immediatePublicCoverUrl` + `resolvePublicArtworkUrl`).

## FIX 3 — Features: 2 Heavy & I Don't Believe You

- Supabase SQL: set `release_type = feature` and `release_category = feature` for slugs `2-heavy` and `i-dont-believe-you`.
- Control UI: `mapReleaseType` now maps feature category to **Feature** (not Single), so they no longer appear under Singles.

## FIX 4 — Features tab

- **Releases page (Creator):** added **Features** tab filter (`CreatorReleaseSystem.tsx`).
- **Discography filters:** added Features chip (`/releases?type=feature`) in `ReleasePages.tsx` + page route type.
- **Media control room:** Features section already present; feature filter uses `isFeatureRelease()`.

## FIX 5 — Sync error on published singles

- Relaxed `computeReleaseLiveStatus` in `releaseLiveStatus.ts`: pending dirty sync no longer forces `sync_error` for published releases with cover, audio, and frontend mapping.
- Published singles with assets should display **Live** instead of **Sync error** when only sync queue is dirty.

## FIX 6 — Cover art upload UI redesign

- Added `StudioMediaUpload.tsx` + `studioLayout` mode on `MediaUploadPanel`.
- Two-column dark layout, purple accent `#7c3aed`, hidden native file input, drag/drop zone, validation line, Prepare Upload button states per spec.
- Styles in `globals.css` (`.studio-upload-*`).

## FIX 7 — Audio upload tab

- Audio tab always shows upload UI (no “add a track first” gate).
- Format dropdown: 16/24/32-bit at 44.1/48 kHz; metadata passed on upload intent.
- Studio upload styling matches FIX 6.

## FIX 8 — Lyrics tab

- Large textarea (min 300px), placeholder, character count, **Save Lyrics** button (`#7c3aed`).
- Saves to `tracks.lyrics_text` via `patchReleaseTrack` + session persistence.

## FIX 9 — Metadata fields

- Migration `0022_release_metadata_credits.sql` + live Supabase columns: `producer`, `mixing_engineer`, `mastering_engineer`, `written_by` (plus existing `record_label`).
- `releaseMetadataPersistenceService.ts` + metadata API GET/PATCH extended.
- Media control room Metadata tab fields: Producer, Mixing Engineer, Mastering Engineer, Record Label, Written By.

## Phase 0/1 preservation

- No changes to SSE singleton, sync circuit breaker, or auth/Stripe/entitlement flows (except FIX 1 profile grant).
