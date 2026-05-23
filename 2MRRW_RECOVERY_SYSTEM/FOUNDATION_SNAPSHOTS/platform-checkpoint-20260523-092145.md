# Platform recovery checkpoint: 20260523-092145

**Created:** 2026-05-23T14:22:07Z  
**Operator note:** Platform recovery checkpoint

## Repository SHAs

| Repo | Commit | Checkpoint tag |
|------|--------|----------------|
| Control (backend) | `397d9f61cdfcdcb7d28f2eaf98d5da7058b14c4d` | `checkpoint-20260523-092145` |
| artist-platform (frontend) | `0866f9923e43acf62a13f95e73e1538becc7741f` | `frontend-checkpoint-20260523-0921` |

## Deployment references

| App | URL |
|-----|-----|
| Control | https://2mrrw-control-system.vercel.app |
| Frontend | https://artist-platform-silk.vercel.app |

Sacred foundations (not replaced by checkpoints):

| Repo | Anchor |
|------|--------|
| Control | tag `foundation-stable-v1` (`6d988f5`) |
| Frontend | `foundation-stable-v1` @ ce6ae20 (UI origin); operational `recovery-anchor.json` @ 48f97dd; tag `foundation-stable-v3` |

## Verification status

| Step | Result |
|------|--------|
| Backend `foundation:verify` | pass |
| Frontend `verify:foundation` | pass |
| Synchronization | staggered stamps (tags differ); see tags below |

## Recovery order

1. Control: `npm run foundation:recover` or `git checkout checkpoint-20260523-092145`
2. Frontend: `npm run recover:foundation` or `git checkout frontend-checkpoint-20260523-0921`
3. Verify: `npm run foundation:verify-platform`

One command: `npm run foundation:recover-platform`

## Rollback order

1. Identify target checkpoint tags (this manifest or `git tag -l '*checkpoint-*'`)
2. Control: `git checkout <backend-checkpoint-tag>` → `npm ci` → `npm run verify`
3. Frontend: `git checkout <frontend-checkpoint-tag>` → `npm ci` → `npm run verify:foundation`
4. For sacred baseline (not checkpoint): `npm run recover:foundation` or `foundation-stable-v2` / `frontend-stable-foundation` (UI-only: `foundation-stable-v1`)

## Environment references

- `2MRRW_RECOVERY_SYSTEM/ENVIRONMENT_BACKUPS/control.env.example`
- `2MRRW_RECOVERY_SYSTEM/ENVIRONMENT_BACKUPS/artist-platform.env.example`
- Frontend anchor: `artist-platform/docs/foundation/recovery-anchor.json`

## Push tags

```bash
git push origin checkpoint-20260523-092145
cd /Users/recharge/artist-platform && git push origin frontend-checkpoint-20260523-0921
```

See [MILESTONE_RECOVERY_RECALL.md](../RECOVERY_GUIDES/MILESTONE_RECOVERY_RECALL.md).
