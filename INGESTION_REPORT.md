# 2MRRW Control System — Ingestion & Hydration Report

Generated: 2026-05-18

## Architecture reference

Implementation follows the HTML prototype **data model only** (relational joins, ingestion phases, media grouping). The locked Next.js UI was **not** replaced.

Studio API auth and release actions are documented in **`ADMIN.md`** (same-origin `requireStudioAccess`; no browser admin token required).

## Supabase project

- **Project:** `xzghdntnvslvpxedgfku`
- **URL:** `https://xzghdntnvslvpxedgfku.supabase.co`

### Table counts (post-migration backfill)

| Table | Count |
|-------|------:|
| releases | 9 |
| tracks | 30 |
| media_assets | 71 |
| release_media | 67 |
| audio_visuals | 3 |
| sync_events | 299+ |
| sync_state | 1 |

### Real releases (not demo data)

| Slug | Title | Status |
|------|-------|--------|
| hour-glass | Hour Glass | published |
| w2d | W.2.D | published |
| artificial | Artificial | published |
| turnt-me-2-dis | Turnt Me 2 Dis | published |
| i-dont-believe-you | I Don't Believe You | published |
| 2-heavy | 2 Heavy | published |
| tbh | T.B.H. | published |
| ad | 2MRRW: (A.D) | published |
| love-hz | Love Hz Vol.1 | published |

## Migration `0012_release_media_ingestion.sql`

Added (only gaps):

- `release_media` — join with `asset_role` (`cover_art`, `background_loop`, `preview`, `audio`, …), `is_primary`, versioning
- `media_asset_versions` — replacement history
- `ingestion_log` — per-phase audit
- `sync_state` — dirty flags / ingestion cursor
- Bridge columns: `releases.ingestion_source`, `ingestion_ref`, `catalog_version`; `media_assets.asset_type`, `checksum_md5`, `metadata`, `version`, `is_active`; `tracks.audio_asset_id`, `preview_asset_id`

Status mapping: DB uses `published` (not HTML `live`); hydration maps to Control System `published` / UI label "Live".

## Ingestion pipeline

**CLI:** `npm run ingest:frontend`

**Flags:** `--scan-only`, `--dry-run`, `--validate`, `--activate`

**Phases:** scanner → normalizer → uploader/constructor → linker (`release_media`) → validator → activator (sync events + `sync_state`)

**Source:** `/Users/recharge/artist-platform` — `page.js` singles/albums/features, `storage/digital-assets.manifest.json`

**Scan result:** 4 singles, 3 albums, 2 features, 3 audio visuals → **9 releases**, **30 tracks**, **71 media assets**

### Files

| Path | Role |
|------|------|
| `scripts/ingest-frontend.ts` | CLI entry |
| `src/server/release-management/frontendIngestionPipeline.ts` | Phased orchestration |
| `src/server/release-management/frontendReleaseIngestionService.ts` | Scanner/plan builder (artist-platform) |
| `src/server/catalog/releaseCatalogService.ts` | Relational Supabase fetch (HTML `useData` equivalent) |
| `src/server/release-management/releaseCatalogHydrationService.ts` | DB → in-memory drafts for locked UI |
| `src/server/media/mediaReplacementService.ts` | Versioned replace without duplicate releases |
| `src/server/sync/syncStateService.ts` | Dirty flags + events |
| `src/app/api/public/releases/route.ts` | Public catalog read |
| `src/app/diagnostics/page.tsx` | Integrity panel (existing primitives) |

## Hydration

Server pages call `ensureFrontendReleaseEcosystemImported()` → `ensureCatalogHydrated()`:

1. **Prefer Supabase** via `fetchDurableReleaseCatalog()` (releases + tracks + release_media + media_assets joins)
2. **Fallback** frontend file import into memory if DB unavailable

**Media tab:** `listHydratedMediaGroups()` + relational table in `MediaPage` (no layout change).

**Release detail:** linked media table from `syncReleaseMedia()` after hydration.

## Sync / realtime

- Existing SSE: `/api/sync/stream`
- Events: `release_published`, `release.updated`, `media.uploaded`, `media.replaced`, `hero.updated`, `ingestion_complete`
- `sync_state` updated on activation/replacement

## Commands

```bash
# Scan only
npm run ingest:frontend -- --scan-only

# Full idempotent run (needs valid SUPABASE_SERVICE_ROLE_KEY in .env.local)
npm run ingest:frontend -- --activate

npm run verify
npm run build
npx vercel --prod --yes
```

## Blockers / ops notes

- **Local `.env.local`:** `SUPABASE_SERVICE_ROLE_KEY` was invalid (literal `npx vercel env pull…` string). Production persistence was completed via **Supabase MCP** migration + SQL backfill.
- **Vercel:** Set `SUPABASE_SERVICE_ROLE_KEY` in Production env so serverless instances hydrate from DB on cold start (not file import only).
- **Storage uploads:** Ingestion persists `storage_path` rows; binary upload to buckets requires service role + bucket policies (paths canonical: `artwork/`, `masters/`, `previews/`, `loops/`).

## Verification

- `npm run verify` — passed
- `npm run build` — passed
- **Production URL:** https://2mrrw-control-system.vercel.app
- `GET /api/releases?limit=100` → **9** releases (Hour Glass, Love Hz, T.B.H., etc.)
- `GET /api/public/releases?limit=100` → **count: 9**
- Media/Releases pages: server components call `ensureCatalogHydrated()` → Supabase relational catalog → **9** discography cards + Media catalog table rows

## Spec gaps (documented)

- HTML `storage_type` / `public_url` / `embed_url` on `media_assets` — use existing `bucket` + `storage_path` + signed-url API
- HTML `credits` / `distribution` tables exist (`release_credits`, `release_external_links`); not populated from artist-platform yet
- `hero_config` row empty; hero still separate admin route
- Realtime on `sync_state` — table created; publication uses existing `sync_events` + SSE
