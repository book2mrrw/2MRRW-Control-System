# Production smoke test matrix

Run after every production deploy. Defaults assume Sprint 5+ control (`7fcf4d3`) and storefront `4d18dc2`.

```bash
export CONTROL="https://2mrrw-control-system.vercel.app"
export STORE="https://artist-platform-silk.vercel.app"
# export ADMIN_SEED_SECRET="..."  # optional, for parity diagnostic
```

---

## Matrix

| # | Check | Command | Expected HTTP | Expected body / notes |
|---|-------|---------|---------------|------------------------|
| 1 | Control liveness | `curl -fsS "$CONTROL/api/health/basic"` | 200 | `"ok": true` |
| 2 | Control storage | `curl -fsS "$CONTROL/api/health/storage"` | 200 | `"ok": true`, bucket present |
| 3 | Public catalog | `curl -fsS "$CONTROL/api/public/releases?limit=100"` | 200 | **9** published releases (not demo fallback) |
| 4 | Public catalog empty guard | _(only if catalog wiped)_ | **503** | `catalog_unavailable` (P4.5 — no demo JSON) |
| 5 | Storefront home | `curl -fsS -o /dev/null -w '%{http_code}\n' "$STORE/"` | 200 | HTML shell |
| 6 | Library stream (no session) | `curl -sS "$STORE/api/library/stream?slug=love-hz"` | **401** | `Unauthorized` |
| 7 | Library stream (with session) | `node scripts/test-library-stream-e2e.mjs` (local) | 302 or 200 | Signed R2 URL when entitled |
| 8 | Entitlements parity | `curl -fsS -H "x-admin-seed-secret: $ADMIN_SEED_SECRET" "$STORE/api/admin/diagnostics/entitlements-parity"` | 200 | `libraryOnly` + `entitlementsOnly` = 0 |
| 9 | Control cron auth | `curl -sS -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer wrong" "$CONTROL/api/cron/scheduled-releases"` | **401** | Without valid `CRON_SECRET` |
| 10 | Storefront Stripe webhook | POST without signature | **400** | Invalid signature when `STRIPE_WEBHOOK_SECRET` set |

---

## Copy-paste block

```bash
export CONTROL="https://2mrrw-control-system.vercel.app"
export STORE="https://artist-platform-silk.vercel.app"

curl -fsS "$CONTROL/api/health/basic" | jq .
curl -fsS "$CONTROL/api/health/storage" | jq .
curl -fsS "$CONTROL/api/public/releases?limit=100" | jq '(.data.releases // .releases) | length'
curl -fsS -o /dev/null -w "home %{http_code}\n" "$STORE/"
curl -sS -w "\nHTTP %{http_code}\n" "$STORE/api/library/stream?slug=love-hz"

# Optional — set ADMIN_SEED_SECRET first:
# curl -fsS -H "x-admin-seed-secret: $ADMIN_SEED_SECRET" \
#   "$STORE/api/admin/diagnostics/entitlements-parity" | jq .
```

---

## Sprint 6 recorded run (2026-05-23)

| # | Result |
|---|--------|
| 1 | 200, `ok: true` |
| 2 | 200, bucket `2mrrw-media` |
| 3 | **9** releases |
| 5 | 200 |
| 6 | 401 `Unauthorized` |

Foundation verify script (when `npm run verify` passes locally):

```bash
CONTROL_URL="$CONTROL" EXPECTED_RELEASES=9 npm run foundation:verify
```
