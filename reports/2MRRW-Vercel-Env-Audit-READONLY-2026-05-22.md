# Vercel Production env audit — 2mrrw-control-system

**Audit date:** 2026-05-22  
**Scope:** Production environment variables (read-only documentation; values not exported from Vercel in this run)

## Executive summary

| Item | Status |
|------|--------|
| Vercel CLI `env ls` | **Not run successfully** — invalid/missing token, no `VERCEL_TOKEN`, project not linked locally |
| Project slug | `2mrrw-control-system` |
| Production URL | https://2mrrw-control-system.vercel.app |
| Source of truth for names | `.env.example`, `OPERATIONS.md`, `ADMIN.md`, `process.env` usage in `src/` |
| Misnamed secret | **`CONTROL_SYSTEM_API_SECRET` is NOT in codebase** — use **`CONTROL_SYSTEM_ADMIN_API_KEY`** |
| Deprecated | **`SUPABASE_MEDIA_BUCKET`** — obsolete after R2 migration; do not set on new deployments |
| Production health | Health routes still failing in production (HTTP **500** reported; spot-check may show **404** if routes not deployed) — fix env + redeploy |

## Why CLI could not list variables

1. No valid session: `vercel login` required, or set `VERCEL_TOKEN` with appropriate scope.
2. Repo may lack `.vercel/project.json` from `vercel link` (needs `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` in `.env.example` when linking).
3. Without link + auth, `vercel env ls production` cannot resolve the project.

## Manual checklist (operator)

```bash
cd /path/to/2MRRW-Control-System
vercel login
vercel link    # select team + project 2mrrw-control-system
vercel env ls production
vercel env pull .env.local   # note: sensitive values may be redacted
```

After any change to **`NEXT_PUBLIC_*`** variables, trigger a **production redeploy** so client bundles pick up new public values.

## Full variable table (expected in Production)

Values are **not** copied from Vercel in this audit. Configure in Vercel Dashboard → Project → Settings → Environment Variables → **Production**.

| Variable | Required | Purpose / notes |
|----------|----------|-----------------|
| `NEXT_PUBLIC_APP_URL` | Yes | Canonical app URL (production: `https://2mrrw-control-system.vercel.app`) |
| `NEXT_PUBLIC_CONTROL_SYSTEM_API_URL` | Yes | Public API base for artist-platform / consumers |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon/publishable key (client-safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-side Supabase admin (prefer over legacy naming) |
| `SUPABASE_SECRET_KEY` | Alt | Supported alias for service role in some Vercel integrations |
| `CLOUDFLARE_R2_ACCOUNT_ID` | Yes | R2 S3 API account id in endpoint host |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | Yes | R2 access key |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | Yes | R2 secret |
| `CLOUDFLARE_R2_BUCKET_NAME` | Yes | e.g. `2mrrw-media` |
| `CLOUDFLARE_R2_ENDPOINT` | Yes | `https://<account_id>.r2.cloudflarestorage.com` (no bucket in path) |
| `NEXT_PUBLIC_R2_PUBLIC_URL` | Yes | Public CDN base for media URLs |
| `CRON_SECRET` | Yes (prod) | Secures `/api/cron/scheduled-releases`, `/api/admin/ops/backfill-covers`; mirror to GitHub `CRON_SECRET` for Actions |
| `CONTROL_SYSTEM_ADMIN_API_KEY` | Optional | `x-admin-token` / Bearer for scripted admin API (**not** `CONTROL_SYSTEM_API_SECRET`) |
| `CONTROL_SYSTEM_ALLOWED_ORIGINS` | Optional | CORS allowlist for public frontend APIs |
| `CONTROL_SYSTEM_FRONTEND_SHARED_SECRET` | Optional | Shared secret for trusted frontend calls |
| `STRIPE_SECRET_KEY` | If billing | Stripe server key |
| `STRIPE_WEBHOOK_SECRET` | If billing | Stripe webhook verification |
| `VERCEL_ORG_ID` | Local/link | Used by `vercel link` / tooling, not always runtime |
| `VERCEL_PROJECT_ID` | Local/link | Used by `vercel link` / tooling |
| `CONTROL_SYSTEM_URL` | Scripts/CI | e.g. GitHub secret for cron workflows pointing at production URL |
| `NEXT_PUBLIC_ARTIST_PLATFORM_URL` | If used | Referenced in app code |
| `NEXT_PUBLIC_FRONTEND_URL` | If used | Referenced in app code |
| `NEXT_PUBLIC_STOREFRONT_URL` | If used | Referenced in app code |
| `STOREFRONT_URL` | If used | Server-side storefront URL |
| `ARTIST_PLATFORM_API_URL` | If used | Internal integration URL |
| `ARTIST_PLATFORM_PUBLIC_URL` | If used | Public artist platform URL |
| `ADMIN_SEED_SECRET` | Dev/ops only | Seeding; typically not production |
| `SUPABASE_MEDIA_BUCKET` | **Deprecated** | **Do not set** — media on R2 only |

## Additional variables (from codebase / ops docs)

- **`CONTROL_SYSTEM_ALLOWED_ORIGINS`** — comma-separated origins (see `.env.example` for local + artist-platform example).
- **`CONTROL_SYSTEM_FRONTEND_SHARED_SECRET`** — pair with artist-platform / storefront trust model.
- **`CONTROL_SYSTEM_URL`** — documented for `scripts/trigger-scheduled-cron.sh` and GitHub Actions (repo secret, not always in Vercel).
- Cron schedule: Hobby uses `0 6 * * *` in `vercel.json`; Pro can use `*/5 * * * *`; GitHub workflow alternative documented in `.env.example`.

## Naming correction

Some runbooks or external docs may reference **`CONTROL_SYSTEM_API_SECRET`**. A repository search shows **no** references. The implemented name is **`CONTROL_SYSTEM_ADMIN_API_KEY`** (`ADMIN.md`, admin routes, scripts).

## Supabase vs R2

- **Supabase:** auth + Postgres only.
- **All media:** Cloudflare R2 + `NEXT_PUBLIC_R2_PUBLIC_URL`.
- **`SUPABASE_MEDIA_BUCKET`:** deprecated comment in `.env.example` (post migration f4b54e9).

## Production health routes

Expected routes (from `src/app/api/health/`):

| Route | Role |
|-------|------|
| `/api/health` | Aggregate health |
| `/api/health/basic` | Lightweight check |
| `/api/health/db` | Database connectivity |
| `/api/health/storage` | R2 / storage configuration |
| `/api/release-management/health` | Release management subsystem |

**Observation:** Production still returns errors on health endpoints (HTTP **500** when misconfigured). After env fixes, redeploy and verify:

```bash
curl -sS https://2mrrw-control-system.vercel.app/api/health | jq .
curl -sS https://2mrrw-control-system.vercel.app/api/health/storage | jq .
```

Cover/backfill ops: `POST /api/admin/ops/backfill-covers` with Bearer `CRON_SECRET` if storage health fails (`OPERATIONS.md`).

## `vercel env pull` caveat

Sensitive production values (especially **`CRON_SECRET`**) may appear **redacted** in pulled `.env.local`. Copy once from Vercel dashboard for local scripts (`./scripts/trigger-scheduled-cron.sh`). Rotate quarterly: Vercel → redeploy → GitHub `CRON_SECRET` → local `.env.local`.

## Reference artifact in this zip

- **`env.example.reference`** — copy of repository `.env.example` (placeholders only, no production secrets).

---

*Generated read-only audit for 2MRRW Control System. Do not commit production secret values.*
