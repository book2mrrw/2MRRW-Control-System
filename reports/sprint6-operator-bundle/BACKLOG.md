# Backlog — audit tasklist items not done

Source: `10-IMPLEMENTATION-TASKLIST.md` (from `2MRRW-Platform-Architecture-Audit-2026-05-22.zip`). All numbered **P1–P4 implementation** items from Sprints 1–5 are **shipped** in code and on production Vercel unless noted below.

---

## Ops / deferred (not blocking launch)

| ID / area | Item | Effort | Action |
|-----------|------|--------|--------|
| P2.7 | `media_playback_progress` reconcile | Ops / >2h | Manual SQL + cron design; not automated |
| P4 perf | Wire `fetchSignedUrlsBatch` in album UI | ~2h | Optional; batch API exists |
| P3 | Stream cache invalidation on refund | ~2h | 8m TTL acceptable for now |
| Admin | `controlCatalogPayload` studio fallback | Defer | Internal admin only; not public API |
| Tests | `backend-foundation.test.ts` expectations vs routing/upload policy | ~1–2h | Top-level `await` fixed (Sprint 6); EP destinations + cover `webm` assertions still drift |
| Recovery | Storefront `verify:foundation` anchor | ~15m | Update `foundation-stable-v3` anchor to current HEAD after review |
| P1.11 | Integration test purchase → stream 200 | Fixture | Needs Stripe test mode + Supabase fixture |
| Parity | Local `check-entitlements-parity.mjs` | Small | Run via production diagnostic or Next-aware runner |

---

## Sprint 1 carryover (now addressed in later sprints)

These were open after Sprint 1 and are **done** in S2–S5 — listed for audit traceability only:

| Was open | Resolved in |
|----------|-------------|
| P1.7–P1.8 entitlements table + dual-write | Sprint 2 (`cb2827d` / `3c8b49e`) |
| P1.9 disable control seed Stripe in prod | Ops — never set `ALLOW_CONTROL_STRIPE_SEED` in prod |
| P1.10 public catalog `canStream: false` | Sprint 5 — empty catalog returns **503** not demo |
| P2.2 release products in catalog sync | Sprint 2+ |
| P4.5 demo catalog fallback removed | Sprint 5 (`7fcf4d3`) |

---

## Suggested next engineering sprint

1. Align `backend-foundation.test.ts` with current `resolveContentDestinations` and upload MIME policy (or relax assertions to `includes` checks).
2. Bump storefront foundation anchor after sign-off on `4d18dc2`.
3. Automate `media_playback_progress` reconcile if analytics becomes launch-critical.
