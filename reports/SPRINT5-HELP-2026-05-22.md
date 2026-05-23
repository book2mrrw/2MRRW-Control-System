# Sprint 5 — Operator help

**Status:** Sprint 5 implementation is **complete** in code and on production Vercel. What was missing was packaging (Downloads zip with date `2026-05-22`) and a clear operator guide — this file.

---

## What Sprint 5 did

- **P4.5 (control):** Removed demo/studio catalog fallback from `GET /api/public/releases`. Empty or timed-out durable reads return **503** with `catalog_unavailable` / `demoFallbackDisabled: true` instead of fake releases that could look streamable.
- **Entitlements read path:** No new code — already shipped in **Sprint 2** (`unified-entitlements.js`, `userCanStreamProduct` on `/api/library/stream`). Parity diagnostics: `GET /api/admin/diagnostics/entitlements-parity` (requires `ADMIN_SEED_SECRET`).
- **Production deploy:** Control redeployed with `7fcf4d3`; storefront redeployed at same SHA `4d18dc2` (no storefront diff).
- **Platform checkpoint:** Recovery tag `checkpoint-20260523-000652` on control repo.
- **Not done (by design):** Extra P2/P3 tasklist items (playback progress reconcile, batch signed URLs in album UI, fixing foundation test runner).

---

## SHAs and URLs

| | Control | Storefront |
|---|---------|------------|
| **Sprint 5 HEAD** | `7fcf4d3` | `4d18dc2` (unchanged) |
| **Sprint 4 baseline** | `2304c9e` | `4d18dc2` |
| **Production URL** | https://2mrrw-control-system.vercel.app | https://artist-platform-silk.vercel.app |
| **Vercel deployment ID** | `dpl_8DanhgyV1SGEC7sb4cb7AzREBTZy` | `dpl_4UL1dHuuG1DWLwbQbidQH4foAuUL` |

**Checkpoint tag:** `checkpoint-20260523-000652`

---

## What you must do manually

1. **Push git (if still ahead):** Both repos had unpushed `main` commits (Sprints 1–5 stack). Until pushed, GitHub Actions / team clones won’t see `7fcf4d3`.
   ```bash
   cd /Users/recharge/2MRRW-Control-System && git push origin main
   cd /Users/recharge/artist-platform && git push origin main
   ```

2. **Storefront Supabase migrations:** Sprint 5 added **no** new SQL. If you haven’t applied Sprint 2–3 migrations on production Supabase, run them (order matters):
   - `20260601000000_unified_entitlements.sql`
   - `20260601000001_products_content_parity.sql`
   - `20260602000000_gift_token_hash.sql`
   - Plus rate-limits / gifting base if missing (see Sprint 6 runbook in repo: `reports/SPRINT6-OPERATOR-RUNBOOK-2026-05-22.md`).

3. **Production env vars:** No Sprint 5–specific keys. Confirm existing prod vars (control: Supabase, R2, `STOREFRONT_SYNC_URL`, `ADMIN_SEED_SECRET`, cron; storefront: control API URL, Supabase, Stripe, `GUEST_SESSION_SECRET`, gift signing secret). Full tables in `reports/SPRINT6-OPERATOR-RUNBOOK-2026-05-22.md`.

4. **Optional authenticated smoke:** Purchase/stream E2E needs logged-in session or env from `artist-platform/scripts/test-library-stream-e2e.mjs`.

---

## How to verify Sprint 5 worked

### P4.5 — public catalog gate

**Happy path (prod has data):**
```bash
curl -fsS "https://2mrrw-control-system.vercel.app/api/public/releases?limit=100" \
  | jq '(.data.releases // .releases) | length'
# Expect: 9 (or your published count), HTTP 200
```

**503 path:** Only when durable catalog is empty or DB times out (>5s). Hard to trigger in prod with 9 releases; in staging you could temporarily block DB or use an empty project.

Response shape when triggered:
```json
{ "error": "...", "reason": "catalog_unavailable", "demoFallbackDisabled": true }
```
HTTP **503**.

### Deploy

- Control production serves commit `7fcf4d3` behavior (releases count 9 as of 2026-05-23).
- Vercel dashboard → production deployment IDs above.

### Checkpoint

```bash
cd /Users/recharge/2MRRW-Control-System
git fetch --tags
git tag -l 'checkpoint-20260523*'
# Expect: checkpoint-20260523-000652
```

### Stream entitlement (no demo catalog bypass)

```bash
curl -sS -w "\nHTTP %{http_code}\n" \
  "https://artist-platform-silk.vercel.app/api/library/stream?slug=love-hz"
# Expect: HTTP 401 without session cookie
```

---

## Copy-paste smoke block

```bash
export CONTROL="https://2mrrw-control-system.vercel.app"
export STORE="https://artist-platform-silk.vercel.app"

curl -fsS "$CONTROL/api/health/basic" | jq .
curl -fsS "$CONTROL/api/health/storage" | jq .
curl -fsS "$CONTROL/api/public/releases?limit=100" | jq '(.data.releases // .releases) | length'
curl -fsS -o /dev/null -w "home %{http_code}\n" "$STORE/"
curl -sS -w "\nHTTP %{http_code}\n" "$STORE/api/library/stream?slug=love-hz"

# Optional — set ADMIN_SEED_SECRET in shell first:
# curl -fsS -H "x-admin-seed-secret: $ADMIN_SEED_SECRET" \
#   "$STORE/api/admin/diagnostics/entitlements-parity" | jq .
```

**Recorded results (2026-05-23):** health 200, storage 200, releases **9**, home **200**, stream **401**.

---

## What’s blocked and why

| Blocker | Why | Workaround |
|---------|-----|------------|
| `npm run foundation:verify-platform` fails | `backend-foundation.test.ts` uses top-level `await` (tsx/CJS) | Use `npm run typecheck && npm run build` + smoke block above |
| Sprint 5 zip at `...-2026-05-22.zip` missing earlier | Agent stopped before packaging; partial zip existed as `...-2026-05-23.zip` | Use new `2MRRW-Sprint5-HELP-2026-05-22.zip` in Downloads |
| Sprint 6 runbook zip | Sprint 6 agent never finished (only started) | Use `reports/SPRINT6-OPERATOR-RUNBOOK-2026-05-22.md` in repo or inside HELP zip |
| Unpushed git | Local `main` ahead of `origin` | `git push origin main` on both repos |

---

## Related files in repo

- `reports/SPRINT5-IMPLEMENTATION-REPORT-2026-05-22.md` — technical report
- `reports/SPRINT6-OPERATOR-RUNBOOK-2026-05-22.md` — env vars, migrations, full smoke matrix
- `src/app/api/public/releases/route.ts` — P4.5 implementation

---

## Agent transcript note

- Sprint 5 agent (`3f5e9ff6`) started but did not finish in transcript; work landed as commit `7fcf4d3` and deploy/smoke elsewhere.
- Sprint 6 agent (`720281b0`) **did not** re-do Sprint 5; it only received a “continue on” prompt and did not complete Sprint 6 deliverables either.
