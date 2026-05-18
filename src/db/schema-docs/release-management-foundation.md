# Release Management Foundation

This implementation expands the existing 2MRRW backend foundation into an artist distribution control lane without applying live database changes automatically.

## Implemented Local Surfaces

- `src/db/migrations/0004_release_management_foundation.sql` adds forward-compatible release metadata, draft readiness fields, genre taxonomy tables, songwriter bank tables, track contributor split rows, publishing metadata, and media requirement metadata.
- `src/server/release-management/*` defines typed release types, genre/mood/country taxonomies, cover-art policy metadata, draft services, track information updates, songwriter bank operations, contribution split validation, and readiness checks.
- `src/server/releases/releaseReadService.ts` and `src/server/releases/releaseWriteService.ts` explicitly separate public read and admin write service entrypoints while sharing the same underlying release/media/account/playback contracts.
- `src/server/media/mediaObjects.ts` defines the normalized media object contract consumed by web/mobile experience layers. UI components should not own release metadata, playback business logic, or hardcoded media lists.
- `src/app/api/admin/releases/manage/*` exposes thin admin route handlers for draft creation/listing, draft detail, metadata updates, track information, songwriter bank, contribution rows, readiness, and taxonomy data.
- `src/app/api/releases/*`, `src/app/api/library`, and `src/app/api/playback/*` expose thin experience-layer routes backed by the shared read services.
- `src/components/control/ReleaseManagementDashboard.tsx` adds the Control System release-management command lane while preserving the existing cinematic dark shell and semantic cyan/purple/orange/red design language.
- `src/server/audio-visuals/audioVisualService.ts`, `/api/admin/audio-visuals`, and `/api/audio-visuals` add a backend-managed Audio Visuals lane for YouTube embeds. These records are not native video uploads; the backend stores normalized YouTube embed metadata and publishes safe records for the public frontend.

## One Ecosystem / Two Interfaces

- Public frontend/app is the read and experience layer: it fetches normalized media objects, renders media, checks permissions, records playback, and reads library/account state.
- Backend CMS/control panel is the write and control layer: it creates drafts, edits metadata, uploads files, manages rights, controls entitlements, and publishes or schedules releases.
- Audio Visuals follow the same split: Control System writes/manages visual records; public frontend reads published YouTube embed contracts and keeps hardcoded fallback visuals until records are present.
- Both interfaces share one Supabase database, one Auth system, one Storage bucket architecture, one Stripe/entitlement model, one API/service layer, and one normalized account/library/playback/analytics contract.
- Publishing in the control layer must update central release/media state so `getLatestReleases()`, `getReleaseBySlug()`, `getUserLibrary()`, and playback contracts reflect new content without manual frontend edits.

## Validation Invariants

- Single releases must contain exactly 1 track.
- Album and EP releases must contain at least 2 tracks.
- Non-producer songwriter contribution splits must total exactly 100% per track before readiness can pass.
- Release readiness requires core metadata, cover art readiness, audio readiness, track information, and split validation.
- Cover art policy metadata currently supports `png`, `jpg`, `jpeg`, `gif`, `mp4`, and `mov`, a 60-70MB target envelope, and 3000px square preferred dimensions.

## Live Database Posture

The migrations are local only in this pass. Review and apply `0004_release_management_foundation.sql` and `0006_audio_visuals_foundation.sql` to the intended Supabase project only after confirming the target environment and desired deployment window.
