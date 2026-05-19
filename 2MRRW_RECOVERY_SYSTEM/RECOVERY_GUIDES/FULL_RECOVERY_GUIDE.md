# Full Recovery Guide — 2MRRW Platform

End-to-end recovery for **control** and **frontend** when production is broken, repos are lost, or you need a clean known-good deploy.

## Repositories

| Component | Local path (example) | Git remote | Production |
|-----------|-------------------|------------|------------|
| Control | `~/2MRRW-Control-System` | Your `origin` | https://2-mrrw-control-system.vercel.app |
| Frontend | `~/artist-platform` | Your `origin` | https://artist-platform-silk.vercel.app |

**Foundation restore tag (control):** `foundation-stable-v1` → `6d988f5` (stabilization era `0e1b15a`).

## Related documentation

- [`FOUNDATION_BASELINE.md`](../../FOUNDATION_BASELINE.md) — what works at lock-in
- [`RECOVERY_ANCHOR.md`](../../RECOVERY_ANCHOR.md) — tags and restore policy
- [`STABLE_DEPLOYMENT_REFERENCE.md`](../../STABLE_DEPLOYMENT_REFERENCE.md) — Vercel + env names
- [`docs/SAFE_RECOVERY_PROTOCOL.md`](../../docs/SAFE_RECOVERY_PROTOCOL.md) — level 1–5 recovery
- [`RAPID_RESTORE_CHECKLIST.md`](RAPID_RESTORE_CHECKLIST.md) — abbreviated steps
- [`ENVIRONMENT_VARIABLE_RECOVERY.md`](ENVIRONMENT_VARIABLE_RECOVERY.md) — env names only

---

## Phase A — Assess

1. Note symptoms (504, empty catalog, hydration error, failed deploy, bad audit merge).
2. Pick scenario in [`EMERGENCY_RECOVERY_PLAYBOOK.md`](EMERGENCY_RECOVERY_PLAYBOOK.md).
3. Run smoke without deploying:

```bash
curl -sS "https://2-mrrw-control-system.vercel.app/api/health/basic"
curl -sS "https://2-mrrw-control-system.vercel.app/api/public/releases?limit=100"
```

Expect `ok: true` and **9** releases.

---

## Phase B — Recover control system

### B1. Clone or refresh

```bash
git clone <CONTROL_REPO_URL> 2MRRW-Control-System
cd 2MRRW-Control-System
git fetch --tags origin
```

### B2. Checkout foundation

```bash
git checkout foundation-stable-v1
npm ci
npm run verify
./scripts/check-architecture-guardrails.sh
```

Use lockfile snapshot if `npm ci` fails on a dirty tree:

```bash
cp 2MRRW_RECOVERY_SYSTEM/LOCKFILES/foundation-lock.json package-lock.json
npm ci
```

### B3. Environment

Restore Vercel Production env from dashboard (names in [`ENVIRONMENT_VARIABLE_RECOVERY.md`](ENVIRONMENT_VARIABLE_RECOVERY.md)). Templates: `2MRRW_RECOVERY_SYSTEM/ENVIRONMENT_BACKUPS/control.env.example`.

### B4. Deploy control

```bash
npx vercel --prod --yes
```

Or Vercel dashboard → promote `dpl_3Q5z4Q1b61JrHXVCZPn9EmiBbjgm` (see [`DEPLOYMENT_RECOVERY_GUIDE.md`](DEPLOYMENT_RECOVERY_GUIDE.md)).

### B5. Post-deploy smoke

```bash
curl -sS "https://2-mrrw-control-system.vercel.app/api/health/basic"
curl -sS "https://2-mrrw-control-system.vercel.app/api/public/releases?limit=100"
```

---

## Phase C — Recover frontend (artist-platform)

**Preferred (from control repo):** Command 3 platform recovery — see [`PLATFORM_ONE_COMMAND_RECOVERY.md`](PLATFORM_ONE_COMMAND_RECOVERY.md).

```bash
cd ~/2MRRW-Control-System
npm run foundation:recover-platform
npm run foundation:verify-platform
```

With production deploy for both apps:

```bash
npm run foundation:recover-platform -- --deploy
```

Manual steps below if you need fine-grained control.

### C1. Clone or refresh

```bash
git clone <ARTIST_PLATFORM_REPO_URL> artist-platform
cd artist-platform
```

Or from control repo only:

```bash
cd ~/2MRRW-Control-System
npm run foundation:recover-platform -- --dry-run
```

### C2. Critical env

Set in Vercel Production (names only — values from dashboard):

- `NEXT_PUBLIC_CONTROL_SYSTEM_API_URL=https://2-mrrw-control-system.vercel.app`
- `NEXT_PUBLIC_SITE_URL=https://artist-platform-silk.vercel.app`
- Supabase + Stripe vars per [`ENVIRONMENT_VARIABLE_RECOVERY.md`](ENVIRONMENT_VARIABLE_RECOVERY.md)

Template: `2MRRW_RECOVERY_SYSTEM/ENVIRONMENT_BACKUPS/artist-platform.env.example` (in control repo bundle).

### C3. Frontend foundation recover (manual)

```bash
cd ~/artist-platform
npm run recover:foundation
npm run verify:foundation
npm run recover:deploy -- --deploy   # production only when intended
```

Verify site loads and catalog/hero calls control API.

---

## Phase D — Merge forward (after hotfix)

Never force-push `main`.

```bash
git checkout -b recovery/$(date +%Y%m%d) foundation-stable-v1
# cherry-pick minimal fix
npm run verify
npx vercel --prod --yes
# open PR recovery/* → main
```

See [`FOUNDATION_RESTORE_WORKFLOW.md`](FOUNDATION_RESTORE_WORKFLOW.md).

---

## Phase E — Offline bundle

Copy `2MRRW_RECOVERY_SYSTEM/` to desktop/cloud per [`LOCAL_DESKTOP_BACKUP_STRATEGY.md`](LOCAL_DESKTOP_BACKUP_STRATEGY.md).

---

## Emergency one-liner (control only)

```bash
git fetch --tags origin && git checkout foundation-stable-v1 && npm ci && npm run verify && ./scripts/check-architecture-guardrails.sh && npx vercel --prod --yes
```
