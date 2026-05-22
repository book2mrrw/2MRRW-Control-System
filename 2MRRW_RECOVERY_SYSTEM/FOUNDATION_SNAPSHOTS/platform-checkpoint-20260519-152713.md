# Platform recovery checkpoint: 20260519-152713

**Created:** 2026-05-19T20:27:29Z  
**Operator note:** timestamp-fix-validation

## Repository SHAs

| Repo | Commit | Checkpoint tag |
|------|--------|----------------|
| Control (backend) | `26eb4be17270543f88854f286494d61b353d70a6` | `checkpoint-20260519-152713` |
| artist-platform (frontend) | `b45a8d93905bd002cc36a6e1d9862fd0e967a10c` | `frontend-checkpoint-20260519-152713` |

## Deployment references

| App | URL |
|-----|-----|
| Control | https://2mrrw-control-system.vercel.app |
| Frontend | https://artist-platform-silk.vercel.app |

Sacred foundations (not replaced by checkpoints):

| Repo | Anchor |
|------|--------|
| Control | tag `foundation-stable-v1` (`6d988f5`) |
| Frontend | branch `frontend-stable-foundation` / tag `foundation-stable-v1` @ ce6ae20 |

## Verification status

| Step | Result |
|------|--------|
| Backend `foundation:verify` | pass |
| Frontend `verify:foundation` | fail or skipped |
| Synchronization | aligned |

## Recovery order

1. Control: `npm run foundation:recover` or `git checkout checkpoint-20260519-152713`
2. Frontend: `npm run recover:foundation` or `git checkout frontend-checkpoint-20260519-152713`
3. Verify: `npm run foundation:verify-platform`

One command: `npm run foundation:recover-platform`

## Rollback order

1. Identify target checkpoint tags (this manifest or `git tag -l '*checkpoint-*'`)
2. Control: `git checkout <backend-checkpoint-tag>` → `npm ci` → `npm run verify`
3. Frontend: `git checkout <frontend-checkpoint-tag>` → `npm ci` → `npm run verify:foundation`
4. For sacred baseline (not checkpoint): `foundation-stable-v1` / `frontend-stable-foundation`

## Environment references

- `2MRRW_RECOVERY_SYSTEM/ENVIRONMENT_BACKUPS/control.env.example`
- `2MRRW_RECOVERY_SYSTEM/ENVIRONMENT_BACKUPS/artist-platform.env.example`
- Frontend anchor: `artist-platform/docs/foundation/recovery-anchor.json`

## Push tags

```bash
git push origin checkpoint-20260519-152713
cd /Users/recharge/artist-platform && git push origin frontend-checkpoint-20260519-152713
```

See [MILESTONE_RECOVERY_RECALL.md](../RECOVERY_GUIDES/MILESTONE_RECOVERY_RECALL.md).
