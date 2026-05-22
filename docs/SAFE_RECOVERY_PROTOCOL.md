# Safe Recovery Protocol

Step-by-step recovery when production regresses. **Protect `main`.**

## Principles

1. **Never force-push `main`** — history is the audit trail.
2. Prefer **Vercel promote** or **tag checkout + redeploy** over destructive git.
3. Run **`npm run verify`** and **`./scripts/check-architecture-guardrails.sh`** before any production deploy.
4. Post-deploy smoke is mandatory (see Phase 8 in `FOUNDATION_STABILITY_REPORT.md`).

## Level 1 — Smoke failure only (runtime / env)

1. Check https://2-mrrw-control-system.vercel.app/api/health/basic
2. Check `/api/health/db`, `/api/health/storage`, and Vercel env: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, plus all R2 vars (`CLOUDFLARE_R2_ACCOUNT_ID`, `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`, `CLOUDFLARE_R2_BUCKET_NAME`, `CLOUDFLARE_R2_ENDPOINT`, `NEXT_PUBLIC_R2_PUBLIC_URL`)
3. Redeploy **without code change** if env was fixed: Vercel → Redeploy latest `main`

## Level 2 — Vercel rollback

1. Open Vercel → **2-mrrw-control-system** → **Deployments**
2. Promote last known-good deploy (`dpl_3Q5z4Q1b61JrHXVCZPn9EmiBbjgm` or edge-verify `dpl_HyJb2XSdrL5AS6cZoL1YdzmybWKQ`)
3. If `vercel rollback` returns **402** (Hobby limit), use git tag restore (Level 3)

## Level 3 — Git tag restore

```bash
git fetch --tags origin
git checkout foundation-stable-v1
npm ci
npm run verify
./scripts/check-architecture-guardrails.sh
npx vercel --prod --yes
```

Post-smoke:

```bash
curl -sS "https://2-mrrw-control-system.vercel.app/api/health/basic"
curl -sS "https://2-mrrw-control-system.vercel.app/api/public/releases?limit=100"
```

Expect **9** releases.

## Level 4 — Recovery branch (bad commits on main)

Do **not** rewrite `main` on the remote.

```bash
git fetch origin
git checkout -b recovery/$(date +%Y%m%d-%H%M) foundation-stable-v1
# cherry-pick fixes if needed
npm run verify
npx vercel --prod --yes
# open PR recovery/* → main after review
```

## Level 5 — Media-specific regression

See `docs/PRE_VERIFICATION_RECOVERY.md`:

- MP4 singles baseline: `b26558e` / `27bca5a`
- Pre-verify timeline anchor: `c75cab5` (docs only)
- Avoid restoring `025812b`..`eae73ab` universal pipeline range

## Forbidden actions

| Action | Why |
|--------|-----|
| `git push --force origin main` | Destroys foundation audit trail |
| `buildControlCatalogPayload` in `layout.tsx` | Blocks every request |
| `force-dynamic` on root `layout.tsx` | Disables static optimizations globally |
| Deploy with `next` or `@supabase/supabase-js` on `latest` | Unpinned regressions |

## Tags reference

| Tag | Use |
|-----|-----|
| `foundation-stable-v1` | Primary restore |
| `foundation-stable-2026-05-19` | Date alias |

See `RECOVERY_ANCHOR.md`.

## Recovery system bundle

Offline playbooks, env templates, and emergency commands: `2MRRW_RECOVERY_SYSTEM/RECOVERY_GUIDES/` (start with `FULL_RECOVERY_GUIDE.md` or `RAPID_RESTORE_CHECKLIST.md`).
