# Media Sync v3 — HTML Prototype vs Built

Reference: `/Users/recharge/Downloads/media_sync_v3_final_dark.html`  
Built: `MediaSyncWorkspace.tsx`, `MediaSyncReleaseStudio.tsx`, `globals.css` (`media-sync-*`)

## HTML structure (extracted)

| Area | HTML pattern |
|------|----------------|
| Shell | Left nav (Hero, Vault, Release Mgmt, Audiovisuals, Press) + main + 220px right rail |
| Singles | Sec bar (counts + sync pill) → horizontal card scroll → expanded workspace |
| Workspace tabs | Cover Art · Audio · Lyrics · Metadata |
| Cover tab | Static cover panel + Motion cover upload + audio teaser row |
| Audio tab | Full + Preview side-by-side players + specs |
| Right rail | Asset health, access logic, relationship map, platforms, sync log, force sync |

## Implemented (this pass)

- **Singles / Albums & EPs**: Horizontal release picker (`media-sync-card-scroll`), selected-release workspace with v3 tabs, asset panels (ok/miss), motion loop block on cover tab
- **Preview vs full audio**: Dedicated `fixedCategory` uploads — `preview_snippets` and `full_song_files` (compact panels + mini players when URLs exist)
- **Hero**: Title, subtitle, CTA label, CTA href editing via `/api/admin/hero-config` + existing hero media upload
- **Audiovisuals**: Full `AudioVisualsPanel` in Media Sync — auto-sync from `musicVideos`, responsive cards (thumbnail, release/track, media type, sync status, visibility), YouTube + MP4/MOV/WEBM, drag-drop upload, replace/remove/publish/preview/open release
- **Inspector rail**: Asset health, static access logic copy, relationship map from `resolveMediaSyncRoute`, platform tags, sync log stub, force sync
- **Realtime pill**: Uses `useMediaSync().connected` on section bar and inspector
- **CSS**: Scoped `media-sync-*` rules for scroll, cards, workspace, asset panels, inspector (no global redesign)

## Preserved (unchanged contracts)

- Upload intent / complete, catalog refetch, `sync_state`, publish actions, `ReleaseMediaSyncWorkspace` legacy editor path
- Sticky top-level control room tabs (not HTML’s inner left nav — maps to existing Creator Studio chrome)

## Remains / not in HTML slice

| Item | Notes |
|------|--------|
| Left nav duplicate | HTML `nav` (Hero/Vault/Features/New Release) — kept as existing sticky tabs + release flow links |
| Press & Promo section | HTML nav item only; no panel in prototype body |
| Features bucket | Nav badge in HTML; not a separate control-room tab yet |
| Lyrics persistence UI | Upload category wired; no lyrics text editor or readback in catalog card |
| Version history / revert v1 | HTML “Revert v1” chips — needs `media_asset_versions` UI |
| Waveform from server | HTML mock bars; local play only until worker waveforms land |
| Sync log from events | Inspector shows catalog/dirty hints; not full event stream yet |
| Audio visual relationship auto-map | Manual release/track IDs; title→release heuristic not automated yet |
| New Single dashed card | “New” opens manage release for first row; no inline create flow |

## Verify

```bash
npm run verify   # passed
npm run build    # passed
```

**Production URL:** https://2mrrw-control-system.vercel.app/media
