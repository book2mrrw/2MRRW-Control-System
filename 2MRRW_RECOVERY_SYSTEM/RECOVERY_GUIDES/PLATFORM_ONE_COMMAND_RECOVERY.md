# Platform One-Command Recovery (Command 3)

Unified **control + frontend** foundation recovery from the control repo. Thin wrappers only — individual recover scripts are unchanged.

## Primary commands

```bash
cd /path/to/2MRRW-Control-System
npm run foundation:recover-platform
```

Recover **and** deploy both production apps:

```bash
npm run foundation:recover-platform -- --deploy
```

Verify both repos without checkout:

```bash
npm run foundation:verify-platform
```

Dry-run (print steps only):

```bash
npm run foundation:recover-platform -- --dry-run
npm run foundation:recover-platform -- --deploy --dry-run
```

---

## Command 3 reference

| npm script | Shell script | Purpose |
|------------|--------------|---------|
| `foundation:recover-platform` | `scripts/run-platform-foundation-recovery.sh` | Backend recover, then frontend recover (optional deploy chain) |
| `foundation:verify-platform` | `scripts/verify-platform-foundation-state.sh` | `foundation:verify` + `verify:foundation` |

### Flags (`foundation:recover-platform`)

| Flag | Behavior |
|------|----------|
| *(none)* | `foundation:recover` → `recover:foundation` |
| `--deploy` | Backend `foundation:recover -- --deploy` → `foundation:verify` → `recover:foundation` → `verify:foundation` → `recover:deploy -- --deploy` |
| `--verify-only` | Skip recover; run `foundation:verify` + `verify:foundation` |
| `--dry-run` | Print commands only |

### Frontend repo resolution

1. `ARTIST_PLATFORM_PATH` (env)
2. Sibling `../artist-platform` next to control repo
3. `/Users/recharge/artist-platform`

---

## Known-good anchors (Step 1)

| Repo | Anchor | Commit |
|------|--------|--------|
| Control | tag `foundation-stable-v1` | `6d988f5` |
| Frontend | branch `frontend-stable-foundation` | `ce6ae20` |
| Frontend main (reference) | `main` | `914c765` |

Frontend recovery details: `artist-platform/docs/foundation/FRONTEND_RECOVERY_COMMAND_REPORT.md`.

---

## VS Code tasks

- `RUN_PLATFORM_FOUNDATION_RECOVERY`
- `VERIFY_PLATFORM_FOUNDATION_STATE`

---

## Related

- Control only: [`ONE_COMMAND_RECOVERY.md`](ONE_COMMAND_RECOVERY.md)
- Full platform procedure: [`FULL_RECOVERY_GUIDE.md`](FULL_RECOVERY_GUIDE.md) Phase C
- [`../../FOUNDATION_RECOVERY_COMMANDS_REPORT.md`](../../FOUNDATION_RECOVERY_COMMANDS_REPORT.md) — Command 3 section
