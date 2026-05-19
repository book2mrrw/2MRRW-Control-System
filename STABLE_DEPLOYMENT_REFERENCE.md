# Stable Deployment Reference

Production control surface for rollback and env auditing. **Names only** for secrets — never commit values.

## Vercel project

| Field | Value |
|-------|--------|
| **Project** | `2-mrrw-control-system` |
| **Production URL** | https://2-mrrw-control-system.vercel.app |
| **Framework** | Next.js (`vercel.json` → `framework: nextjs`) |
| **Known-good deploy ID** | `dpl_3Q5z4Q1b61JrHXVCZPn9EmiBbjgm` |
| **Edge-verify deploy ID** | `dpl_HyJb2XSdrL5AS6cZoL1YdzmybWKQ` (MP4 matrix verified) |

## Environment variables (names only)

### Required for production catalog / DB

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SECRET_KEY`)
- `SUPABASE_MEDIA_BUCKET`
- `NEXT_PUBLIC_APP_URL`

### Supabase client (browser)

- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

### App / CORS / integration

- `NEXT_PUBLIC_CONTROL_SYSTEM_API_URL`
- `CONTROL_SYSTEM_ALLOWED_ORIGINS`
- `CONTROL_SYSTEM_FRONTEND_SHARED_SECRET`
- `CONTROL_SYSTEM_ADMIN_API_KEY`
- `ARTIST_PLATFORM_PUBLIC_URL` / `NEXT_PUBLIC_FRONTEND_URL` (optional; media fallbacks)

### Cron / ops

- `CRON_SECRET` (Production only)
- `VERCEL_PROJECT_ID`
- `VERCEL_ORG_ID`

### Stripe (if enabled)

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

### Local / ingestion only

- `FRONTEND_REPO_PATH`

Full template: `.env.example`

## Rollback steps

### Option A — Vercel dashboard (preferred)

1. Vercel → **2-mrrw-control-system** → **Deployments**.
2. Find a known-good deployment (e.g. `dpl_3Q5z4Q1b61JrHXVCZPn9EmiBbjgm`).
3. **⋯** → **Promote to Production** (or **Rollback** if plan supports it).

**Note:** Hobby plan may block multi-step rollback (`402` on `vercel rollback`). Use git tag + redeploy instead.

### Option B — One-command foundation recovery (preferred)

```bash
npm run foundation:recover          # tag + npm ci + verify + guardrails
npm run foundation:recover -- --deploy   # above + build + vercel --prod --yes
```

See `2MRRW_RECOVERY_SYSTEM/RECOVERY_GUIDES/ONE_COMMAND_RECOVERY.md` and `FOUNDATION_RECOVERY_COMMANDS_REPORT.md`.

### Option C — Git tag + redeploy (manual)

```bash
git fetch origin
git checkout foundation-stable-v1   # or foundation-stable-2026-05-19
npx vercel --prod --yes
```

### Option D — Git reset on a recovery branch (never on `main` without review)

```bash
git checkout -b recovery/$(date +%Y%m%d)
git reset --hard foundation-stable-v1
npx vercel --prod --yes
```

See `docs/SAFE_RECOVERY_PROTOCOL.md` — **never force-push `main`**.

## Post-rollback smoke

```bash
npm run foundation:verify
```

Or manual curls:

```bash
curl -sS "https://2-mrrw-control-system.vercel.app/api/health/basic"
curl -sS "https://2-mrrw-control-system.vercel.app/api/public/releases?limit=100" | jq '.releases | length'
```

Expect health `ok: true` and **9** public releases.

## Foundation npm commands

| Command | Purpose |
|---------|---------|
| `npm run foundation:recover` | Checkout `foundation-stable-v1`, `npm ci`, verify, guardrails |
| `npm run foundation:verify` | Local + production smoke (no checkout) |
| `npm run foundation:deploy` | Verify + build + `vercel --prod --yes` |
| `npm run foundation:rollback` | Git fetch tags + checkout foundation tag only |
| `npm run foundation:checkpoint` | Create dated recovery checkpoint tag |
