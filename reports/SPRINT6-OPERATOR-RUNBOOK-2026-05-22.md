# Sprint 6 — Operator Runbook (production)

**Date:** 2026-05-23  
**Control production:** https://2mrrw-control-system.vercel.app  
**Storefront production:** https://artist-platform-silk.vercel.app  
**Control deploy (Sprint 5 P4.5):** `dpl_8DanhgyV1SGEC7sb4cb7AzREBTZy` (`7fcf4d3`)  
**Storefront deploy:** `dpl_4UL1dHuuG1DWLwbQbidQH4foAuUL` (`4d18dc2`, no code delta)

---

## 1. Required production environment variables

### Control (`2mrrw-control-system`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_APP_URL` | Yes | Canonical control URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Database |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server DB access |
| `SUPABASE_MEDIA_BUCKET` | Yes | Protected media bucket |
| `NEXT_PUBLIC_R2_PUBLIC_URL` | Yes | Public artwork/preview URLs in API |
| `CLOUDFLARE_R2_*` (account, keys, bucket, endpoint) | Yes | Storage read/write |
| `CONTROL_SYSTEM_ALLOWED_ORIGINS` | Yes | CORS — include storefront + `https://2mrrw.com` |
| `STOREFRONT_SYNC_URL` | Yes | Catalog push target (storefront ingest URL) |
| `ADMIN_SEED_SECRET` | Yes (sync) | Must match storefront for catalog sync |
| `CRON_SECRET` | Yes | `/api/cron/*` |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | If billing | Webhooks |
| `ALLOW_CONTROL_STRIPE_SEED` | **Never in prod** | Dev-only seed webhook |

### Storefront (`artist-platform`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SITE_URL` | Yes | Canonical storefront URL |
| `NEXT_PUBLIC_CONTROL_SYSTEM_API_URL` | Yes | `https://2mrrw-control-system.vercel.app` |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Auth + data |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server routes |
| `STRIPE_*` | If commerce | Checkout + webhooks |
| `ADMIN_SEED_SECRET` | Yes (sync/parity) | Catalog ingest + diagnostics |
| `GUEST_SESSION_SECRET` | Yes | Guest/session cookies |
| `GIFT_REMINDER_SIGNING_SECRET` | Recommended | Signed gift reminder links |

Full names-only reference: `2MRRW_RECOVERY_SYSTEM/RECOVERY_GUIDES/ENVIRONMENT_VARIABLE_RECOVERY.md`

---

## 2. Migrations checklist (storefront Supabase)

Apply in order if not already on production:

```sql
-- 1) Unified entitlements (Sprint 2)
-- File: supabase/migrations/20260601000000_unified_entitlements.sql

-- 2) Products content parity (Sprint 2)
-- File: supabase/migrations/20260601000001_products_content_parity.sql

-- 3) Gift token hash at rest (Sprint 3)
-- File: supabase/migrations/20260602000000_gift_token_hash.sql

-- 4) Rate limits + gifting base (if missing)
-- Files: 20260517011000_api_rate_limits_and_identity_lookup.sql
--        20260522140000_gifting_system.sql
```

**Post-migrate SQL checks:**

```sql
SELECT count(*) FROM entitlements WHERE status = 'active';
SELECT slug, storage_path FROM products WHERE slug LIKE '%-digital' LIMIT 5;
```

**Control-side:** no new migrations in Sprint 5–6.

---

## 3. Deploy procedure

1. `npm run typecheck && npm run build` in each repo (deploy gate; `foundation:deploy` also runs verify — see §5).
2. Control: `npx vercel --prod --yes` from `2MRRW-Control-System`
3. Storefront: `npx vercel --prod --yes` from `artist-platform`
4. Run smoke matrix (§4).

---

## 4. Smoke matrix (production)

Run after every production deploy. Expected results as of 2026-05-23 post–Sprint 5 deploy:

| Check | Command | Expected |
|-------|---------|----------|
| Control liveness | `curl -sS "$CONTROL/api/health/basic"` | HTTP 200, `"ok":true` |
| Control storage | `curl -sS "$CONTROL/api/health/storage"` | HTTP 200, `"ok":true` |
| Public catalog | `curl -sS "$CONTROL/api/public/releases?limit=100"` | HTTP 200, **9** published releases (not demo fallback) |
| Storefront home | `curl -sS -o /dev/null -w '%{http_code}\n' "$STORE/"` | HTTP 200 |
| Library stream (no session) | `curl -sS -w '\n%{http_code}\n' "$STORE/api/library/stream?slug=love-hz"` | HTTP **401** `Unauthorized` |
| Entitlements parity | `curl -sS -H "x-admin-seed-secret: $ADMIN_SEED_SECRET" "$STORE/api/admin/diagnostics/entitlements-parity"` | HTTP 200 when secret set; skip if unset |

**Shell block (copy-paste):**

```bash
export CONTROL="https://2mrrw-control-system.vercel.app"
export STORE="https://artist-platform-silk.vercel.app"

curl -fsS "$CONTROL/api/health/basic" | jq .
curl -fsS "$CONTROL/api/health/storage" | jq .
curl -fsS "$CONTROL/api/public/releases?limit=100" | jq '(.data.releases // .releases) | length'
curl -fsS -o /dev/null -w "home %{http_code}\n" "$STORE/"
curl -sS -w "\n%{http_code}\n" "$STORE/api/library/stream?slug=love-hz"
# Optional:
# curl -fsS -H "x-admin-seed-secret: $ADMIN_SEED_SECRET" \
#   "$STORE/api/admin/diagnostics/entitlements-parity" | jq .
```

**Recorded run (2026-05-23):** health basic/storage 200; releases count 9; homepage 200; stream without auth 401.

---

## 5. `foundation:verify-platform`

```bash
cd /Users/recharge/2MRRW-Control-System
npm run foundation:verify-platform
```

**Current status (2026-05-23):** fails at control `npm run verify` because `tests/backend-foundation.test.ts` uses top-level `await` incompatible with tsx/esbuild CJS transform. **Workaround for deploy:** use `npm run typecheck && npm run build` + §4 smoke. Production smoke for releases count passes when `EXPECTED_RELEASES=9`.

---

## 6. Sprint 5 completion note

- **P4.5:** `GET /api/public/releases` returns **503** with `catalog_unavailable` when durable catalog is empty (demo fallback removed).
- Commit: `7fcf4d3` — `fix(p5): public catalog 503 when durable empty`

---

## 7. Backlog (P1–P4 tasklist — not done or ops-only)

Source: `10-IMPLEMENTATION-TASKLIST.md` (architecture audit zip). All numbered P1–P4 implementation items are **done** except:

| Item | Effort | Action |
|------|--------|--------|
| `media_playback_progress` reconcile (P2.7) | Ops / >2h | Manual SQL + cron design; not automated |
| Wire `fetchSignedUrlsBatch` in album UI | ~2h | Optional perf; API exists |
| Stream cache invalidation on refund | ~2h | 8m TTL acceptable for now |
| `controlCatalogPayload` studio fallback | Internal admin only | Not public API; defer |
| Fix `backend-foundation.test.ts` top-level await | ~1–2h | Unblocks `foundation:verify` / deploy script |

**No quick wins implemented in Sprint 6** (total estimated >2h or ops-only).

---

## 8. Related scripts

| Script | Repo | Purpose |
|--------|------|---------|
| `scripts/check-entitlements-parity.mjs` | storefront | CI parity (exit 2 on drift) |
| `scripts/test-library-stream-e2e.mjs` | storefront | Authenticated stream smoke |
| `scripts/stripe-purchase-manual-smoke.md` | storefront | Stripe test-mode purchase |
| `scripts/trigger-scheduled-cron.sh` | control | Cron smoke with `CRON_SECRET` |

---

## 9. Rollback

- Control: Vercel dashboard → previous deployment before `7fcf4d3`, or `npm run foundation:rollback`
- Storefront: Vercel dashboard → previous production deployment
- Catalog emergency: set `DISABLE_CATALOG_SYNC=1` on control (see `docs/MIGRATION_MANIFEST.md`)
