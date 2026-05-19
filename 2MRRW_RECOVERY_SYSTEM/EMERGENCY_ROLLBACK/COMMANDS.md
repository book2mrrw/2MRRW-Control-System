# Emergency Rollback — Copy-Paste Commands

**Restore tag:** `foundation-stable-v1` (`6d988f5`)  
**Stabilization commit:** `0e1b15a`  
**Known-good Vercel deploy:** `dpl_3Q5z4Q1b61JrHXVCZPn9EmiBbjgm`

Executable script: [`COMMANDS.sh`](COMMANDS.sh)

---

## Fresh clone + foundation restore

```bash
git clone <YOUR_CONTROL_REPO_URL> 2MRRW-Control-System
cd 2MRRW-Control-System
git fetch --tags origin
git checkout foundation-stable-v1
npm ci
npm run verify
./scripts/check-architecture-guardrails.sh
```

## Production deploy

```bash
npx vercel --prod --yes
```

## Vercel dashboard rollback (no build)

1. Project **2-mrrw-control-system** → Deployments  
2. Deploy `dpl_3Q5z4Q1b61JrHXVCZPn9EmiBbjgm` → **Promote to Production**

## Post-deploy smoke

```bash
curl -sS "https://2-mrrw-control-system.vercel.app/api/health/basic"
curl -sS "https://2-mrrw-control-system.vercel.app/api/public/releases?limit=100"
```

Expect `ok: true` and **9** releases.

---

## Frontend redeploy (if UI broken)

```bash
git clone <YOUR_ARTIST_PLATFORM_REPO_URL> artist-platform
cd artist-platform
# Ensure Vercel Production has:
# NEXT_PUBLIC_CONTROL_SYSTEM_API_URL=https://2-mrrw-control-system.vercel.app
# NEXT_PUBLIC_SITE_URL=https://artist-platform-silk.vercel.app
npm ci
npx vercel --prod --yes
```

---

## Recovery branch (fix forward — never force-push main)

```bash
git fetch origin
git checkout -b recovery/$(date +%Y%m%d-%H%M) foundation-stable-v1
# apply minimal fix
npm run verify
npx vercel --prod --yes
git push -u origin recovery/$(date +%Y%m%d-%H%M)
# open PR to main
```

---

## Media-only regression

```bash
git checkout b26558e
npm ci && npm run verify
npx vercel --prod --yes
```

---

## One-line disaster restore (control)

```bash
git fetch --tags origin && git checkout foundation-stable-v1 && npm ci && npm run verify && ./scripts/check-architecture-guardrails.sh && npx vercel --prod --yes
```

---

## Forbidden

```bash
# NEVER:
git push --force origin main
```

See [`../../docs/SAFE_RECOVERY_PROTOCOL.md`](../../docs/SAFE_RECOVERY_PROTOCOL.md).
