# Rapid Restore Checklist

Use when production is down and you need control + API healthy in under 30 minutes.

## Prerequisites

- [ ] Vercel access to `2-mrrw-control-system` (and `artist-platform` if UI broken)
- [ ] Supabase dashboard access
- [ ] Git clone of control repo

## Control — 10 steps

- [ ] **1.** `curl` health + releases (baseline failure mode)
- [ ] **2.** Vercel → promote `dpl_3Q5z4Q1b61JrHXVCZPn9EmiBbjgm` if code unchanged — skip to step 8 if OK
- [ ] **3.** `git fetch --tags origin && git checkout foundation-stable-v1`
- [ ] **4.** `npm ci` (or restore `2MRRW_RECOVERY_SYSTEM/LOCKFILES/foundation-lock.json`)
- [ ] **5.** `npm run verify`
- [ ] **6.** `./scripts/check-architecture-guardrails.sh`
- [ ] **7.** Confirm Vercel env names (Supabase URL, service role, media bucket) — [`ENVIRONMENT_VARIABLE_RECOVERY.md`](ENVIRONMENT_VARIABLE_RECOVERY.md)
- [ ] **8.** `npx vercel --prod --yes`
- [ ] **9.** Smoke: health `ok: true`, **9** releases
- [ ] **10.** Document in `docs/PROMPT_DEPLOY_TIMELINE.md` if non-trivial

## Frontend (if public site broken)

- [ ] `NEXT_PUBLIC_CONTROL_SYSTEM_API_URL` = control production URL
- [ ] Redeploy https://artist-platform-silk.vercel.app
- [ ] Browser smoke: home, releases, no hydration console errors

## Do not

- [ ] `git push --force origin main`
- [ ] Restore layout catalog hydration (`buildControlCatalogPayload` in `layout.tsx`)
- [ ] Deploy with `next` / `@supabase/supabase-js` on `latest`

## Deeper docs

- [`EMERGENCY_ROLLBACK_PROCEDURE.md`](EMERGENCY_ROLLBACK_PROCEDURE.md)
- [`../../RECOVERY_ANCHOR.md`](../../RECOVERY_ANCHOR.md)
- [`../EMERGENCY_ROLLBACK/COMMANDS.sh`](../EMERGENCY_ROLLBACK/COMMANDS.sh)
