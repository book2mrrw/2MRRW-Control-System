# Operational Lock-In Report

**Date:** 2026-05-19  
**Scope:** Final operational maturity layer (no architecture / rendering / deploy flow changes)

## Status summary

| Area | Status |
|------|--------|
| Frontend checkpoint | `npm run recover:checkpoint` + manifests under `docs/foundation/checkpoints/` |
| Backend checkpoint | `npm run foundation:checkpoint` (unchanged behavior) |
| Platform checkpoint | `npm run foundation:checkpoint-platform` |
| Dependency reproducibility | Control `stripe`, `zod`, `@types/*`, `tsx`, `typescript` pinned to lockfile versions |
| Foundation tags | Backend `foundation-stable-v1`; frontend `foundation-stable-v1` on `ce6ae20` + branch `frontend-stable-foundation` |
| Rollback lineage | Annotated checkpoint tags; fail-if-exists; manifests append-only |
| Milestone recall | `2MRRW_RECOVERY_SYSTEM/RECOVERY_GUIDES/MILESTONE_RECOVERY_RECALL.md` |
| Recovery bundle | `LOCKFILES/`, `ENVIRONMENT_BACKUPS/` verified present |

## New npm commands

### Control (`2MRRW-Control-System`)

| Command | Purpose |
|---------|---------|
| `foundation:checkpoint` | Backend tag `checkpoint-YYYYMMDD-HHMM` + snapshot md |
| `foundation:checkpoint-platform` | Backend + frontend checkpoints + platform manifest |
| `foundation:recover-platform` | Unified platform foundation recover |
| `foundation:verify-platform` | Verify both repos |

### Frontend (`artist-platform`)

| Command | Purpose |
|---------|---------|
| `recover:checkpoint` | Tag `frontend-checkpoint-YYYYMMDD-HHMM` + manifest md |
| `recover:foundation` | Sacred foundation recover (unchanged) |
| `verify:foundation` | Foundation verification (unchanged) |

## File locations

| Artifact | Path |
|----------|------|
| Frontend checkpoint script | `artist-platform/scripts/recovery/create-frontend-checkpoint.mjs` |
| Frontend manifests | `artist-platform/docs/foundation/checkpoints/checkpoint-*.md` |
| Platform checkpoint script | `scripts/run-platform-foundation-checkpoint.sh` |
| Platform manifests | `2MRRW_RECOVERY_SYSTEM/FOUNDATION_SNAPSHOTS/platform-checkpoint-*.md` |
| Milestone recall | `2MRRW_RECOVERY_SYSTEM/RECOVERY_GUIDES/MILESTONE_RECOVERY_RECALL.md` |
| Tag discipline | `2MRRW_RECOVERY_SYSTEM/RECOVERY_GUIDES/FOUNDATION_TAG_DISCIPLINE.md` |
| Philosophy | `2MRRW_RECOVERY_SYSTEM/RECOVERY_GUIDES/OPERATIONAL_PHILOSOPHY.md` |
| Frontend tag strategy | `artist-platform/docs/foundation/FRONTEND_FOUNDATION_TAG_STRATEGY.md` |

## Recovery order

1. `npm run foundation:recover-platform` (or per-repo recover scripts)
2. `npm run foundation:verify-platform`
3. Optional deploy flags per existing playbooks (unchanged)

## Rollback order

1. Identify checkpoint tag or platform manifest
2. Control: `git checkout <checkpoint-tag>` → `npm ci` → `npm run verify`
3. Frontend: `git checkout <frontend-checkpoint-tag>` → `npm ci` → `npm run verify:foundation`
4. Sacred baseline: `foundation-stable-v1` / `frontend-stable-foundation` via recover scripts

## Checkpoint creation order

1. `npm run foundation:checkpoint` (control) **or** `npm run foundation:checkpoint-platform` (both + manifest)
2. Push tags when satisfied
3. Zip `2MRRW_RECOVERY_SYSTEM/` for off-machine copy

## Foundation promotion philosophy

- Checkpoints = frequent milestones, never overwrite
- Foundations = rare, verified, versioned sacred tags
- No automatic promotion from checkpoint → foundation

## Remaining weak spots

- Frontend repo may have local uncommitted work; checkpoints warn but tag HEAD
- Platform checkpoint stamps may differ by one minute if commands cross minute boundary (documented in manifest)
- `npm ci --dry-run` in frontend checkpoint requires npm available at checkpoint time

## Dry-run verification

```bash
# Frontend
cd artist-platform && npm run recover:checkpoint -- --dry-run

# Platform (control)
cd 2MRRW-Control-System && npm run foundation:checkpoint-platform -- --dry-run

# Control tests
cd 2MRRW-Control-System && npm run verify
```

Full `foundation:recover` / `recover:foundation` were **not** run (git-mutating).
