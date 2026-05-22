# 2MRRW wrong production URL search (read-only)

**Date:** 2026-05-22  
**Pattern:** `2mrrw-control-system` (wrong slug — extra dash)  
**Correct production URL:** https://2mrrw-control-system.vercel.app (no dash between `2` and `mrrw`)  
**Wrong slug / host:** `2mrrw-control-system` → `https://2mrrw-control-system.vercel.app`

## Executive summary

| Metric | Value |
|--------|-------|
| Grand total (scoped audit) | **118** |
| `2MRRW-Control-System` | **115** |
| `artist-platform` | **3** |

### Runtime-critical

| Location | Issue |
|----------|--------|
| `src/app/api/public/releases/route.ts` line **34** | Hardcoded fallback when `NEXT_PUBLIC_APP_URL` is unset: `https://2mrrw-control-system.vercel.app` |

### Environment templates (wrong URL documented)

| Repo | File | Line(s) |
|------|------|---------|
| control | `.env.example` | **7**, **17** |
| artist-platform | `.env.local` | **1** (gitignored) |
| artist-platform | `.env.example` | **5** |

---

## Scoped search detail (subagent audit a7271606)

## `.env.local` / gitignore

| Repo | `.env.local` in `.gitignore`? | File exists? | Match in `.env.local`? |
|------|-------------------------------|--------------|------------------------|
| `/Users/recharge/2MRRW-Control-System` | Yes — `.gitignore` line 14: `.env.local` | No (not on disk) | No |
| `/Users/recharge/artist-platform` | Yes — `.gitignore` line 34: `.env*` (covers `.env.local`) | Yes | Yes — line 1 |

---

## `/Users/recharge/2MRRW-Control-System` (115 matches)

### TypeScript (1)

| Line | Content |
|------|---------|
| **34** | `  const apiBase = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://2mrrw-control-system.vercel.app";` |

`/Users/recharge/2MRRW-Control-System/src/app/api/public/releases/route.ts`

### `.env.example` (2) — no `.env` or `.env.local`

| Line | Content |
|------|---------|
| **7** | `NEXT_PUBLIC_CONTROL_SYSTEM_API_URL=https://2mrrw-control-system.vercel.app` |
| **17** | `# CONTROL_SYSTEM_URL=https://2mrrw-control-system.vercel.app  # for scripts/trigger-scheduled-cron.sh` |

`/Users/recharge/2MRRW-Control-System/.env.example`

### `.json` — 0 matches

### Markdown (112)

`/Users/recharge/2MRRW-Control-System/2MRRW_RECOVERY_SYSTEM/DEPLOYMENT_REFERENCES/STABLE_DEPLOYMENT_REFERENCE.md`
- **9:** `| **Project** | `2mrrw-control-system` |`
- **10:** `| **Production URL** | https://2mrrw-control-system.vercel.app |`
- **57:** `1. Vercel → **2mrrw-control-system** → **Deployments**.`

`/Users/recharge/2MRRW-Control-System/2MRRW_RECOVERY_SYSTEM/EMERGENCY_ROLLBACK/COMMANDS.md`
- **31:** `1. Project **2mrrw-control-system** → Deployments`
- **37:** `curl -sS "https://2mrrw-control-system.vercel.app/api/health/basic"`
- **38:** `curl -sS "https://2mrrw-control-system.vercel.app/api/public/releases?limit=100"`
- **51:** `# NEXT_PUBLIC_CONTROL_SYSTEM_API_URL=https://2mrrw-control-system.vercel.app`

`/Users/recharge/2MRRW-Control-System/2MRRW_RECOVERY_SYSTEM/FOUNDATION_SNAPSHOTS/platform-checkpoint-20260519-1510.md`
- **17:** `| Control | https://2mrrw-control-system.vercel.app |`

`/Users/recharge/2MRRW-Control-System/2MRRW_RECOVERY_SYSTEM/FOUNDATION_SNAPSHOTS/platform-checkpoint-20260519-152713.md`
- **17:** `| Control | https://2mrrw-control-system.vercel.app |`

`/Users/recharge/2MRRW-Control-System/2MRRW_RECOVERY_SYSTEM/FOUNDATION_SNAPSHOTS/platform-checkpoint-20260519-164904.md`
- **17:** `| Control | https://2mrrw-control-system.vercel.app |`

`/Users/recharge/2MRRW-Control-System/2MRRW_RECOVERY_SYSTEM/FOUNDATION_SNAPSHOTS/platform-checkpoint-20260519-183355.md`
- **17:** `| Control | https://2mrrw-control-system.vercel.app |`

`/Users/recharge/2MRRW-Control-System/2MRRW_RECOVERY_SYSTEM/KNOWN_GOOD_COMMITS/README.md`
- **33:** `**Project:** `2mrrw-control-system``
- **34:** `**URL:** https://2mrrw-control-system.vercel.app`

`/Users/recharge/2MRRW-Control-System/2MRRW_RECOVERY_SYSTEM/README.md`
- **9:** `| Control | `2MRRW-Control-System` | https://2mrrw-control-system.vercel.app |`

`/Users/recharge/2MRRW-Control-System/2MRRW_RECOVERY_SYSTEM/RECOVERY_GUIDES/DEPLOYMENT_RECOVERY_GUIDE.md`
- **3:** `Recover Vercel production for **2mrrw-control-system** and **artist-platform** without losing audit history.`
- **9:** `| Project | `2mrrw-control-system` |`
- **10:** `| Production URL | https://2mrrw-control-system.vercel.app |`
- **62:** `curl -sS "https://2mrrw-control-system.vercel.app/api/health/basic"`
- **63:** `curl -sS "https://2mrrw-control-system.vercel.app/api/public/releases?limit=100"`
- **66:** `curl -sS "https://2mrrw-control-system.vercel.app/api/public/releases?limit=100" | jq '.releases[] | select(.slug=="hour-glass") | .primaryAsset.type'`

`/Users/recharge/2MRRW-Control-System/2MRRW_RECOVERY_SYSTEM/RECOVERY_GUIDES/EMERGENCY_RECOVERY_PLAYBOOK.md`
- **132:** `2. Vercel **artist-platform**: set `NEXT_PUBLIC_CONTROL_SYSTEM_API_URL=https://2mrrw-control-system.vercel.app`.`

`/Users/recharge/2MRRW-Control-System/2MRRW_RECOVERY_SYSTEM/RECOVERY_GUIDES/EMERGENCY_ROLLBACK_PROCEDURE.md`
- **17:** `1. Vercel → project **2mrrw-control-system** → **Deployments**.`
- **49:** `curl -sS "https://2mrrw-control-system.vercel.app/api/health/basic"`
- **50:** `curl -sS "https://2mrrw-control-system.vercel.app/api/public/releases?limit=100"`

`/Users/recharge/2MRRW-Control-System/2MRRW_RECOVERY_SYSTEM/RECOVERY_GUIDES/ENVIRONMENT_VARIABLE_RECOVERY.md`
- **9:** `## Control — `2mrrw-control-system``
- **68:** `1. `NEXT_PUBLIC_CONTROL_SYSTEM_API_URL=https://2mrrw-control-system.vercel.app``

`/Users/recharge/2MRRW-Control-System/2MRRW_RECOVERY_SYSTEM/RECOVERY_GUIDES/FOUNDATION_RESTORE_WORKFLOW.md`
- **53:** `curl -sS "https://2mrrw-control-system.vercel.app/api/health/basic"`
- **54:** `curl -sS "https://2mrrw-control-system.vercel.app/api/public/releases?limit=100"`

`/Users/recharge/2MRRW-Control-System/2MRRW_RECOVERY_SYSTEM/RECOVERY_GUIDES/FULL_RECOVERY_GUIDE.md`
- **9:** `| Control | `~/2MRRW-Control-System` | Your `origin` | https://2mrrw-control-system.vercel.app |`
- **32:** `curl -sS "https://2mrrw-control-system.vercel.app/api/health/basic"`
- **33:** `curl -sS "https://2mrrw-control-system.vercel.app/api/public/releases?limit=100"`
- **81:** `curl -sS "https://2mrrw-control-system.vercel.app/api/health/basic"`
- **82:** `curl -sS "https://2mrrw-control-system.vercel.app/api/public/releases?limit=100"`
- **123:** `- `NEXT_PUBLIC_CONTROL_SYSTEM_API_URL=https://2mrrw-control-system.vercel.app``

`/Users/recharge/2MRRW-Control-System/2MRRW_RECOVERY_SYSTEM/RECOVERY_GUIDES/HUMAN_RECOVERY_COMMAND_MANUAL.md`
- **397:** `CONTROL_URL=https://2mrrw-control-system.vercel.app npm run foundation:verify`
- **427:** `| **Commands (order)** | 1. `cd ~/2MRRW-Control-System` → `npm run foundation:recover-platform` 2. `npm run foundation:verify-platform` 3. Vercel env audit: control `ARTIST_PLATFORM_PUBLIC_URL`; frontend `NEXT_PUBLIC_CONTROL_SYSTEM_API_URL=https://2mrrw-control-system.vercel.app` 4. If only frontend deploy needed: `cd ~/artist-platform` → `npm run recover:deploy -- --deploy` |`

`/Users/recharge/2MRRW-Control-System/2MRRW_RECOVERY_SYSTEM/RECOVERY_GUIDES/KNOWN_GOOD_STATE_REFERENCE.md`
- **43:** `| Control | https://2mrrw-control-system.vercel.app |`
- **60:** `curl -sS "https://2mrrw-control-system.vercel.app/api/health/basic"`
- **61:** `curl -sS "https://2mrrw-control-system.vercel.app/api/public/releases?limit=100"`

`/Users/recharge/2MRRW-Control-System/2MRRW_RECOVERY_SYSTEM/RECOVERY_GUIDES/ONE_COMMAND_RECOVERY.md`
- **71:** `CONTROL_URL=https://2mrrw-control-system.vercel.app npm run foundation:verify`

`/Users/recharge/2MRRW-Control-System/2MRRW_RECOVERY_SYSTEM/RECOVERY_GUIDES/RAPID_RESTORE_CHECKLIST.md`
- **7:** `- [ ] Vercel access to `2mrrw-control-system` (and `artist-platform` if UI broken)`

`/Users/recharge/2MRRW-Control-System/2MRRW_RECOVERY_SYSTEM/SYSTEM_STATE_REPORTS/FOUNDATION_BASELINE.md`
- **27:** `| **URL** | https://2mrrw-control-system.vercel.app |`
- **28:** `| **Vercel project** | `2mrrw-control-system` |`

`/Users/recharge/2MRRW-Control-System/2MRRW_RECOVERY_SYSTEM/SYSTEM_STATE_REPORTS/FOUNDATION_STABILITY_REPORT.md`
- **91:** `**URL:** https://2mrrw-control-system.vercel.app`

`/Users/recharge/2MRRW-Control-System/2MRRW_RECOVERY_SYSTEM/SYSTEM_STATE_REPORTS/RECOVERY_ANCHOR.md`
- **51:** `curl -sS "https://2mrrw-control-system.vercel.app/api/health/basic"`
- **52:** `curl -sS "https://2mrrw-control-system.vercel.app/api/public/releases?limit=100"`

`/Users/recharge/2MRRW-Control-System/DROP_REHEARSAL.md`
- **38:** `curl -sS https://2mrrw-control-system.vercel.app/api/health | jq .`

`/Users/recharge/2MRRW-Control-System/EDGE_CASE_VERIFICATION.md`
- **4:** `**Control prod:** https://2mrrw-control-system.vercel.app`

`/Users/recharge/2MRRW-Control-System/FOUNDATION_BASELINE.md`
- **27:** `| **URL** | https://2mrrw-control-system.vercel.app |`
- **28:** `| **Vercel project** | `2mrrw-control-system` |`

`/Users/recharge/2MRRW-Control-System/FOUNDATION_RECOVERY_COMMANDS_REPORT.md`
- **5:** `**Production URL:** https://2mrrw-control-system.vercel.app`
- **54:** `| `CONTROL_URL` | `https://2mrrw-control-system.vercel.app` | verify, deploy post-smoke |`

`/Users/recharge/2MRRW-Control-System/FOUNDATION_STABILITY_REPORT.md`
- **91:** `**URL:** https://2mrrw-control-system.vercel.app`

`/Users/recharge/2MRRW-Control-System/INGESTION_REPORT.md`
- **121:** `- **Production URL:** https://2mrrw-control-system.vercel.app`

`/Users/recharge/2MRRW-Control-System/MEGA_GO_LIVE_CHECKLIST.md`
- **4:** `**Production URL:** https://2mrrw-control-system.vercel.app`
- **5:** `**Media Control Room:** https://2mrrw-control-system.vercel.app/media`
- **29:** `  "https://2mrrw-control-system.vercel.app/api/cron/scheduled-releases"`
- **51:** `curl -sS https://2mrrw-control-system.vercel.app/api/health | jq .`
- **69:** `  "https://2mrrw-control-system.vercel.app/api/admin/ops/backfill-covers"`
- **82:** `| 3 | Cron schedule | **DONE** | `vercel.json`: `0 6 * * *` (Hobby daily). **Pro:** use `*/5 * * * *`. **Precise drops:** manual `curl -H "Authorization: Bearer $CRON_SECRET" https://2mrrw-control-system.vercel.app/api/cron/scheduled-releases` |`
- **92:** `1. [Vercel](https://vercel.com) → **2mrrw-control-system** → **Settings** → **Environment Variables**`
- **100:** `  "https://2mrrw-control-system.vercel.app/api/cron/scheduled-releases"`
- **165:** `| `npx vercel --prod --yes` | **PASS** → https://2mrrw-control-system.vercel.app (`dpl_GvULKn8bU9x8zF3JVQQBEG8oX31j`) |`
- **172:** `curl -s "https://2mrrw-control-system.vercel.app/api/public/releases?limit=100"`
- **173:** `curl -s "https://2mrrw-control-system.vercel.app/api/public/hero"`
- **174:** `curl -s "https://2mrrw-control-system.vercel.app/api/public/audio-visuals"`

`/Users/recharge/2MRRW-Control-System/MEDIA_SYNC.md`
- **53:** `**Production:** https://2mrrw-control-system.vercel.app/media`

`/Users/recharge/2MRRW-Control-System/MEDIA_SYNC_V3_GAP.md`
- **53:** `**Production URL:** https://2mrrw-control-system.vercel.app/media`

`/Users/recharge/2MRRW-Control-System/OPERATIONS.md`
- **3:** `One-page reference for day-to-day ops and drop night. Production: **https://2mrrw-control-system.vercel.app**`
- **10:** `| `CONTROL_SYSTEM_URL` | GitHub repo secret | `https://2mrrw-control-system.vercel.app` |`
- **31:** `curl -sS https://2mrrw-control-system.vercel.app/api/health | jq .`
- **35:** `- **Media Control Room:** https://2mrrw-control-system.vercel.app/media`

`/Users/recharge/2MRRW-Control-System/PRODUCTION_AUDIT.md`
- **4:** `**Production URL:** https://2mrrw-control-system.vercel.app`
- **5:** `**Media Control Room:** https://2mrrw-control-system.vercel.app/media`
- **48:** `curl -s "https://2mrrw-control-system.vercel.app/api/public/releases?limit=100" | jq '.data.count'`
- **49:** `curl -s "https://2mrrw-control-system.vercel.app/api/public/audio-visuals" | jq '.data.count'`
- **50:** `curl -s "https://2mrrw-control-system.vercel.app/api/public/hero" | jq '.data.hero.background_media_url'`

`/Users/recharge/2MRRW-Control-System/RECOVERY_ANCHOR.md`
- **51:** `curl -sS "https://2mrrw-control-system.vercel.app/api/health/basic"`
- **52:** `curl -sS "https://2mrrw-control-system.vercel.app/api/public/releases?limit=100"`

`/Users/recharge/2MRRW-Control-System/RECOVERY_SYSTEM_REPORT.md`
- **46:** `| Control | https://2mrrw-control-system.vercel.app |`

`/Users/recharge/2MRRW-Control-System/STABLE_DEPLOYMENT_REFERENCE.md`
- **9:** `| **Project** | `2mrrw-control-system` |`
- **10:** `| **Production URL** | https://2mrrw-control-system.vercel.app |`
- **57:** `1. Vercel → **2mrrw-control-system** → **Deployments**.`
- **99:** `curl -sS "https://2mrrw-control-system.vercel.app/api/health/basic"`
- **100:** `curl -sS "https://2mrrw-control-system.vercel.app/api/public/releases?limit=100" | jq '.releases | length'`

`/Users/recharge/2MRRW-Control-System/docs/DEPLOYMENT_RULES.md`
- **34:** `curl -sS "https://2mrrw-control-system.vercel.app/api/health/basic"`
- **35:** `curl -sS "https://2mrrw-control-system.vercel.app/api/public/releases?limit=100"`

`/Users/recharge/2MRRW-Control-System/docs/PRE_VERIFICATION_RECOVERY.md`
- **4:** `**Production URL:** https://2mrrw-control-system.vercel.app`
- **127:** `  'https://2mrrw-control-system.vercel.app/api/health/basic'`
- **129:** `  'https://2mrrw-control-system.vercel.app/api/health/db'`
- **131:** `  'https://2mrrw-control-system.vercel.app/api/public/releases?limit=5'`
- **133:** `  'https://2mrrw-control-system.vercel.app/media'`
- **166:** `| **Deploy URL** | https://2mrrw-control-system.vercel.app |`

`/Users/recharge/2MRRW-Control-System/docs/PRODUCTION_RECOVERY_REPORT.md`
- **4:** `**Production URL:** https://2mrrw-control-system.vercel.app`
- **54:** `**Deploy URL:** https://2mrrw-control-system.vercel.app`

`/Users/recharge/2MRRW-Control-System/docs/PROMPT_DEPLOY_TIMELINE.md`
- **30:** `**Post-restore prod deploy:** `dpl_3Q5z4Q1b61JrHXVCZPn9EmiBbjgm` → https://2mrrw-control-system.vercel.app (2026-05-19, HEAD `5da668d` = `27bca5a` + timeline doc).`

`/Users/recharge/2MRRW-Control-System/docs/SAFE_RECOVERY_PROTOCOL.md`
- **14:** `1. Check https://2mrrw-control-system.vercel.app/api/health/basic`
- **20:** `1. Open Vercel → **2mrrw-control-system** → **Deployments**`
- **38:** `curl -sS "https://2mrrw-control-system.vercel.app/api/health/basic"`
- **39:** `curl -sS "https://2mrrw-control-system.vercel.app/api/public/releases?limit=100"`

`/Users/recharge/2MRRW-Control-System/reports/2MRRW-Vercel-Env-Audit-READONLY-2026-05-22.md`
- **1:** `# Vercel Production env audit — 2mrrw-control-system`
- **11:** `| Project slug | `2mrrw-control-system` |`
- **12:** `| Production URL | https://2mrrw-control-system.vercel.app |`
- **29:** `vercel link    # select team + project 2mrrw-control-system`
- **42:** `| `NEXT_PUBLIC_APP_URL` | Yes | Canonical app URL (production: `https://2mrrw-control-system.vercel.app`) |`
- **104:** `curl -sS https://2mrrw-control-system.vercel.app/api/health | jq .`
- **105:** `curl -sS https://2mrrw-control-system.vercel.app/api/health/storage | jq .`

---

## `/Users/recharge/artist-platform` (3 matches)

### `.ts` / `.tsx` / `.js` / `.jsx` / `.json` — 0 matches

### `.env.example` (1)

| Line | Content |
|------|---------|
| **5** | `NEXT_PUBLIC_CONTROL_SYSTEM_API_URL=https://2mrrw-control-system.vercel.app` |

`/Users/recharge/artist-platform/.env.example`

### `.env.local` (1) — gitignored via `.env*`

| Line | Content |
|------|---------|
| **1** | `NEXT_PUBLIC_CONTROL_SYSTEM_API_URL=https://2mrrw-control-system.vercel.app` |

`/Users/recharge/artist-platform/.env.local`

### Markdown (1)

| Line | Content |
|------|---------|
| **16** | `| **Control API** | `NEXT_PUBLIC_CONTROL_SYSTEM_API_URL` → https://2mrrw-control-system.vercel.app |` |

`/Users/recharge/artist-platform/2MRRW_RECOVERY_SYSTEM/README.md`

---

## Notable runtime impact

Only **one** match in application source (not docs/env templates):

- `/Users/recharge/2MRRW-Control-System/src/app/api/public/releases/route.ts:34` — hardcoded fallback when `NEXT_PUBLIC_APP_URL` is unset.

Artist-platform has **no** matches in `.ts`/`.tsx`/`.js`/`.jsx`; the wrong URL is in env files and recovery docs only.

---

## Outside requested extensions (informational)

Ripgrep also found `2mrrw-control-system` in files **not** in your extension list (e.g. `.sh`, `.yml`, `control.env.example` under `2MRRW_RECOVERY_SYSTEM/ENVIRONMENT_BACKUPS/`). Those were excluded from counts above.

---

## Summary

| Repo | `.md` | `.ts`/`.tsx`/`.js`/`.jsx` | `.json` | `.env.example` | `.env.local` | **Total** |
|------|-------|---------------------------|---------|----------------|--------------|-----------|
| `2MRRW-Control-System` | 112 | 1 | 0 | 2 | 0 (file absent) | **115** |
| `artist-platform` | 1 | 0 | 0 | 1 | 1 | **3** |
| **Grand total** | | | | | | **118** |

**Correct URL:** `https://2mrrw-control-system.vercel.app` (no dash between `2` and `mrrw`).

---

## All files with match counts (full-tree `2-mrrw` substring)

Counts below include **every** file under each repo root (not limited to `.md`/`.ts`/env). Use the scoped **118** total above for remediation scope aligned with the subagent audit.

| Matches | Repository | Path |
|--------:|------------|------|
| 12 | `2MRRW-Control-System` | `MEGA_GO_LIVE_CHECKLIST.md` |
| 7 | `2MRRW-Control-System` | `reports/2MRRW-Vercel-Env-Audit-READONLY-2026-05-22.md` |
| 6 | `2MRRW-Control-System` | `2MRRW_RECOVERY_SYSTEM/RECOVERY_GUIDES/DEPLOYMENT_RECOVERY_GUIDE.md` |
| 6 | `2MRRW-Control-System` | `2MRRW_RECOVERY_SYSTEM/RECOVERY_GUIDES/FULL_RECOVERY_GUIDE.md` |
| 6 | `2MRRW-Control-System` | `docs/PRE_VERIFICATION_RECOVERY.md` |
| 5 | `2MRRW-Control-System` | `PRODUCTION_AUDIT.md` |
| 5 | `2MRRW-Control-System` | `STABLE_DEPLOYMENT_REFERENCE.md` |
| 4 | `2MRRW-Control-System` | `2MRRW_RECOVERY_SYSTEM/EMERGENCY_ROLLBACK/COMMANDS.md` |
| 4 | `2MRRW-Control-System` | `OPERATIONS.md` |
| 4 | `2MRRW-Control-System` | `docs/SAFE_RECOVERY_PROTOCOL.md` |
| 3 | `2MRRW-Control-System` | `2MRRW_RECOVERY_SYSTEM/DEPLOYMENT_REFERENCES/STABLE_DEPLOYMENT_REFERENCE.md` |
| 3 | `2MRRW-Control-System` | `2MRRW_RECOVERY_SYSTEM/RECOVERY_GUIDES/EMERGENCY_ROLLBACK_PROCEDURE.md` |
| 3 | `2MRRW-Control-System` | `2MRRW_RECOVERY_SYSTEM/RECOVERY_GUIDES/KNOWN_GOOD_STATE_REFERENCE.md` |
| 2 | `2MRRW-Control-System` | `.env.example` |
| 2 | `2MRRW-Control-System` | `2MRRW_RECOVERY_SYSTEM/ENVIRONMENT_BACKUPS/control.env.example` |
| 2 | `2MRRW-Control-System` | `2MRRW_RECOVERY_SYSTEM/KNOWN_GOOD_COMMITS/README.md` |
| 2 | `2MRRW-Control-System` | `2MRRW_RECOVERY_SYSTEM/RECOVERY_GUIDES/ENVIRONMENT_VARIABLE_RECOVERY.md` |
| 2 | `2MRRW-Control-System` | `2MRRW_RECOVERY_SYSTEM/RECOVERY_GUIDES/FOUNDATION_RESTORE_WORKFLOW.md` |
| 2 | `2MRRW-Control-System` | `2MRRW_RECOVERY_SYSTEM/RECOVERY_GUIDES/HUMAN_RECOVERY_COMMAND_MANUAL.md` |
| 2 | `2MRRW-Control-System` | `2MRRW_RECOVERY_SYSTEM/SYSTEM_STATE_REPORTS/FOUNDATION_BASELINE.md` |
| 2 | `2MRRW-Control-System` | `2MRRW_RECOVERY_SYSTEM/SYSTEM_STATE_REPORTS/RECOVERY_ANCHOR.md` |
| 2 | `2MRRW-Control-System` | `FOUNDATION_BASELINE.md` |
| 2 | `2MRRW-Control-System` | `FOUNDATION_RECOVERY_COMMANDS_REPORT.md` |
| 2 | `2MRRW-Control-System` | `RECOVERY_ANCHOR.md` |
| 2 | `2MRRW-Control-System` | `docs/DEPLOYMENT_RULES.md` |
| 2 | `2MRRW-Control-System` | `docs/PRODUCTION_RECOVERY_REPORT.md` |
| 1 | `2MRRW-Control-System` | `.github/workflows/health-check.yml` |
| 1 | `2MRRW-Control-System` | `.vercel/repo.json` |
| 1 | `2MRRW-Control-System` | `2MRRW_RECOVERY_SYSTEM/EMERGENCY_ROLLBACK/COMMANDS.sh` |
| 1 | `2MRRW-Control-System` | `2MRRW_RECOVERY_SYSTEM/ENVIRONMENT_BACKUPS/artist-platform.env.example` |
| 1 | `2MRRW-Control-System` | `2MRRW_RECOVERY_SYSTEM/FOUNDATION_SNAPSHOTS/platform-checkpoint-20260519-1510.md` |
| 1 | `2MRRW-Control-System` | `2MRRW_RECOVERY_SYSTEM/FOUNDATION_SNAPSHOTS/platform-checkpoint-20260519-152713.md` |
| 1 | `2MRRW-Control-System` | `2MRRW_RECOVERY_SYSTEM/FOUNDATION_SNAPSHOTS/platform-checkpoint-20260519-164904.md` |
| 1 | `2MRRW-Control-System` | `2MRRW_RECOVERY_SYSTEM/FOUNDATION_SNAPSHOTS/platform-checkpoint-20260519-183355.md` |
| 1 | `2MRRW-Control-System` | `2MRRW_RECOVERY_SYSTEM/README.md` |
| 1 | `2MRRW-Control-System` | `2MRRW_RECOVERY_SYSTEM/RECOVERY_GUIDES/EMERGENCY_RECOVERY_PLAYBOOK.md` |
| 1 | `2MRRW-Control-System` | `2MRRW_RECOVERY_SYSTEM/RECOVERY_GUIDES/ONE_COMMAND_RECOVERY.md` |
| 1 | `2MRRW-Control-System` | `2MRRW_RECOVERY_SYSTEM/RECOVERY_GUIDES/RAPID_RESTORE_CHECKLIST.md` |
| 1 | `2MRRW-Control-System` | `2MRRW_RECOVERY_SYSTEM/SYSTEM_STATE_REPORTS/FOUNDATION_STABILITY_REPORT.md` |
| 1 | `2MRRW-Control-System` | `DROP_REHEARSAL.md` |
| 1 | `2MRRW-Control-System` | `EDGE_CASE_VERIFICATION.md` |
| 1 | `2MRRW-Control-System` | `FOUNDATION_STABILITY_REPORT.md` |
| 1 | `2MRRW-Control-System` | `INGESTION_REPORT.md` |
| 1 | `2MRRW-Control-System` | `MEDIA_SYNC.md` |
| 1 | `2MRRW-Control-System` | `MEDIA_SYNC_V3_GAP.md` |
| 1 | `2MRRW-Control-System` | `RECOVERY_SYSTEM_REPORT.md` |
| 1 | `2MRRW-Control-System` | `docs/PROMPT_DEPLOY_TIMELINE.md` |
| 1 | `2MRRW-Control-System` | `scripts/lib/recovery-common.sh` |
| 1 | `2MRRW-Control-System` | `scripts/run-platform-foundation-checkpoint.sh` |
| 1 | `2MRRW-Control-System` | `scripts/trigger-scheduled-cron.sh` |
| 1 | `2MRRW-Control-System` | `scripts/verify-foundation-state.sh` |
| 1 | `2MRRW-Control-System` | `src/app/api/public/releases/route.ts` |
| 1 | `artist-platform` | `.env.example` |
| 1 | `artist-platform` | `.env.local` |
| 1 | `artist-platform` | `2MRRW_RECOVERY_SYSTEM/README.md` |

**Full-tree total:** 123 occurrences across **55** files.
