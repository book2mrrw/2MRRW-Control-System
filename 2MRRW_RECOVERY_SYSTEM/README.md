# 2MRRW Recovery System

Offline-first disaster recovery bundle for the 2MRRW platform. Lives in the **control** repo; the **artist-platform** frontend has a pointer README.

## Repositories

| Repo | Path | Production URL |
|------|------|----------------|
| Control | `2MRRW-Control-System` | https://2-mrrw-control-system.vercel.app |
| Frontend | `artist-platform` | https://artist-platform-silk.vercel.app |

## Directory map

| Directory | Contents |
|-----------|----------|
| `FOUNDATION_SNAPSHOTS/` | Checkpoint notes from `scripts/create-recovery-checkpoint.sh` |
| `DEPLOYMENT_REFERENCES/` | Vercel deploy IDs, rollback names |
| `ENVIRONMENT_BACKUPS/` | `.env.example` templates only — **no secrets** |
| `LOCKFILES/` | `foundation-lock.json` (`package-lock.json` at foundation lock-in) |
| `DEPENDENCY_SNAPSHOTS/` | `package.json` at foundation lock-in |
| `KNOWN_GOOD_COMMITS/` | Git SHAs, tags, deploy refs |
| `SYSTEM_STATE_REPORTS/` | Copies of root foundation docs |
| `RECOVERY_GUIDES/` | Step-by-step playbooks |
| `EMERGENCY_ROLLBACK/` | Copy-paste shell commands |

## Primary restore tag

**`foundation-stable-v1`** (alias `foundation-stable-2026-05-19`) → commit `6d988f5` — foundation docs lock at stabilization era `0e1b15a`.

## One-line disaster restore (control)

```bash
npm run foundation:recover -- --deploy
```

Manual equivalent:

```bash
git fetch --tags origin && git checkout foundation-stable-v1 && npm ci && npm run verify && ./scripts/check-architecture-guardrails.sh && npx vercel --prod --yes
```

See [`RECOVERY_GUIDES/ONE_COMMAND_RECOVERY.md`](RECOVERY_GUIDES/ONE_COMMAND_RECOVERY.md).

**Platform (control + frontend):** `npm run foundation:recover-platform` — [`RECOVERY_GUIDES/PLATFORM_ONE_COMMAND_RECOVERY.md`](RECOVERY_GUIDES/PLATFORM_ONE_COMMAND_RECOVERY.md).

## Copy this folder off-machine

Keep a second copy outside git:

1. **Desktop / Documents** — zip the whole `2MRRW_RECOVERY_SYSTEM/` tree after any foundation change.
2. **Cloud** — upload zip to iCloud Drive, Google Drive, or encrypted backup (1Password, Bitwarden secure note for env *names* only).
3. **External drive** — rsync both repos + this folder (see `RECOVERY_GUIDES/LOCAL_DESKTOP_BACKUP_STRATEGY.md`).

```bash
cd /path/to/2MRRW-Control-System
zip -r ~/Desktop/2MRRW-recovery-$(date +%Y%m%d).zip 2MRRW_RECOVERY_SYSTEM/
```

## Start here

1. **Full procedure** — `RECOVERY_GUIDES/FULL_RECOVERY_GUIDE.md`
2. **Under 15 minutes** — `RECOVERY_GUIDES/RAPID_RESTORE_CHECKLIST.md`
3. **Production down now** — `EMERGENCY_ROLLBACK/COMMANDS.sh`
4. **Scenarios** — `RECOVERY_GUIDES/EMERGENCY_RECOVERY_PLAYBOOK.md`

## Related root docs (live in repo)

- [`FOUNDATION_BASELINE.md`](../FOUNDATION_BASELINE.md)
- [`RECOVERY_ANCHOR.md`](../RECOVERY_ANCHOR.md)
- [`STABLE_DEPLOYMENT_REFERENCE.md`](../STABLE_DEPLOYMENT_REFERENCE.md)
- [`docs/SAFE_RECOVERY_PROTOCOL.md`](../docs/SAFE_RECOVERY_PROTOCOL.md)
- [`RECOVERY_SYSTEM_REPORT.md`](../RECOVERY_SYSTEM_REPORT.md)
