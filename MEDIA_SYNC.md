# Media Synchronization — Control Room

## Overview

The **Media Control Room** (`/media`) mirrors frontend sibling surfaces: Singles, Albums & EPs, Hero, Audiovisuals, Vault, plus operational panels (Recently Updated, Sync Status, Upload Queue). It is release-centric—not a flat asset CMS.

Migration **0013** (applied) adds routing columns; `mediaSyncContract.ts` + `mediaSyncRoutingService.ts` map uploads to frontend destinations and mark `sync_state` dirty.

## Control room sections

| Section | Frontend targets | Behavior |
|---------|------------------|----------|
| Singles | `latest_singles`, `music_singles`, carousels | Release cards with motion cover, expandable media |
| Albums & EPs | `albums`, `eps`, `music_albums`, `music_eps` | Unified bucket (e.g. Love Hz Vol.1); nested tracklist uploads |
| Hero Section | `hero`, `hero_config` | Live hero preview from `/api/public/hero` + `hero_media` upload |
| Audiovisuals | `audio_visuals`, `youtube_embeds` | YouTube embed preview + MP4 via `audio_visual` category |
| Enter The Vault | `vault`, `vault_media` | Gated vault uploads |
| Recently Updated | — | Catalog sorted by `updatedAt` |
| Sync Status | — | `GET /api/admin/sync-state` dirty flags |
| Upload Queue | — | In-session queue from `useUploadQueue` + `MediaUploadPanel` |

## Release cards

- **Visual:** Autoplay muted loop when `loopUrl` is video; else cover image; else gradient fallback
- **Header:** Title, type, sync badge (dirty/syncing/clean), last updated
- **Expand:** Cover Art, Full Song, Preview (singles) or Tracklist with per-track preview/full (albums/EPs)
- **Hints:** 1400×1400 min, 3000×3000 rec, loops max 90s

## Real-time sync flow

1. Upload intent → queue item (`uploading`)
2. Upload complete → `applyMediaSyncRouting` + `sync_state` dirty + SSE `media_updated`
3. `useMediaSync` → catalog refetch + sync-state refresh

## Key files

- `src/components/control/MediaSyncWorkspace.tsx` — Control room UI
- `src/services/sync/mediaSyncContract.ts` — Sections + routing contract
- `src/server/media/mediaSyncRoutingService.ts` — DB + dirty flags
- `src/lib/media/mediaVisual.ts` — Motion/image/audio detection
- `src/hooks/sync/useUploadQueue.ts` — Upload queue state
- `src/app/api/admin/sync-state/route.ts` — Sync status API
- `src/app/globals.css` — Scoped `media-sync-*` / `media-control-room-*` classes only

## Verification

```bash
npm run verify
npm run build
npx vercel --prod --yes
```

**Production:** https://2mrrw-control-system.vercel.app/media

### Production smoke test

1. Open **Media** → default **Albums & EPs** — confirm Love Hz (or ingested EP/album) appears with cover/loop card visual
2. Expand a release → upload cover or audio → **Upload Queue** shows progress → **Sync Status** shows dirty `release:{id}`
3. **Hero Section** — hero preview loads; upload updates after refresh
4. **Recently Updated** — release moves to top after catalog refetch
5. Mobile: sticky section tabs scroll horizontally; section body scrolls without clipping
