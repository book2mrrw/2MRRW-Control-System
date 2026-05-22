# Deployment Rules

Seven rules for production deploys on the 2MRRW Control System foundation.

## Rule 1 — Verify before deploy

Run locally on the commit you intend to ship:

```bash
npm ci
npm run verify
./scripts/check-architecture-guardrails.sh
```

No production deploy if typecheck, tests, or guardrails fail.

## Rule 2 — Pin foundation dependencies

`next`, `react`, `react-dom`, and `@supabase/supabase-js` must be **exact versions** in `package.json` (no `latest`). Commit `package-lock.json` when lockfile changes.

## Rule 3 — Sacred `main`

`main` is the stable foundation branch. Experimental work uses `experimental/*` or `audit/*`. Merge via PR after verify — never force-push `main`.

## Rule 4 — No layout catalog hydration

Root `layout.tsx` must keep `initialCatalog={[]}` and must not call `buildControlCatalogPayload` or set `force-dynamic`.

## Rule 5 — Post-deploy smoke (required)

After every production deploy:

```bash
curl -sS "https://2mrrw-control-system.vercel.app/api/health/basic"
curl -sS "https://2mrrw-control-system.vercel.app/api/public/releases?limit=100"
```

Expect `ok: true` on health and **9** releases on the public catalog API.

## Rule 6 — Rollback order

1. Vercel **Promote** known-good deployment  
2. Else `git checkout foundation-stable-v1` + `npx vercel --prod --yes`  
3. Never force-push `main` to “fix” production

See `STABLE_DEPLOYMENT_REFERENCE.md` and `docs/SAFE_RECOVERY_PROTOCOL.md`.

## Rule 7 — Document deploy decisions

Record significant deploys in `docs/PROMPT_DEPLOY_TIMELINE.md` (commit, deploy ID, rollback notes). Update `FOUNDATION_STABILITY_REPORT.md` after foundation-affecting changes.
