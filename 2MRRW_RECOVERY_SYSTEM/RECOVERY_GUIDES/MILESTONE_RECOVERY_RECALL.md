# Milestone Recovery Recall

How to restore foundation anchors, checkpoint tags, and platform coordination manifests **without mutating sacred foundation tags**.

## Sacred foundations (promoted baselines)

| Repo | Anchor | Restore |
|------|--------|---------|
| Control | tag `foundation-stable-v1` (`6d988f5`) | `npm run foundation:recover` |
| Frontend | branch `frontend-stable-foundation` (`ce6ae20`) | `npm run recover:foundation` |
| Platform | both | `npm run foundation:recover-platform` |

Manual control:

```bash
cd /path/to/2MRRW-Control-System
git fetch --tags origin
git checkout foundation-stable-v1
npm ci
npm run verify
```

Manual frontend:

```bash
cd /path/to/artist-platform
git fetch origin
git checkout frontend-stable-foundation
npm ci
npm run verify:foundation
```

Sacred frontend tag (when present):

```bash
git fetch --tags origin
git checkout foundation-stable-v1
npm ci
npm run verify:foundation
```

## Experimental checkpoints (milestones)

| Repo | Tag pattern | Create |
|------|-------------|--------|
| Control | `checkpoint-YYYYMMDD-HHMM` | `npm run foundation:checkpoint` |
| Frontend | `frontend-checkpoint-YYYYMMDD-HHMM` | `npm run recover:checkpoint` |
| Platform manifest | `platform-checkpoint-YYYYMMDD-HHMM.md` | `npm run foundation:checkpoint-platform` |

### Recover latest checkpoint (control)

```bash
git fetch --tags origin
git tag -l 'checkpoint-*' --sort=-creatordate | head -1
# Example output: checkpoint-20260519-1430
git checkout checkpoint-20260519-1430
npm ci
npm run verify
```

### Recover specific checkpoint (control)

```bash
git checkout checkpoint-2026-05-19-1030   # use your tag name (no extra dashes in tag)
npm ci
npm run verify
```

Note: tag names use `checkpoint-YYYYMMDD-HHMM` (e.g. `checkpoint-20260519-1030`), not ISO dates with extra hyphens.

### Recover frontend checkpoint

```bash
cd /path/to/artist-platform
git fetch --tags origin
git checkout frontend-checkpoint-20260519-1030
npm ci
npm run verify:foundation
npm run check:frontend-guardrails
```

Manifest copy: `docs/foundation/checkpoints/checkpoint-YYYYMMDD-HHMM.md`

### Recover platform milestone (coordinated)

1. Open `2MRRW_RECOVERY_SYSTEM/FOUNDATION_SNAPSHOTS/platform-checkpoint-YYYYMMDD-HHMM.md`
2. Note backend and frontend tags + SHAs
3. Check out each tag in its repo, `npm ci`, verify
4. Or run foundation recover + frontend recover if returning to sacred anchors instead

## List available checkpoints

```bash
# Control
git tag -l 'checkpoint-*' --sort=creatordate

# Frontend
git tag -l 'frontend-checkpoint-*' --sort=creatordate

# Platform manifests (control repo)
ls -1 2MRRW_RECOVERY_SYSTEM/FOUNDATION_SNAPSHOTS/platform-checkpoint-*.md 2>/dev/null
```

## Verify restored checkpoint integrity

```bash
# After checkout
npm run verify                    # control
npm run verify:foundation         # frontend
npm run foundation:verify-platform  # both (from control)
```

## Rollback (safe)

| Goal | Command |
|------|---------|
| Control safe rollback guide | `npm run foundation:rollback` |
| Frontend rollback guide | `npm run recover:rollback` |
| Return to sacred foundation | `npm run foundation:recover` / `npm run recover:foundation` |

Checkpoints are **not** deleted when rolling back to foundation. Never force-update `foundation-stable-v1` or `foundation-stable-2026-05-19`.

## Rules

- Checkpoint recall must **never** mutate foundation tags
- Never delete old checkpoint tags or manifests
- Platform manifests are append-only coordination records

## Related

- [`HUMAN_RECOVERY_COMMAND_MANUAL.md`](HUMAN_RECOVERY_COMMAND_MANUAL.md) — Section 3B: all 20 operator scenarios with exact commands
- [`FOUNDATION_TAG_DISCIPLINE.md`](FOUNDATION_TAG_DISCIPLINE.md)
- [`OPERATIONAL_PHILOSOPHY.md`](OPERATIONAL_PHILOSOPHY.md)
- [`CHECKPOINT_WORKFLOW.md`](CHECKPOINT_WORKFLOW.md)
- [`PLATFORM_ONE_COMMAND_RECOVERY.md`](PLATFORM_ONE_COMMAND_RECOVERY.md)
