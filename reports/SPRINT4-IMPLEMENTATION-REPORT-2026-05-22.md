# Sprint 4 Implementation Report — P4 Performance, P3 gift reminders, ops parity

**Date:** 2026-05-23  
**Audit source:** `2MRRW-Platform-Architecture-Audit-2026-05-22.zip` (P4 + Sprint 3 gaps)  
**Sprint 3 baseline:** control `5e9b7b2`, storefront `b17771a`

---

## Commits

| Repo | SHA | Message |
|------|-----|---------|
| Control | _(see `git rev-parse HEAD` after commit)_ | `fix(p4): signed url cache, sse stability, parity diagnostics` |
| Storefront | _(see `git rev-parse HEAD` after commit)_ | `fix(p4): playback perf, gift reminders, stream e2e http` |

---

## Task status

| ID | Task | Status | Notes |
|----|------|--------|-------|
| P4.1 | Client cache signed URLs (50m TTL) | Done | `src/lib/control-system/media.js` Map cache + `clearSignedUrlCache` |
| P4.2 | Batch signed-url API | Done | Control `POST /api/media/signed-urls`; storefront `fetchSignedUrlsBatch` |
| P4.3 | Server-side `library/stream` cache | Done | `stream-url-cache.js` 8m TTL + in-flight coalesce |
| P4.4 | SSE heartbeat 30s + reconnect cap | Done | Control stream 30s; studio `useRealtimeEvents` max 8 reconnects |
| P3 | Gift reminder links (hash-only) | Done | `reminder-link.js` HMAC `r1.*` tokens; cron uses signed links |
| — | Stream E2E HTTP smoke | Done | `test-library-stream-e2e.mjs` + `E2E_STREAM_BASE_URL` / cookie |
| — | Stripe manual smoke | Done | `scripts/stripe-purchase-manual-smoke.md` |
| — | Entitlements parity diagnostics | Done | Storefront + control `GET .../admin/diagnostics/entitlements-parity`; `check-entitlements-parity.mjs` |
| P4.5 | Remove demo catalog fallback → 503 | Deferred | Out of Sprint 4 handoff scope; no behavior change |

---

## Build & test results

| Repo | Command | Result |
|------|---------|--------|
| Control | `npm run typecheck` | Pass |
| Control | `npm run build` | Pass |
| Storefront | `npm run build` | Pass |

---

## Operator follow-up

1. Set `GIFT_REMINDER_SIGNING_SECRET` (or rely on `GUEST_SESSION_SECRET`) on storefront production for reminder emails on hash-only gifts.
2. Parity check: `curl -H "x-admin-seed-secret: $ADMIN_SEED_SECRET" https://<storefront>/api/admin/diagnostics/entitlements-parity`
3. Optional cron/CI: `node scripts/check-entitlements-parity.mjs` (exit 2 on drift).
4. Stream HTTP smoke: `E2E_STREAM_BASE_URL` + `E2E_SESSION_COOKIE` + `E2E_PRODUCT_SLUG` → `node scripts/test-library-stream-e2e.mjs`
5. Stripe: follow `scripts/stripe-purchase-manual-smoke.md` in test mode.

---

## Migrations

No new SQL migrations this sprint. See `MIGRATIONS-TO-APPLY.sql` (empty; prior Sprint 3 gift hash migration still required if not applied).

---

## Remaining gaps

| Item | Notes |
|------|-------|
| P4.5 demo catalog → 503 | Sprint 5 / separate hardening pass |
| `media_playback_progress` reconcile | Ops-only; not implemented |
| Wire `fetchSignedUrlsBatch` in album UI | Batch API ready; callers still use per-asset resolve today |
| Stream cache invalidation on refund | Cache TTL-bound (8m); optional webhook hook later |
