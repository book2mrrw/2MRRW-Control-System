# Recovery System Report

**Created:** 2026-05-19  
**Scope:** Bulletproof offline recovery bundle for 2MRRW Control + artist-platform frontend

## Executive summary

The `2MRRW_RECOVERY_SYSTEM/` directory is the canonical disaster-recovery package: known-good commits, dependency snapshots, env templates (no secrets), deployment IDs, playbooks, and emergency shell commands. Foundation restore tag **`foundation-stable-v1`** points to **`6d988f5`** (stabilization era **`0e1b15a`**).

## Deliverables

| Phase | Artifact | Location |
|-------|----------|----------|
| 1 | Recovery directory tree | `2MRRW_RECOVERY_SYSTEM/` |
| 2 | Seven recovery guides + playbook + checkpoint doc | `2MRRW_RECOVERY_SYSTEM/RECOVERY_GUIDES/` |
| 3 | Known-good commits + dep snapshots | `KNOWN_GOOD_COMMITS/`, `DEPENDENCY_SNAPSHOTS/`, `LOCKFILES/` |
| 4 | Desktop backup strategy | `RECOVERY_GUIDES/LOCAL_DESKTOP_BACKUP_STRATEGY.md` |
| 5 | Emergency commands | `EMERGENCY_ROLLBACK/COMMANDS.sh`, `COMMANDS.md` |
| 6 | Checkpoint script | `scripts/create-recovery-checkpoint.sh` |
| 7 | Env recovery (names only) | `RECOVERY_GUIDES/ENVIRONMENT_VARIABLE_RECOVERY.md` |
| 8 | Scenario playbook | `RECOVERY_GUIDES/EMERGENCY_RECOVERY_PLAYBOOK.md` |
| 9 | Long-term protections | This report § Protections |
| 10 | This report | `RECOVERY_SYSTEM_REPORT.md` |
| Frontend pointer | README | `artist-platform/2MRRW_RECOVERY_SYSTEM/README.md` |

## Foundation anchors

| Identifier | Commit | Role |
|------------|--------|------|
| `foundation-stable-v1` | `6d988f5` | Primary disaster restore tag |
| `foundation-stable-2026-05-19` | `6d988f5` | Date alias |
| Stabilization | `0e1b15a` | Bounded catalog reads + studio fallback SLA |
| Pre-verification | `c75cab5` | Timeline anchor (not default restore) |
| MP4 media | `b26558e` | Media-only restore |

## Disaster restore (one line)

```bash
git fetch --tags origin && git checkout foundation-stable-v1 && npm ci && npm run verify && ./scripts/check-architecture-guardrails.sh && npx vercel --prod --yes
```

## Production references

| Surface | URL |
|---------|-----|
| Control | https://2mrrw-control-system.vercel.app |
| Frontend | https://artist-platform-silk.vercel.app |
| Known-good deploy | `dpl_3Q5z4Q1b61JrHXVCZPn9EmiBbjgm` |

## Long-term protections

Merged from foundation stability work — enforce on every `main` merge:

### Branch rules

- **`main` is sacred** — no force-push; experimental work on `experimental/*`, audits on `audit/*`, hotfixes on `recovery/*`.
- Merge via PR after `npm run verify` + guardrails + post-deploy smoke.
- Details: [`docs/BRANCH_STRATEGY.md`](docs/BRANCH_STRATEGY.md)

### Tags

| Tag | Use |
|-----|-----|
| `foundation-stable-v1` | Canonical restore |
| `foundation-stable-2026-05-19` | Date alias |
| `checkpoint-*` | Pre-risk milestones via `scripts/create-recovery-checkpoint.sh` |

### Guardrails script

```bash
./scripts/check-architecture-guardrails.sh
```

Blocks: layout catalog hydration, root `force-dynamic`, unpinned `next`/`@supabase/supabase-js`, and other incident patterns. See [`docs/ARCHITECTURE_GUARDRAILS.md`](docs/ARCHITECTURE_GUARDRAILS.md).

### Deployment rules

Seven rules in [`docs/DEPLOYMENT_RULES.md`](docs/DEPLOYMENT_RULES.md) — verify before deploy, pin deps, smoke after deploy, rollback order.

### Stability tests

`npm run verify` includes `tests/stability-foundation.test.ts` (layout, MP4/JPEG rules, health route).

### Cross-linked root docs

- [`FOUNDATION_BASELINE.md`](FOUNDATION_BASELINE.md)
- [`RECOVERY_ANCHOR.md`](RECOVERY_ANCHOR.md)
- [`STABLE_DEPLOYMENT_REFERENCE.md`](STABLE_DEPLOYMENT_REFERENCE.md)
- [`docs/SAFE_RECOVERY_PROTOCOL.md`](docs/SAFE_RECOVERY_PROTOCOL.md)
- [`FOUNDATION_STABILITY_REPORT.md`](FOUNDATION_STABILITY_REPORT.md)

## Maintenance

1. After foundation-affecting changes: update snapshots in `2MRRW_RECOVERY_SYSTEM/LOCKFILES/` and `DEPENDENCY_SNAPSHOTS/`.
2. Zip `2MRRW_RECOVERY_SYSTEM/` to desktop/cloud monthly.
3. Run `./scripts/create-recovery-checkpoint.sh` before risky merges.
4. Keep `FOUNDATION_STABILITY_REPORT.md` in sync after major lock-ins.

## Entry point

Start at [`2MRRW_RECOVERY_SYSTEM/README.md`](2MRRW_RECOVERY_SYSTEM/README.md).
