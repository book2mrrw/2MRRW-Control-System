# One-Command Foundation Recovery

Automated 10-step flow to restore **2MRRW Control System** from the foundation tag `foundation-stable-v1` (`6d988f5`).

## Primary command

```bash
npm run foundation:recover
```

Deploy to production in the same run:

```bash
npm run foundation:recover -- --deploy
```

---

## Automated flow (10 steps)

| Step | Action | Command / script |
|------|--------|------------------|
| 1 | Warn if dirty working tree | `run-foundation-recovery.sh` |
| 2 | Fetch tags from `origin` | `git fetch --tags origin` |
| 3 | Checkout foundation tag | `git checkout foundation-stable-v1` |
| 4 | Clean install dependencies | `npm ci` |
| 5 | Typecheck + foundation tests | `npm run verify` |
| 6 | Architecture guardrails | `./scripts/check-architecture-guardrails.sh` |
| 7 | (Optional) Verify + build + deploy | `npm run foundation:deploy` or `--deploy` |
| 8 | Post-deploy production smoke | `verify-foundation-state.sh` (health + 9 releases) |
| 9 | Print next steps (verify / checkpoint / docs) | recovery script footer |
| 10 | Record future checkpoint | `npm run foundation:checkpoint` |

Steps 1–6 run in **`foundation:recover`**. Step 7–8 run only with **`--deploy`** or **`foundation:deploy`**.

---

## Command reference

| npm script | Shell script | Purpose |
|------------|--------------|---------|
| `foundation:recover` | `scripts/run-foundation-recovery.sh` | Full recovery (tag + ci + verify + guardrails) |
| `foundation:verify` | `scripts/verify-foundation-state.sh` | No checkout — local + prod checks |
| `foundation:deploy` | `scripts/run-foundation-deploy.sh` | Verify + build + `vercel --prod --yes` |
| `foundation:rollback` | `scripts/run-safe-rollback.sh` | Git only — fetch tags + checkout tag |
| `foundation:checkpoint` | `scripts/create-recovery-checkpoint.sh` | Dated recovery tag + snapshot note |

Aliases:

- `scripts/run-stable-restore.sh` → same as `run-foundation-recovery.sh`

---

## Verify without changing branch

```bash
npm run foundation:verify
```

Checks:

- `src/app/layout.tsx` — no `buildControlCatalogPayload`
- `./scripts/check-architecture-guardrails.sh`
- `npm run verify`
- `GET ${CONTROL_URL}/api/health/basic` (default production URL)
- `GET ${CONTROL_URL}/api/public/releases?limit=100` — expect **9** releases

Override URL:

```bash
CONTROL_URL=https://2mrrw-control-system.vercel.app npm run foundation:verify
```

---

## Rollback only (no npm)

```bash
npm run foundation:rollback
```

---

## VS Code tasks

Run **Terminal → Run Task** → `RUN_FOUNDATION_RECOVERY`, `VERIFY_FOUNDATION_STATE`, `RUN_FOUNDATION_DEPLOY`, or `CREATE_RECOVERY_CHECKPOINT`.

---

## Related docs

- [`EMERGENCY_RECOVERY_PLAYBOOK.md`](EMERGENCY_RECOVERY_PLAYBOOK.md)
- [`../../STABLE_DEPLOYMENT_REFERENCE.md`](../../STABLE_DEPLOYMENT_REFERENCE.md)
- [`../KNOWN_GOOD_COMMITS/README.md`](../KNOWN_GOOD_COMMITS/README.md)
- [`../../FOUNDATION_RECOVERY_COMMANDS_REPORT.md`](../../FOUNDATION_RECOVERY_COMMANDS_REPORT.md)
