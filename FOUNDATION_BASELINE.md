# Foundation Baseline

**Locked:** 2026-05-19  
**Branch:** `main`  
**Commit:** `0e1b15a9be8681ed27de7f0f54ae2cf7f3a5611e`  
**Subject:** fix: bound Supabase catalog reads so studio fallback serves within 5s

## Dependency pins (exact)

| Package | Version |
|---------|---------|
| `next` | 16.2.6 |
| `@supabase/supabase-js` | 2.105.4 |
| `react` | 19.2.6 |
| `react-dom` | 19.2.6 |

Verify locally:

```bash
npm ls next react react-dom @supabase/supabase-js --depth=0
```

## Production deploy

| Field | Value |
|-------|--------|
| **URL** | https://2mrrw-control-system.vercel.app |
| **Vercel project** | `2mrrw-control-system` |
| **Reference deploy** | `dpl_3Q5z4Q1b61JrHXVCZPn9EmiBbjgm` (post edge-verify restore; see `docs/PROMPT_DEPLOY_TIMELINE.md`) |

## What works (verified contract)

- Root layout passes `initialCatalog={[]}` — no server catalog build in layout.
- Studio catalog loads client-side via `GET /api/admin/catalog` (`controlCatalogClient.ts`).
- Supabase catalog reads are bounded; studio fallback (`studioCatalogFallback.ts`) serves within timeout when DB is slow.
- Singles prefer MP4 motion loops (`buildReleasePrimaryAsset` + `slugMotionPublicUrl`); albums/features use static JPEG covers.
- `/api/health/basic` returns `{ ok: true, timestamp }`.
- `/api/public/releases` returns 9 frontend-import releases with `coverUrl` / `primaryAsset` when healthy.
- Pinned framework and Supabase client versions (no `latest` on foundation deps).

## Related commits (stabilization era)

| Commit | Role |
|--------|------|
| `0e1b15a` | Bounded Supabase catalog reads + studio fallback SLA |
| `c9b4465` | Restore catalog population without layout hydration |
| `43e5cec` | Post-deploy smoke documentation |

## Pre-verification anchor (timeline only)

`c75cab5` — commit immediately before edge-case verification docs. See `RECOVERY_ANCHOR.md`.

## Verification commands

```bash
npm run verify
./scripts/check-architecture-guardrails.sh
```

## Recovery system

Full disaster-recovery bundle: `2MRRW_RECOVERY_SYSTEM/` (see `RECOVERY_SYSTEM_REPORT.md`). Restore tag: `foundation-stable-v1`.
