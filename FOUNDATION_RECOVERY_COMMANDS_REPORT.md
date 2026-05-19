# Foundation Recovery Commands Report

**Generated:** 2026-05-19  
**Foundation tag:** `foundation-stable-v1` → `6d988f573af1fd6f31daa4b90d25bbf92f840ce1` (`6d988f5`)  
**Production URL:** https://2-mrrw-control-system.vercel.app

## Summary

One-command foundation recovery is implemented via npm scripts and `scripts/` shell entrypoints. All scripts use `set -euo pipefail`, `cd` to repo root, and colored step output.

## npm commands

| npm script | Shell entrypoint | Description |
|------------|------------------|-------------|
| `foundation:recover` | `scripts/run-foundation-recovery.sh` | Fetch tags, checkout foundation, `npm ci`, verify, guardrails |
| `foundation:verify` | `scripts/verify-foundation-state.sh` | Layout rule, guardrails, verify, prod health + releases |
| `foundation:deploy` | `scripts/run-foundation-deploy.sh` | Verify + `npm run build` + `npx vercel --prod --yes` |
| `foundation:rollback` | `scripts/run-safe-rollback.sh` | Git fetch tags + checkout tag (warns if dirty) |
| `foundation:checkpoint` | `scripts/create-recovery-checkpoint.sh` | Dated checkpoint tag + snapshot markdown |

Alias: `scripts/run-stable-restore.sh` → `run-foundation-recovery.sh`.

## Command 3 — Platform (control + frontend)

| npm script | Shell entrypoint | Description |
|------------|------------------|-------------|
| `foundation:recover-platform` | `scripts/run-platform-foundation-recovery.sh` | Backend `foundation:recover`, then frontend `recover:foundation` |
| `foundation:verify-platform` | `scripts/verify-platform-foundation-state.sh` | `foundation:verify` + frontend `verify:foundation` |

### Platform flags

| Flag | Effect |
|------|--------|
| `--deploy` | Backend recover+deploy, backend verify, frontend recover, `verify:foundation`, `recover:deploy -- --deploy` |
| `--verify-only` | Both verify scripts only (no git checkout) |
| `--dry-run` | Print planned commands |

### Platform env

| Variable | Default | Used by |
|----------|---------|---------|
| `ARTIST_PLATFORM_PATH` | sibling `../artist-platform` or `~/artist-platform` | platform scripts |

Guide: `2MRRW_RECOVERY_SYSTEM/RECOVERY_GUIDES/PLATFORM_ONE_COMMAND_RECOVERY.md`.

### Flags (control-only)

- `npm run foundation:recover -- --deploy` — runs deploy after recovery

### Environment

| Variable | Default | Used by |
|----------|---------|---------|
| `CONTROL_URL` | `https://2-mrrw-control-system.vercel.app` | verify, deploy post-smoke |
| `EXPECTED_RELEASES` | `9` | verify |
| `CURL_MAX_TIME` | `20` | verify |
| `FOUNDATION_TAG` | `foundation-stable-v1` | rollback, recover |

## verify-foundation-state.sh checks

1. `src/app/layout.tsx` — must not contain `buildControlCatalogPayload`
2. `./scripts/check-architecture-guardrails.sh`
3. `npm run verify` (typecheck + foundation tests)
4. `GET ${CONTROL_URL}/api/health/basic` — `ok: true`
5. `GET ${CONTROL_URL}/api/public/releases?limit=100` — release count = 9

## Documentation & IDE

| Artifact | Path |
|----------|------|
| 10-step flow | `2MRRW_RECOVERY_SYSTEM/RECOVERY_GUIDES/ONE_COMMAND_RECOVERY.md` |
| Platform (Command 3) | `2MRRW_RECOVERY_SYSTEM/RECOVERY_GUIDES/PLATFORM_ONE_COMMAND_RECOVERY.md` |
| Emergency playbook | `2MRRW_RECOVERY_SYSTEM/RECOVERY_GUIDES/EMERGENCY_RECOVERY_PLAYBOOK.md` |
| Known-good commits | `2MRRW_RECOVERY_SYSTEM/KNOWN_GOOD_COMMITS/README.md` |
| Stable deploy ref | `STABLE_DEPLOYMENT_REFERENCE.md` |
| VS Code tasks | `.vscode/tasks.json` |
| Cursor rule | `.cursor/rules/foundation-recovery.mdc` |

## VS Code tasks

- `RUN_FOUNDATION_RECOVERY`
- `VERIFY_FOUNDATION_STATE`
- `RUN_FOUNDATION_DEPLOY`
- `CREATE_RECOVERY_CHECKPOINT`
- `RUN_PLATFORM_FOUNDATION_RECOVERY`
- `VERIFY_PLATFORM_FOUNDATION_STATE`

## User one-liner

```bash
npm run foundation:recover
```

With production deploy:

```bash
npm run foundation:recover -- --deploy
```

Platform (control + frontend):

```bash
npm run foundation:recover-platform
npm run foundation:recover-platform -- --deploy
npm run foundation:verify-platform
```
