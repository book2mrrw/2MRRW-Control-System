# Deployment Recovery Guide

Recover Vercel production for **2mrrw-control-system** and **artist-platform** without losing audit history.

## Control system — Vercel

| Field | Value |
|-------|--------|
| Project | `2mrrw-control-system` |
| Production URL | https://2mrrw-control-system.vercel.app |
| Known-good deploy | `dpl_3Q5z4Q1b61JrHXVCZPn9EmiBbjgm` |
| MP4 verify deploy | `dpl_HyJb2XSdrL5AS6cZoL1YdzmybWKQ` |
| Framework | Next.js (`vercel.json`) |

Full reference: [`../../STABLE_DEPLOYMENT_REFERENCE.md`](../../STABLE_DEPLOYMENT_REFERENCE.md) (copy in [`../DEPLOYMENT_REFERENCES/`](../DEPLOYMENT_REFERENCES/)).

## Rollback methods (best → fallback)

### 1. Dashboard promote

No local build. Promote a deployment that passed smoke (9 releases, health OK).

### 2. Redeploy from tag

```bash
git checkout foundation-stable-v1
npm ci && npm run verify
npx vercel --prod --yes
```

### 3. CLI rollback

```bash
npx vercel rollback
```

May fail with **402** on Hobby — use method 1 or 2.

## Frontend — artist-platform

| Field | Value |
|-------|--------|
| Production URL | https://artist-platform-silk.vercel.app |
| Depends on | Control API at `NEXT_PUBLIC_CONTROL_SYSTEM_API_URL` |

After control recovery, redeploy frontend if env or API contract changed.

## Pre-deploy gate (always)

```bash
npm ci
npm run verify
./scripts/check-architecture-guardrails.sh
```

Rules: [`../../docs/DEPLOYMENT_RULES.md`](../../docs/DEPLOYMENT_RULES.md).

## Post-deploy smoke

```bash
# Control
curl -sS "https://2mrrw-control-system.vercel.app/api/health/basic"
curl -sS "https://2mrrw-control-system.vercel.app/api/public/releases?limit=100"

# Optional: single MP4 check
curl -sS "https://2mrrw-control-system.vercel.app/api/public/releases?limit=100" | jq '.releases[] | select(.slug=="hour-glass") | .primaryAsset.type'
```

Expect `mp4` for animated singles when on foundation media baseline.

## Document the incident

Update [`../../docs/PROMPT_DEPLOY_TIMELINE.md`](../../docs/PROMPT_DEPLOY_TIMELINE.md) with commit, deploy ID, and rollback path used.
