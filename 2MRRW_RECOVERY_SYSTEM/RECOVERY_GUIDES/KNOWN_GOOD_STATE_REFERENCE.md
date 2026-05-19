# Known Good State Reference

What “healthy” looks like at foundation lock-in. Use to compare production after restore.

## Git anchors

| Identifier | Commit | When to use |
|------------|--------|-------------|
| `foundation-stable-v1` | `6d988f5` | Default disaster restore |
| `foundation-stable-2026-05-19` | `6d988f5` | Date alias |
| Stabilization code | `0e1b15a` | Catalog bounded reads + 5s fallback SLA |
| Pre-verification | `c75cab5` | Timeline only — before edge-verify docs |
| MP4 baseline | `b26558e` | Media-only regressions |

See [`../KNOWN_GOOD_COMMITS/README.md`](../KNOWN_GOOD_COMMITS/README.md).

## Dependency pins (exact)

| Package | Version |
|---------|---------|
| `next` | 16.2.6 |
| `@supabase/supabase-js` | 2.105.4 |
| `react` | 19.2.6 |
| `react-dom` | 19.2.6 |

Snapshot: [`../DEPENDENCY_SNAPSHOTS/package.json`](../DEPENDENCY_SNAPSHOTS/package.json)  
Lockfile: [`../LOCKFILES/foundation-lock.json`](../LOCKFILES/foundation-lock.json)

## Architecture invariants

From [`../../CURRENT_SYSTEM_STATE.md`](../../CURRENT_SYSTEM_STATE.md):

- Root `layout.tsx`: `initialCatalog={[]}` — **no** `buildControlCatalogPayload` in layout.
- Studio catalog: client fetch → `GET /api/admin/catalog`.
- Singles: MP4 primary when motion exists; albums/features: JPEG.
- `/api/health/basic` → `{ ok: true, timestamp }`.
- `/api/public/releases` → **9** releases with `coverUrl` / `primaryAsset` when healthy.

## Production URLs

| Surface | URL |
|---------|-----|
| Control | https://2-mrrw-control-system.vercel.app |
| Frontend | https://artist-platform-silk.vercel.app |
| Frontend → Control | `NEXT_PUBLIC_CONTROL_SYSTEM_API_URL` → control URL |

## Vercel deploy IDs (promote without rebuild)

| ID | Notes |
|----|-------|
| `dpl_3Q5z4Q1b61JrHXVCZPn9EmiBbjgm` | Post edge-verify, 9 releases |
| `dpl_HyJb2XSdrL5AS6cZoL1YdzmybWKQ` | MP4 matrix verified |

## Verification commands

```bash
npm run verify
./scripts/check-architecture-guardrails.sh

curl -sS "https://2-mrrw-control-system.vercel.app/api/health/basic"
curl -sS "https://2-mrrw-control-system.vercel.app/api/public/releases?limit=100"
```

## Cross-links

- [`../../FOUNDATION_BASELINE.md`](../../FOUNDATION_BASELINE.md)
- [`../../RECOVERY_ANCHOR.md`](../../RECOVERY_ANCHOR.md)
- [`FOUNDATION_RESTORE_WORKFLOW.md`](FOUNDATION_RESTORE_WORKFLOW.md)
