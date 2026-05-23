# Sprint 7 — HELP (status & verify)

**Date:** 2026-05-23  
**Status:** Partially completed this session (prior subagent `927ca433` did not finish; anchor agent `9a280565` overlapped).

---

## What Sprint 7 was supposed to do

From Sprint 6 backlog / operator runbook:

1. Fix `testMediaUploadIntentFoundation` EP routing assertions so **`npm run verify`** passes on control.
2. Bump **`artist-platform/docs/foundation/recovery-anchor.json`** and **`foundation-stable-v3`** to current main after review (operational only; do not move `foundation-stable-v1`).
3. Optional: quick P2 gaps, production smoke, deploy if new commits.

**Deliverable (not created earlier):** `2MRRW-Sprint7-Implementation-Report-2026-05-22.zip`

---

## What actually landed

### Control (`2MRRW-Control-System`)

| Item | Value |
|------|--------|
| Sprint 6 control | `b2bfa57` |
| Sprint 7 commit | **`397d9f6`** — `fix(p7): align foundation tests with EP routing policy` |
| Remote | `main` pushed to `book2mrrw/2MRRW-Control-System` |

**Files:** `tests/backend-foundation.test.ts` only

- EP destinations: assert `releaseTypeDestinations.ep` (includes album carousel routes), not stale `["eps","music_eps"]`.
- Cover policy: `video/webm` rejected (matches upload policy).
- Test isolation: `ARTIST_PLATFORM_PUBLIC_URL` saved/restored in animated-single test.

### Storefront (`artist-platform` / `2mrrw-Official`)

| Item | Value |
|------|--------|
| Pre-Sprint 7 main | `4d18dc2` |
| Sprint 7 commits | `abdaf87`, `676c67b`, **`b24dca5`** (anchor metadata) |
| Operational tag | **`foundation-stable-v3`** → **`b24dca5`** (force-pushed) |
| Remote | `main` + tag pushed |

**Files:** `docs/foundation/recovery-anchor.json`

### Recovery anchor: old vs new

| Field | Before (committed) | After (operational) |
|-------|--------------------|---------------------|
| `commit` (JSON) | `f78d6ecd` | `676c67b4` in file; **tag/HEAD = `b24dca5`** |
| `foundation-stable-v3` tag | pointed at `4d18dc2` (annotated) | **`b24dca5`** |
| `sacredOrigin` (`foundation-stable-v1`) | `ce6ae20e` | **unchanged** |

`verify:foundation` compares **HEAD** to **`foundation-stable-v3^{commit}`**, not only `anchor.commit` in JSON.

---

## Verify status (2026-05-23)

| Check | Result |
|-------|--------|
| Control `npm run verify` | **PASS** (`typecheck` + stability + backend foundation) |
| Storefront `npm run verify:foundation` | **FAIL** at `check:frontend-guardrails` — unpinned `^` ranges in `package.json` (`@aws-sdk/*`, `howler`, `three`, `zustand`, etc.). HEAD ↔ operational tag **match**. |
| Production deploy | **Not run** this session — push only; promote Vercel if you want `397d9f6` / `b24dca5` live |

---

## Copy-paste: verify locally

```bash
# Control
cd /Users/recharge/2MRRW-Control-System
git fetch origin && git checkout main && git pull
npm run verify

# Storefront — HEAD vs tag (should match after pull)
cd /Users/recharge/artist-platform
git fetch origin --tags && git checkout main && git pull
git rev-parse HEAD foundation-stable-v3^{commit}

# Full foundation (fails until guardrails fixed)
npm run verify:foundation

# Quick HEAD/tag only
node scripts/recovery/verify-foundation.mjs 2>&1 | head -15

# Production smoke (control repo, needs env)
cd /Users/recharge/2MRRW-Control-System
EXPECTED_RELEASES=9 npm run smoke:production   # if script exists in package.json
```

---

## Sprint 8 — still blocked / open

From Sprint 6 `BACKLOG.md`:

1. **Frontend guardrails** — pin dependency versions in `package.json` so `verify:foundation` is fully green.
2. **P2.7** — `media_playback_progress` reconcile (manual SQL + cron).
3. **P4** — wire `fetchSignedUrlsBatch` in album UI (optional).
4. **P3** — stream cache invalidation on refund.
5. **P1.11** — purchase → stream 200 integration test (Stripe test + Supabase fixture).
6. **Parity** — local `check-entitlements-parity.mjs` via production diagnostic.
7. **Deploy** — promote control `397d9f6` and storefront `b24dca5` on Vercel if not auto-deployed from `main`.

---

## Agent transcript notes

- **`927ca433`**: Started Sprint 7 (read backlog); **did not complete**; no implementation report zip.
- **`9a280565`**: Recovery-anchor bump task; **overlapped** with Sprint 7; left uncommitted JSON until this session.

---

## SHAs summary

```
Control:     b2bfa57 → 397d9f6  (fix p7 tests)
Storefront:  4d18dc2 → b24dca5  (anchor + tag; sacred v1 unchanged)
```
