# Environment Variable Recovery

**Names and purpose only.** Never commit secret values. Restore from Vercel dashboard, 1Password, or your secure store.

Templates (no secrets): [`../ENVIRONMENT_BACKUPS/`](../ENVIRONMENT_BACKUPS/)

---

## Control — `2-mrrw-control-system`

| Variable | Purpose | Vercel scope |
|----------|---------|--------------|
| `NEXT_PUBLIC_APP_URL` | Canonical app URL for links/redirects | Production, Preview |
| `NEXT_PUBLIC_CONTROL_SYSTEM_API_URL` | Self/API base when scripts call control | Production |
| `VERCEL_PROJECT_ID` | Vercel API / automation | Production |
| `VERCEL_ORG_ID` | Vercel API / automation | Production |
| `CONTROL_SYSTEM_ALLOWED_ORIGINS` | CORS allowlist (frontend origins) | Production |
| `CONTROL_SYSTEM_FRONTEND_SHARED_SECRET` | Shared auth between control + frontend | Production |
| `CONTROL_SYSTEM_ADMIN_API_KEY` | Admin API protection | Production |
| `CRON_SECRET` | Secures cron routes (`/api/cron/*`, backfill) | **Production only** |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser Supabase client | Production, Preview |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side DB/media (preferred) | Production |
| `SUPABASE_SECRET_KEY` | Alternate name for service role (integrations) | Production |
| `SUPABASE_MEDIA_BUCKET` | Storage bucket for protected media | Production |
| `ARTIST_PLATFORM_PUBLIC_URL` | Frontend URL for media fallbacks | Production (optional) |
| `NEXT_PUBLIC_FRONTEND_URL` | Same role as above (optional alias) | Production (optional) |
| `STRIPE_SECRET_KEY` | Stripe server API | Production (if billing on) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature | Production (if billing on) |
| `FRONTEND_REPO_PATH` | Local path for ingest scripts | Development / local only |

**Local template:** `ENVIRONMENT_BACKUPS/control.env.example`  
**Source of truth in repo:** [`.env.example`](../../.env.example)

### Control — recovery order

1. `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` + `SUPABASE_MEDIA_BUCKET`
2. `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. `CONTROL_SYSTEM_ALLOWED_ORIGINS` (include `https://artist-platform-silk.vercel.app`)
4. `NEXT_PUBLIC_APP_URL` → production control URL
5. Cron/admin secrets if ops routes needed

---

## Frontend — `artist-platform`

| Variable | Purpose | Vercel scope |
|----------|---------|--------------|
| `NEXT_PUBLIC_SITE_URL` | Canonical frontend URL | Production |
| `NEXT_PUBLIC_CONTROL_SYSTEM_API_URL` | **Catalog/hero API** — must point to healthy control | Production |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project | Production |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser Supabase | Production |
| `SUPABASE_SERVICE_ROLE_KEY` | Server routes needing elevated access | Production |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe.js | Production |
| `STRIPE_SECRET_KEY` | Checkout/webhooks server | Production |
| `STRIPE_WEBHOOK_SECRET` | Webhook verification | Production |
| `STRIPE_INNER_CIRCLE_PRICE_ID` | Optional existing subscription price | Production (optional) |
| `STRIPE_INNER_CIRCLE_PRODUCT_ID` | Optional existing product | Production (optional) |
| `PRINTFUL_API_KEY` | Merch fulfillment | Production (if merch on) |
| `ADMIN_SEED_SECRET` | One-time product seed route | Production (rare) |
| `GUEST_SESSION_SECRET` | Passwordless guest cookies | Production |

**Local template:** `ENVIRONMENT_BACKUPS/artist-platform.env.example`  
**Source in frontend repo:** `artist-platform/.env.example`

### Frontend — recovery order

1. `NEXT_PUBLIC_CONTROL_SYSTEM_API_URL=https://2-mrrw-control-system.vercel.app`
2. `NEXT_PUBLIC_SITE_URL=https://artist-platform-silk.vercel.app`
3. Supabase trio
4. Stripe keys if commerce enabled

---

## Pull env locally (names into file, values may be redacted)

```bash
# Control
cd 2MRRW-Control-System
vercel env pull .env.local

# Frontend
cd artist-platform
vercel env pull .env.local
```

If `CRON_SECRET` is redacted, copy once from Vercel dashboard.

---

## Cross-links

- [`../../STABLE_DEPLOYMENT_REFERENCE.md`](../../STABLE_DEPLOYMENT_REFERENCE.md)
- [`FULL_RECOVERY_GUIDE.md`](FULL_RECOVERY_GUIDE.md)
- [`../../docs/SAFE_RECOVERY_PROTOCOL.md`](../../docs/SAFE_RECOVERY_PROTOCOL.md) — Level 1 env smoke
