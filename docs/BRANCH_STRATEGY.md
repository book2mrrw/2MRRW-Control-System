# Branch Strategy

Foundation lock-in branch policy (2026-05-19).

## Sacred branch: `main`

- **`main` = stable foundation** — only merges that pass `npm run verify`, guardrails, and post-deploy smoke.
- Production deploys track `main` unless explicitly promoting a tagged recovery build.
- No force-push. No direct experimental commits without review.

## Working branches

| Pattern | Purpose |
|---------|---------|
| `experimental/*` | Feature spikes, catalog changes, perf experiments |
| `audit/*` | Edge-case verification, go-live checklists, read-only audits |
| `recovery/*` | Hotfix branches cut from `foundation-stable-v1` tags |

## Tags

| Tag | Role |
|-----|------|
| `foundation-stable-v1` | Canonical foundation snapshot |
| `foundation-stable-2026-05-19` | Date-stamped alias |

Optional long-lived branch:

- `stable-foundation` — points at same commit as tags; for clones that prefer a branch over a tag.

**Default branch** remains `main` unless the repo owner explicitly changes GitHub default.

## Merge workflow

1. Branch from `main`: `git checkout -b experimental/my-change`
2. Develop + `npm run verify` + `./scripts/check-architecture-guardrails.sh`
3. Open PR → `main`
4. After merge: Vercel production deploy + curl smoke (health + 9 releases)

## Recovery workflow

```bash
git checkout -b recovery/YYYYMMDD foundation-stable-v1
# fix forward
# PR to main — never force-push main
```

See `docs/SAFE_RECOVERY_PROTOCOL.md`.
