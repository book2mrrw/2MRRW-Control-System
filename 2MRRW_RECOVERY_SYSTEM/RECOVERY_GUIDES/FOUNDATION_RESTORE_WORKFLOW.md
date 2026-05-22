# Foundation Restore Workflow

Restore the **foundation-stable** era, validate, deploy, and merge fixes safely back to `main`.

## When to use

- Catalog timeouts or empty studio after deploy
- Guardrails or stability tests failing on `main`
- Audit/experimental branch merged too early
- You need a clean baseline before cherry-picking fixes

## Workflow

### 1. Tag checkout

```bash
git fetch --tags origin
git checkout foundation-stable-v1
```

Equivalent date tag: `foundation-stable-2026-05-19`.

### 2. Reproducible install

```bash
npm ci
# If lockfile drift:
# cp 2MRRW_RECOVERY_SYSTEM/LOCKFILES/foundation-lock.json package-lock.json && npm ci
```

### 3. Verify foundation contract

```bash
npm run verify
./scripts/check-architecture-guardrails.sh
```

### 4. Environment audit

Compare Vercel Production to [`ENVIRONMENT_VARIABLE_RECOVERY.md`](ENVIRONMENT_VARIABLE_RECOVERY.md). Minimum: Supabase URL, service role, media bucket, CORS origins.

### 5. Deploy

```bash
npx vercel --prod --yes
```

Or promote known-good deploy per [`DEPLOYMENT_RECOVERY_GUIDE.md`](DEPLOYMENT_RECOVERY_GUIDE.md).

### 6. Smoke

```bash
curl -sS "https://2mrrw-control-system.vercel.app/api/health/basic"
curl -sS "https://2mrrw-control-system.vercel.app/api/public/releases?limit=100"
```

### 7. Fix forward (required for permanent fix)

```bash
git checkout main
git pull origin main
git checkout -b recovery/$(date +%Y%m%d) foundation-stable-v1
# cherry-pick or minimal patch
npm run verify
git push -u origin recovery/$(date +%Y%m%d)
# Open PR → main
```

**Never:** `git push --force origin main`

## Stabilization vs tag commit

| Commit | Meaning |
|--------|---------|
| `0e1b15a` | Runtime stabilization (catalog bounds) |
| `6d988f5` | Tag `foundation-stable-v1` — includes foundation docs lock |

For code behavior, `foundation-stable-v1` is authoritative (includes stabilization).

## Pre-verification anchor (`c75cab5`)

Use only for **timeline comparison** or doc archaeology — not default production restore. For media, use `b26558e`.

## Cross-links

- [`../../FOUNDATION_BASELINE.md`](../../FOUNDATION_BASELINE.md)
- [`../../RECOVERY_ANCHOR.md`](../../RECOVERY_ANCHOR.md)
- [`../../docs/SAFE_RECOVERY_PROTOCOL.md`](../../docs/SAFE_RECOVERY_PROTOCOL.md)
- [`../../docs/BRANCH_STRATEGY.md`](../../docs/BRANCH_STRATEGY.md)
