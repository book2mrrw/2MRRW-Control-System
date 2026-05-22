# Emergency Rollback Procedure

Fastest path to last known-good **production** behavior. Order matters.

## Decision tree

```
Production broken?
├─ Env misconfiguration only → fix Vercel env → Redeploy (no git)
├─ Bad deploy, good code on main → Vercel Promote known-good deploy
├─ Bad code on main → git checkout foundation-stable-v1 → verify → vercel --prod
└─ Media-only bug → checkout b26558e (not c75cab5) → verify MP4 singles → deploy
```

## Option 1 — Vercel promote (fastest, no build)

1. Vercel → project **2mrrw-control-system** → **Deployments**.
2. Select deploy `dpl_3Q5z4Q1b61JrHXVCZPn9EmiBbjgm` (or `dpl_HyJb2XSdrL5AS6cZoL1YdzmybWKQ` for MP4 verify).
3. **⋯** → **Promote to Production**.

If `vercel rollback` returns **402** (Hobby), use Option 2.

## Option 2 — Git tag + redeploy

```bash
cd /path/to/2MRRW-Control-System
git fetch --tags origin
git checkout foundation-stable-v1
npm ci
npm run verify
./scripts/check-architecture-guardrails.sh
npx vercel --prod --yes
```

## Option 3 — Recovery branch (fix forward)

```bash
git fetch origin
git checkout -b recovery/$(date +%Y%m%d-%H%M) foundation-stable-v1
# minimal fix, cherry-picks
npm run verify
npx vercel --prod --yes
# PR to main — never force-push main
```

## Post-rollback smoke (required)

```bash
curl -sS "https://2mrrw-control-system.vercel.app/api/health/basic"
curl -sS "https://2mrrw-control-system.vercel.app/api/public/releases?limit=100"
```

## Copy-paste bundle

See [`../EMERGENCY_ROLLBACK/COMMANDS.sh`](../EMERGENCY_ROLLBACK/COMMANDS.sh) and [`../EMERGENCY_ROLLBACK/COMMANDS.md`](../EMERGENCY_ROLLBACK/COMMANDS.md).

## Cross-links

- [`../../docs/SAFE_RECOVERY_PROTOCOL.md`](../../docs/SAFE_RECOVERY_PROTOCOL.md)
- [`../../RECOVERY_ANCHOR.md`](../../RECOVERY_ANCHOR.md)
- [`../../STABLE_DEPLOYMENT_REFERENCE.md`](../../STABLE_DEPLOYMENT_REFERENCE.md)
- [`DEPLOYMENT_RECOVERY_GUIDE.md`](DEPLOYMENT_RECOVERY_GUIDE.md)
