# Media rendering audit — Control System

**Date:** 2026-05-19  
**Goal:** Admin release cards use the same media priority as artist-platform (MP4 loop → static cover), not JPEG-only thumbnails.

## Before

| Issue | Detail |
|-------|--------|
| hour-glass cards | `resolveCatalogMediaUrl` returned static `hourglass.jpg` fallback before signed MP4; loop URL often missing |
| Carousel / studio | Inline `<img>` or raw `<video>` duplicated in 3 components; no poster / visibility pause |
| Public API | `loopUrl` optional; frontend already reads `video` from control mapping |

## After

| Layer | Change |
|-------|--------|
| **Contract** | `ReleasePrimaryAsset` in `src/lib/media/releasePrimaryAsset.ts` |
| **Server resolver** | `resolveReleasePrimaryAssetForCatalog` — loop > cover motion > image; slug fallback for hour-glass MP4 |
| **Catalog payload** | `primaryAsset`, `posterUrl`, `loopUrl`, `coverUrl` on `DurableCatalogRelease` |
| **Fallbacks** | `motionPublicFallbackUrl`, `slugMotionPublicFallbackUrl` in `artworkPublicFallback.ts` |
| **URL resolve** | Signed URL first for motion assets; no JPG map for `.mp4` paths |
| **UI** | `ReleaseMedia`, `AnimatedCoverArt`, `ReleaseVideoPreview`, `MediaFallback` + IntersectionObserver pause |

## Priority (aligned with artist-platform)

1. `loopUrl` / `background_loop` / motion path (MP4, WebM, MOV, GIF)  
2. `coverUrl` if motion  
3. Static `coverUrl` (JPG/PNG)  
4. `artworkPublicFallback` / slug map (`hour-glass` → `/videos/singles/hourglass.mp4`)  
5. Gradient + emoji placeholder  

## hour-glass

| | Before | After |
|---|--------|--------|
| **primaryAsset.type** | Often missing / image only | `mp4` |
| **primaryAsset.src** | `…/hourglass.jpg` | `…/videos/singles/hourglass.mp4` (or signed Supabase) |
| **poster** | — | `…/hourglass.jpg` until `canplay` |
| **/media card** | Gradient or static JPG | Looping video with poster |

## Files touched

- `src/lib/media/releasePrimaryAsset.ts` (new)
- `src/server/media/resolveReleasePrimaryAsset.ts` (new)
- `src/server/media/catalogMediaUrl.ts`
- `src/server/media/artworkPublicFallback.ts`
- `src/server/catalog/controlCatalogPayload.ts`
- `src/server/media/mediaObjects.ts` (motion asset discovery)
- `src/app/api/public/releases/route.ts`
- `src/services/catalog/controlCatalogClient.ts`
- `src/components/media/*` (new)
- `src/components/control/MediaSyncReleaseStudio.tsx`
- `src/components/control/MediaSyncWorkspace.tsx`
- `src/components/control/CreatorReleaseSystem.tsx`
- `src/app/globals.css`
- `tests/backend-foundation.test.ts`

## Verify

```bash
npm run verify && npm run build
# Browser: https://2-mrrw-control-system.vercel.app/media — Hour Glass card shows MP4 loop
```

Go-live systems (cron, scheduling, unpublish, edge cases) unchanged.
