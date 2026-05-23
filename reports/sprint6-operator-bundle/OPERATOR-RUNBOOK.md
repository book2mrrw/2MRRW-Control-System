# 2MRRW Operator Runbook (production)

**Date:** 2026-05-23  
**Control:** https://2mrrw-control-system.vercel.app  
**Storefront:** https://artist-platform-silk.vercel.app  
**Checkpoint:** `checkpoint-20260523-000652`  
**Control production deploy (Sprint 5):** `7fcf4d3` — P4.5 public catalog 503 when durable empty

---

## 1. Required production environment variables

Names only — set values in Vercel (never commit secrets). Full recovery guide: `2MRRW_RECOVERY_SYSTEM/RECOVERY_GUIDES/ENVIRONMENT_VARIABLE_RECOVERY.md`

### Control (`2mrrw-control-system`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_APP_URL` | Yes | Canonical control URL |
| `NEXT_PUBLIC_CONTROL_SYSTEM_API_URL` | Yes | Self/API base for scripts |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Database |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Browser Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server DB access |
| `SUPABASE_MEDIA_BUCKET` | Yes | Protected media bucket name |
| `NEXT_PUBLIC_R2_PUBLIC_URL` | Yes | Public artwork/preview URLs in API |
| `CLOUDFLARE_R2_ACCOUNT_ID` | Yes | R2 S3 API |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | Yes | R2 credentials |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | Yes | R2 credentials |
| `CLOUDFLARE_R2_BUCKET_NAME` | Yes | Media bucket |
| `CLOUDFLARE_R2_ENDPOINT` | Yes | `https://<account>.r2.cloudflarestorage.com` |
| `CONTROL_SYSTEM_ALLOWED_ORIGINS` | Yes | CORS — storefront + `https://2mrrw.com` |
| `CONTROL_SYSTEM_FRONTEND_SHARED_SECRET` | If used | Cross-app auth |
| `CONTROL_SYSTEM_ADMIN_API_KEY` | If used | Admin API protection |
| `STOREFRONT_SYNC_URL` | Yes | Catalog push target (storefront origin) |
| `ADMIN_SEED_SECRET` | Yes (sync) | Must match storefront for catalog ingest |
| `CRON_SECRET` | Yes | `/api/cron/*` and ops cron |
| `STRIPE_SECRET_KEY` | If billing | Stripe API |
| `STRIPE_WEBHOOK_SECRET` | If billing | Webhooks |
| `VERCEL_PROJECT_ID` / `VERCEL_ORG_ID` | Optional | Vercel automation |
| `ALLOW_CONTROL_STRIPE_SEED` | **Never prod** | Dev-only demo entitlements |

### Storefront (`artist-platform`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SITE_URL` | Yes | Canonical storefront URL |
| `NEXT_PUBLIC_BASE_URL` | Yes | Checkout redirects / absolute URLs |
| `NEXT_PUBLIC_CONTROL_SYSTEM_API_URL` | Yes | `https://2mrrw-control-system.vercel.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Browser client |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server routes |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | If commerce | Stripe.js |
| `STRIPE_SECRET_KEY` | If commerce | Checkout + webhooks |
| `STRIPE_WEBHOOK_SECRET` | If commerce | Webhook verification |
| `STRIPE_INNER_CIRCLE_PRICE_ID` | Optional | Existing subscription price |
| `STRIPE_INNER_CIRCLE_PRODUCT_ID` | Optional | Existing product |
| `PRINTFUL_API_KEY` | If merch | Printful fulfillment |
| `ADMIN_SEED_SECRET` | Yes | Catalog sync + diagnostics |
| `GUEST_SESSION_SECRET` | Yes | Guest/session cookies |
| `GIFT_REMINDER_SIGNING_SECRET` | Recommended | Signed gift reminder links |
| `NEXT_PUBLIC_R2_PUBLIC_URL` | Yes | CDN base for entitled media |
| `CLOUDFLARE_R2_*` | Yes | Same bucket as control when serving R2 |

---

## 2. Deploy procedure

1. `npm run typecheck && npm run build` in each repo.
2. Control: `npx vercel --prod --yes` from `2MRRW-Control-System`.
3. Storefront: `npx vercel --prod --yes` from `artist-platform`.
4. Run `SMOKE-TESTS.md` matrix.
5. Confirm storefront Supabase migrations (`MIGRATIONS-CHECKLIST.md`) if not already applied.

**Rollback:** Vercel dashboard → previous deployment. Catalog emergency on control: `DISABLE_CATALOG_SYNC=1` (see `docs/MIGRATION_MANIFEST.md`).

---

## 3. Verification commands (Sprint 6 run)

### Control `foundation:verify` (includes production smoke)

```bash
cd /Users/recharge/2MRRW-Control-System
CONTROL_URL=https://2mrrw-control-system.vercel.app EXPECTED_RELEASES=9 npm run foundation:verify
```

**Sprint 6 result:** `npm run verify` still fails after top-level-await fix — first failure at `testMediaUploadIntentFoundation` (EP routing destinations drift vs test expectation). **Workaround:** use production smoke above + `typecheck && build`. Production smoke **passed** 2026-05-23: health 200, 9 releases, storefront 200, stream 401.

### Platform `foundation:verify-platform`

```bash
npm run foundation:verify-platform
```

**Sprint 6 result:** blocked on control `npm run verify` (same test drift). Storefront `verify:foundation` reports HEAD `4d18dc2` ≠ anchor `f78d6ec` (expected after sprint commits; update anchor when cutting new checkpoint).

### Entitlements parity (storefront)

```bash
cd /Users/recharge/artist-platform
# Requires .env.local or exported Supabase URL + service role key
node scripts/check-entitlements-parity.mjs
# Or production diagnostic:
curl -fsS -H "x-admin-seed-secret: $ADMIN_SEED_SECRET" \
  "https://artist-platform-silk.vercel.app/api/admin/diagnostics/entitlements-parity" | jq .
```

**Sprint 6 result:** local script needs `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`; dynamic import of `@/lib` may fail outside Next build — prefer production diagnostic route when local env unset.

---

## 4. Related scripts

| Script | Repo | Purpose |
|--------|------|---------|
| `scripts/check-entitlements-parity.mjs` | storefront | CI parity (exit 2 on drift) |
| `scripts/test-library-stream-e2e.mjs` | storefront | Authenticated stream smoke |
| `scripts/trigger-scheduled-cron.sh` | control | Cron smoke with `CRON_SECRET` |
| `npm run foundation:checkpoint-platform` | control | Git checkpoint tags |

---

## 5. Git / deploy status (Sprint 6)

| Repo | HEAD | Remote |
|------|------|--------|
| Control | `7fcf4d3` (+ pending `chore(p6)` test runner fix) | In sync with `origin/main` |
| Storefront | `4d18dc2` | In sync with `origin/main` |

Production already on Sprint 5 control deploy; no redeploy required unless new commits pushed.
