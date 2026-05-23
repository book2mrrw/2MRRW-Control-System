# 2MRRW E2E Asset Audit — 2026-05-22

## Build results

| Repo | Command | Result |
|------|---------|--------|
| Control (`2MRRW-Control-System`) | `npm run build` | **PASS** (Next.js 16.2.6) |
| Frontend (`artist-platform`) | `npm run build` | **PASS** (Next.js 16.2.4) |

## Control tasks (CS-1 … CS-5)

| Task | Status | Notes |
|------|--------|-------|
| CS-1 AdminAuthGate/login | **FIXED** | `#000` shell, `#111` card, `#00b4b4` buttons, 8 OTP boxes + paste, `book2mrrw@gmail.com` only, `/dashboard` redirect unchanged |
| CS-2 Cover art in release cards | **FIXED** | `ReleaseArtwork` resolves R2 public URLs + fallback; `#1a1a1a` placeholder; `cover_art_url` / `csCover` paths; MediaSync* `cover_art_url` / `motion_cover_url` fallbacks; `next.config` `**.r2.cloudflarestorage.com` |
| CS-3 MediaUploadPanel mobile | **FIXED** | `@media (max-width: 640px)` stacks controls, `min-height: 160px` upload zones (studio + full panel) |
| CS-4 ReleasePages sticky nav | **FIXED** | Sticky top `WorkflowStepper`, scrollable content; mobile `calc(100vh - nav)` pattern |
| CS-5 Lyrics page | **FIXED** | `/releases/new/lyrics` — track select, textarea, **Save Lyrics**, `Saved ✓` 2s via `patchReleaseTrack` → `tracks.lyrics_text` |

## Audit A — Upload panels / paths / accepts

| Check | Status | Notes |
|-------|--------|-------|
| Cover art accepts jpg/jpeg/png/webp | **PASS** | `MediaUploadPanel` / `coverArtAccept` |
| Motion cover mp4/mov | **PASS** | Included in cover accept + video preview |
| Full audio formats | **PASS** | `professionalAudioAccept` (mp3/wav/flac/aiff/aac/m4a) |
| Preview audio | **PASS** | `preview_snippets` category |
| Lyrics text (not file) on lyrics page | **PASS** | CS-5; studio still supports document upload separately |
| Release types single/ep/album/deluxe | **PASS** | Existing `releaseManagementService` + frontend `partitionReleases` |

## Audit B — SELECT columns / API (whitelist scope)

| Check | Status | Notes |
|-------|--------|-------|
| Control catalog SELECTs | **SKIP** | Not in file whitelist; server already selects `lyrics_text`, assets via `releaseCatalogService` |
| Frontend library API | **PASS** | `library/route.js` selects product cover + storage |
| Signed URL 3600s vault | **PASS** | `vault/media/route.js` |
| Signed URL 3600s library stream | **PASS** | `library/stream/route.js` (product `storage_path`) |
| Full audio via release R2 key path | **PARTIAL** | Entitlement playback uses control-system signed assets + `resolveEntitledMediaAssetUrl`; `library/stream` is product-slug based, not `releases/{id}/tracks/{track_id}/full_audio` |

## Audit C — Frontend display (D1–D7)

| ID | Surface | Status | Notes |
|----|---------|--------|-------|
| D1 | Cover art | **FIXED** | `cover_art_url` mapping, `CoverArt` `#1a1a1a` placeholder |
| D2 | Motion cover | **FIXED** | `motion_cover_url`, `CoverArt` video autoplay muted loop playsInline |
| D3 | Full audio | **PASS** | Entitled resolution via control-system assets (no public full URL in mapper) |
| D4 | Preview audio | **FIXED** | `preview_audio_url` keys in `releases.js` |
| D5 | Lyrics panel | **FIXED** | `lyrics` / `lyrics_text`; hide GLYPHS when empty; `ReleaseDetailExtras` empty hide |
| D6 | Release types | **PASS** | single/ep/album/deluxe in partition + control mapping |
| D7 | next.config images | **FIXED** | Both repos: `**.r2.dev` + `**.r2.cloudflarestorage.com` + env host |

## Audit D — next.config

| Repo | Status |
|------|--------|
| Control | **PASS** — added `**.r2.cloudflarestorage.com` |
| Frontend | **PASS** — same |

## Skipped (already OK)

- `layout.tsx` / `login/page.tsx` — gate + null login page already correct
- `AdminAuthGate` session gate on all routes via root layout — unchanged
- `AuthGate.js` (frontend) — not modified; no regressions required
- Vault/public API routes — already return 3600s signed URLs where applicable
- `media/playback/route.js` — analytics persistence only (by design)

## Diffs summary (by task group)

### CS-1 — `AdminAuthGate.tsx`
- Teal/black spec colors; 8-box OTP row with paste; verify accepts ≥6 digits (Supabase email OTP compatibility).

### CS-2 — `ReleasePages.tsx`, `MediaSyncWorkspace.tsx`, `MediaSyncReleaseStudio.tsx`, `next.config.mjs`
- Public URL resolution for card art; placeholder color; spec URL field fallbacks on sync cards.

### CS-3 — `MediaUploadPanel.tsx`
- Mobile-only CSS injection for stack + min-height.

### CS-4 — `ReleasePages.tsx`
- Wizard sticky nav shell + scroll region.

### CS-5 — `releases/new/lyrics/page.tsx`
- Replaced redirect with save UI.

### Frontend audit — `releases.js`, `music-playback.js`, `CoverArt.js`, `ImmersivePreviewModal.js`, `ReleaseDetailExtras.js`, `useMusicLibrary.js`, `next.config.mjs`

## Commits

| Repo | Message | SHA |
|------|---------|-----|
| Control | `feat: admin auth gate, fix cover art, mobile upload panels, sticky nav, simple lyrics textarea` | `fe0facd49a0f7a08638895a1b98770fd8e88e53a` |
| Frontend | `audit: complete asset chain — cover art, motion cover, full audio, preview audio, lyrics across all release types` | `0652ef1c8a6ac4484db3038f67015e4707fe38d2` |

## Blockers / follow-ups

1. **DB column naming**: Spec says `tracks.lyrics`; production column is `tracks.lyrics_text` — writes go to `lyricsText` API field (unchanged schema).
2. **`library/stream`**: Resolves `products.storage_path`, not canonical `releases/{id}/tracks/{track_id}/full_audio.{ext}` — extend in a future API pass if product rows are not synced to that path.
3. **8-digit OTP vs Supabase**: UI is 8 boxes; verification allows 6+ digits so 6-digit Supabase codes still work.
