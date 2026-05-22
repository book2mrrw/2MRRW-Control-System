# Emergency Recovery Playbook

Scenario-based steps. Always run post-smoke after control recovery.

**Default tag:** `foundation-stable-v1` (`6d988f5`)

## One-command foundation recovery

| Situation | Command |
|-----------|---------|
| Full restore (local) | `npm run foundation:recover` |
| Restore + production deploy | `npm run foundation:recover -- --deploy` |
| Git checkout only | `npm run foundation:rollback` |
| Verify (no checkout) | `npm run foundation:verify` |
| Deploy after manual recovery | `npm run foundation:deploy` |
| Save checkpoint before changes | `npm run foundation:checkpoint` |

Guide: [`ONE_COMMAND_RECOVERY.md`](ONE_COMMAND_RECOVERY.md) · Report: [`../../FOUNDATION_RECOVERY_COMMANDS_REPORT.md`](../../FOUNDATION_RECOVERY_COMMANDS_REPORT.md)

---

## Scenario 1 — 504 / gateway timeout on control

**Symptoms:** Vercel 504, slow TTFB, studio never loads catalog.

**Likely cause:** Catalog build in layout, unbounded Supabase query, or `force-dynamic` on root layout.

**Steps:**

1. Promote known-good deploy `dpl_3Q5z4Q1b61JrHXVCZPn9EmiBbjgm` if recent deploy caused it.
2. If still failing:
   ```bash
   npm run foundation:recover -- --deploy
   ```
   Or step-by-step: `npm run foundation:rollback` → `npm ci` → `npm run foundation:deploy`
3. Confirm layout has `initialCatalog={[]}` — see [`../../CURRENT_SYSTEM_STATE.md`](../../CURRENT_SYSTEM_STATE.md).
4. Smoke health + 9 releases.

---

## Scenario 2 — React hydration mismatch

**Symptoms:** Console hydration errors, catalog flash/wrong data on first paint.

**Likely cause:** Server catalog in `layout.tsx` or mismatched server/client catalog payload.

**Steps:**

1. Do **not** add `buildControlCatalogPayload` to `layout.tsx`.
2. Restore tag `foundation-stable-v1` or commit `c9b4465` era via foundation tag.
3. Run guardrails — must pass “no catalog builder in layout”.
4. Redeploy and hard-refresh browser.

---

## Scenario 3 — Failed Vercel deploy

**Symptoms:** Build failed on `main`, production still on old deploy or broken alias.

**Steps:**

1. Read Vercel build log — fix typecheck/test locally: `npm run verify`.
2. If deploy is bad but build passed: **Promote** previous deploy (see [`DEPLOYMENT_RECOVERY_GUIDE.md`](DEPLOYMENT_RECOVERY_GUIDE.md)).
3. If code is bad: `npm run foundation:recover -- --deploy`
4. Never force-push `main` to fix deploy.

---

## Scenario 4 — Bad audit / experimental merge

**Symptoms:** Guardrails fail, stability tests fail, or 9 releases dropped after merge.

**Steps:**

1. `./scripts/check-architecture-guardrails.sh` — note which rule failed.
2. `npm run foundation:rollback`
3. `git checkout -b recovery/$(date +%Y%m%d) foundation-stable-v1`
4. Cherry-pick only required fixes; `npm run verify` each pick.
5. PR `recovery/*` → `main`.

See [`../../docs/SAFE_RECOVERY_PROTOCOL.md`](../../docs/SAFE_RECOVERY_PROTOCOL.md) Level 4.

---

## Scenario 5 — Supabase / database / empty catalog

**Symptoms:** `/api/health/db` fails, 0 releases, studio fallback only.

**Steps:**

1. Vercel env: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_MEDIA_BUCKET`.
2. Supabase dashboard: project paused? RLS blocking service role?
3. Redeploy after env fix (no code change).
4. If schema/code regression: restore `foundation-stable-v1`, redeploy.
5. Re-run frontend ingest only if documented: `npm run import:frontend-releases` (local, with env).

---

## Scenario 6 — Build fail locally / CI

**Symptoms:** `npm run verify` or `next build` fails.

**Steps:**

1. `npm ci` using [`../LOCKFILES/foundation-lock.json`](../LOCKFILES/foundation-lock.json).
2. Compare `package.json` to [`../DEPENDENCY_SNAPSHOTS/package.json`](../DEPENDENCY_SNAPSHOTS/package.json) — foundation deps must be exact pins.
3. `npm run typecheck` then `npm run test`.
4. Do not bump `next` / `@supabase/supabase-js` to `latest` without foundation review.

---

## Scenario 7 — MP4 singles show JPEG only

**Symptoms:** Singles lost motion loops; `primaryAsset.type` is `jpg`.

**Steps:**

1. Prefer commit/tag era `b26558e` or promote deploy `dpl_HyJb2XSdrL5AS6cZoL1YdzmybWKQ`.
2. Avoid universal pipeline range `025812b`..`eae73ab`.
3. Smoke: `hour-glass` release → `primaryAsset.type` = `mp4`.
4. See [`../../docs/PRE_VERIFICATION_RECOVERY.md`](../../docs/PRE_VERIFICATION_RECOVERY.md) if present.

---

## Scenario 8 — Frontend (artist-platform) broken, control OK

**Symptoms:** Site loads but no releases; CORS errors; wrong API host.

**Steps:**

1. Confirm control smoke passes.
2. Vercel **artist-platform**: set `NEXT_PUBLIC_CONTROL_SYSTEM_API_URL=https://2mrrw-control-system.vercel.app`.
3. Set `NEXT_PUBLIC_SITE_URL=https://artist-platform-silk.vercel.app`.
4. Redeploy frontend.
5. See [`FULL_RECOVERY_GUIDE.md`](FULL_RECOVERY_GUIDE.md) Phase C.

---

## Universal post-recovery smoke

```bash
npm run foundation:verify
```

## Escalation

- [`EMERGENCY_ROLLBACK_PROCEDURE.md`](EMERGENCY_ROLLBACK_PROCEDURE.md)
- [`../EMERGENCY_ROLLBACK/COMMANDS.sh`](../EMERGENCY_ROLLBACK/COMMANDS.sh)
- [`../../RECOVERY_ANCHOR.md`](../../RECOVERY_ANCHOR.md)
