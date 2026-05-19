# Checkpoint Workflow

Create lightweight recovery tags between foundation releases without replacing `foundation-stable-v1`.

## Script

```bash
chmod +x scripts/create-recovery-checkpoint.sh
./scripts/create-recovery-checkpoint.sh "Optional human note"
```

## What it does

1. Creates annotated git tag `checkpoint-YYYYMMDD-HHMM` at current `HEAD`.
2. Writes `2MRRW_RECOVERY_SYSTEM/FOUNDATION_SNAPSHOTS/checkpoint-YYYYMMDD-HHMM.md` with commit, branch, subject, restore commands.

## When to checkpoint

- Before merging `experimental/*` or `audit/*` to `main`
- Before dependency bumps on foundation packages
- Before large Supabase or media pipeline changes
- After successful production smoke on a known-good `main`

## Restore a checkpoint

```bash
git fetch --tags origin
git checkout checkpoint-20260519-1430   # example
npm ci
npm run verify
./scripts/check-architecture-guardrails.sh
npx vercel --prod --yes   # only if promoting to production
```

## Push tag to remote

```bash
git push origin checkpoint-YYYYMMDD-HHMM
```

## Checkpoints vs foundation tags

| Type | Pattern | Use |
|------|---------|-----|
| Foundation | `foundation-stable-v1` | Disaster restore baseline |
| Checkpoint | `checkpoint-*` | Milestone before risky work |

Do not delete foundation tags. Prune old `checkpoint-*` tags only after confirming `main` superseded them.

## Cross-links

- [`../FOUNDATION_SNAPSHOTS/`](../FOUNDATION_SNAPSHOTS/) — generated notes
- [`../../docs/BRANCH_STRATEGY.md`](../../docs/BRANCH_STRATEGY.md)
