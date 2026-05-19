# Production Audit — 2MRRW Control System

**Date:** 2026-05-19  
**Production URL:** https://2-mrrw-control-system.vercel.app  
**Media Control Room:** https://2-mrrw-control-system.vercel.app/media

## Dependency graph

```
artist-platform (page.js musicVideos, singles, albums, /images/*)
        │ ingest:frontend / audioVisualSyncService
Control System APIs (/api/admin/*, /api/public/*)
        ├── Supabase: releases, tracks, media_assets, release_media, audio_visuals
        ├── Storage: protected-media (signed URLs via catalogMediaUrl)
        └── sync_events → frontend cache invalidation

Media Control Room
        ├── catalog: GET /api/admin/catalog → buildControlCatalogPayload
        ├── MediaSyncReleaseStudio: cover/audio/tracklist tabs
        └── AudioVisualsPanel: GET /api/admin/audio-visuals?sync=1
```

## Fixed (this stabilization pass)

| Priority | Fix |
|----------|-----|
| Cover art | `catalogMediaUrl` resolves public `/images/*` paths + signed Supabase URLs; catalog enriches cover/loop from `release_media` + owner `media_assets`; singles merge motion loop into `coverUrl` for cards |
| Audio | Track `previewUrl` / `audioUrl` from DB assets + `release_media` roles; studio bypass for full masters in Control Room |
| Default tab | Media Control Room opens on **Singles** |
| Tabs | Nav: Singles · Albums & EPs · **Features** · Hero · Vault · Audio Visuals · Press & Promo |
| Singles workspace | Cover Art \| Audio \| Lyrics \| Metadata — single cover panel (motion = cover) |
| Albums workspace | Cover Art \| Audio \| Tracklist \| Lyrics \| Metadata |
| Audio visuals | Full panel + frontend `musicVideos` sync |
| Hero | Loads `/api/public/hero` then admin config |
| Scroll | `media-sync-section-scroll` + workspace body overflow fixes |
| Glass | Light backdrop blur on release workspace + selected cards |

## Verify locally

```bash
npm run verify   # passed
npm run build    # passed
```

## Post-deploy checks

```bash
curl -s "https://2-mrrw-control-system.vercel.app/api/public/releases?limit=100" | jq '.data.count'
curl -s "https://2-mrrw-control-system.vercel.app/api/public/audio-visuals" | jq '.data.count'
curl -s "https://2-mrrw-control-system.vercel.app/api/public/hero" | jq '.data.hero.background_media_url'
```

## UI verification on /media

1. **Singles** tab loads by default — horizontal cards show cover thumbnails or motion loops (not gradient placeholders when assets exist).
2. Select a single → **Cover Art** tab shows image or loop in one panel; **Audio** tab has full + preview players when linked.
3. **Albums & EPs** → Love Hz Vol.1 visible; **Tracklist** tab lists tracks with audio link status.
4. **Audio Visuals** → Sync frontend → 3 cards (Hour Glass, A2B, W.2.D).
5. **Hero** → current background media preview from API.

## Go-live checklist

- [x] Catalog URL resolution (public paths + signed storage)
- [x] Media workspace tabs and defaults
- [x] Audio visuals sync path
- [ ] Deploy: `npx vercel --prod --yes`
- [ ] Confirm migration `0006_audio_visuals` + `0013_media_sync_routing` on production Supabase
- [ ] Run `npm run ingest:frontend -- --activate` if release_media rows still empty

## Remains

- Auto map audio visual → release by title slug
- Full sync event stream in inspector
- Lyrics text readback UI

See `MEDIA_SYNC_V3_GAP.md`.
