# Media rendering audit — Control System

**Updated:** 2026-05-19 (single loop resolver — all animated singles)

## Expected behavior

| Type | Media |
|------|--------|
| **single** | MP4/WebM loop if asset exists (DB or artist-platform `/videos/singles/{basename}.mp4`), else JPEG |
| **feature** | static JPEG only |
| **album** | static JPEG only |

## Animated singles (artist-platform)

| Catalog slug | Title | MP4 basename |
|--------------|-------|----------------|
| `hour-glass` | Hour Glass | `hourglass` |
| `artificial` | Artificial | `artificial` |
| `w2d` | W.2.D | `w2d` |
| `turnt-me-2-dis` | Turnt Me 2 Dis | `turntme2dis` |

Poster stills: `hourglass.jpg`, `artificial.jpg`, `w2d.jpg`, `turnt.jpg` (slug `turnt-me-2-dis` → `turnt.jpg` via storage filename map).

## Resolver rules

1. `resolveReleasePrimaryAssetForCatalog` — DB motion first; then `slugMotionPublicUrl` **only** when `releaseType === "single"` and not feature/album category.
2. `motionBasenameForSlug` — de-hyphen slug; explicit overrides for `hour-glass` → `hourglass`, `turnt-me-2-dis` → `turntme2dis`.
3. `buildReleasePrimaryAsset` / `resolveDisplayPrimaryAsset` — motion URL always wins over stale JPEG `primaryAsset`.
4. Features/albums never receive slug MP4 fallback.

## Files

| File | Role |
|------|------|
| `frontendMediaFallbacks.ts` | Slug → `/videos/singles/*.mp4`, type gating |
| `resolveReleasePrimaryAsset.ts` | Catalog still vs loop split + slug fallback |
| `artworkPublicFallback.ts` | Storage filename → artist-platform public paths |
| `releasePrimaryAsset.ts` | `primaryAsset` builder + display resolver |
| `controlCatalogPayload.ts` | `primaryAsset`, `motionUrl`, poster-only `coverUrl` |
| `ReleaseMediaCard.tsx` | Motion-first card UI |

## Verify

```bash
npm run verify && npm run build
```

`/media` Singles carousel: four `<video>` loops (hour-glass, artificial, w2d, turnt-me-2-dis). Features/albums: `<img>` only.
