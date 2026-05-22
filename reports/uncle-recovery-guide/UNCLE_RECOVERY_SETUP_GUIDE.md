# 2MRRW Recovery System — Setup Guide for Uncle

This guide explains **how** the recovery system works so you can replicate it on your machine. It does **not** list personal checkpoint commit SHAs — discover those from git tags and manifests on your clone.

---

## 1. What this system is

The **2MRRW Recovery System** is an offline-first disaster-recovery bundle in the **control** repo:

`2MRRW-Control-System/2MRRW_RECOVERY_SYSTEM/`

It pairs with a separate **artist-platform** frontend repo. Recovery is **tag-driven**, **script-automated**, and **fail-safe on collisions** (no overwriting checkpoints or foundations).

| Piece | Role |
|-------|------|
| Sacred foundation tags | Rare, immutable disaster baseline |
| Operational checkpoint tags | Frequent, pre-risk snapshots |
| `FOUNDATION_SNAPSHOTS/*.md` | Human-readable manifests per checkpoint |
| `npm run foundation:*` | Control-repo automation |
| `npm run recover:*` (frontend) | Artist-platform automation |
| `ENVIRONMENT_BACKUPS/*.env.example` | Variable **names** only — no secrets |

---

## 2. Sacred vs operational tags

See `2MRRW_RECOVERY_SYSTEM/RECOVERY_GUIDES/FOUNDATION_TAG_DISCIPLINE.md` (included in zip excerpts).

### Operational (disposable milestones)

| Pattern | Repo | Purpose |
|---------|------|---------|
| `checkpoint-YYYYMMDD-HHMMSS` | Control | Backend snapshot before risky work |
| `frontend-checkpoint-YYYYMMDD-HHMMSS` | Frontend | Frontend snapshot |
| `platform-checkpoint-*.md` | Control bundle | Cross-repo coordination record |

- Create freely before merges, dependency bumps, or large infra changes.
- **Refuse to overwrite:** if tag or manifest file already exists, scripts exit with error.
- Do not `git tag -f` on any recovery tag.

### Sacred (promoted foundations)

| Tag / branch | Repo | Role |
|--------------|------|------|
| `foundation-stable-v1` | Control | Primary disaster-restore tag |
| `foundation-stable-2026-05-19` | Control | Dated alias (same lineage) |
| `foundation-stable-v1` | Frontend | UI-origin anchor |
| `frontend-stable-foundation` | Frontend | **Branch** — operational stable line (no force-push) |

**Not every good build becomes a foundation.** Only verified, production-smoked, signed-off states are promoted manually. Checkpoints do **not** auto-promote.

**Discover what a tag points to (on any clone):**

```bash
git fetch --tags origin
git show foundation-stable-v1 --oneline -s
git rev-parse foundation-stable-v1^{commit}
```

---

## 3. Checkpoint timestamp format and collision handling

Implemented in `scripts/lib/recovery-common.sh`:

- **Format:** `YYYYMMDD-HHMMSS` (wall-clock, **second** precision).
- **Backend tag:** `checkpoint-${STAMP}`
- **Frontend tag:** `frontend-checkpoint-${STAMP}`
- **Platform manifest:** `2MRRW_RECOVERY_SYSTEM/FOUNDATION_SNAPSHOTS/platform-checkpoint-${STAMP}.md`

**Collision avoidance:** `generate_unique_checkpoint_stamp()` loops up to 60 times: if control tag, control snapshot, platform manifest, or frontend tag/manifest exists for that stamp, sleep 1s and try the next second.

**Platform sync:** `foundation:checkpoint-platform` sets `CHECKPOINT_STAMP` so both repos use the **same** stamp when possible. Manifest notes `aligned` vs `staggered stamps` if tags differ.

**Older checkpoints** may use 4-digit time (`checkpoint-20260519-1510`); new ones use 6-digit seconds (`checkpoint-20260522-142635`). Both are valid; restore by **tag name** from the manifest.

---

## 4. `package.json` foundation scripts (control repo)

| npm script | Shell script | What it does |
|------------|--------------|----------------|
| `foundation:recover` | `scripts/run-foundation-recovery.sh` | Fetch tags → checkout `FOUNDATION_TAG` (default `foundation-stable-v1`) → `npm ci` → `npm run verify` → guardrails |
| `foundation:recover -- --deploy` | same + deploy | Above, then `foundation:deploy` |
| `foundation:verify` | `scripts/verify-foundation-state.sh` | **No checkout** — layout rule, guardrails, `npm run verify`, production curl smoke |
| `foundation:deploy` | `scripts/run-foundation-deploy.sh` | verify → `npm run build` → `npx vercel --prod --yes` → verify again |
| `foundation:rollback` | `scripts/run-safe-rollback.sh` | Git only: fetch tags + checkout foundation tag |
| `foundation:checkpoint` | `scripts/create-recovery-checkpoint.sh` | Annotated tag + `FOUNDATION_SNAPSHOTS/checkpoint-*.md` |
| `foundation:checkpoint-platform` | `scripts/run-platform-foundation-checkpoint.sh` | Backend + frontend checkpoints + platform manifest |
| `foundation:recover-platform` | `scripts/run-platform-foundation-recovery.sh` | Both repos (optional `--deploy`, `--dry-run`, `--verify-only`) |
| `foundation:verify-platform` | `scripts/verify-platform-foundation-state.sh` | `foundation:verify` + frontend `verify:foundation` |

**Overrides (env):**

- `FOUNDATION_TAG` — non-default sacred tag
- `CONTROL_URL` — smoke target (default production control URL)
- `EXPECTED_RELEASES` — public release count (default **9**)
- `ARTIST_PLATFORM_PATH` — frontend repo if not `../artist-platform`

### `foundation:recover` flow (no deploy)

1. Warn on dirty working tree
2. `git fetch --tags origin`
3. `git checkout ${FOUNDATION_TAG}`
4. `npm ci`
5. `npm run verify` (typecheck + foundation tests)
6. `./scripts/check-architecture-guardrails.sh`

### `foundation:verify` flow (no git change)

1. Fail if `buildControlCatalogPayload` appears in `src/app/layout.tsx`
2. Architecture guardrails
3. `npm run verify`
4. `GET ${CONTROL_URL}/api/health/basic` → `ok: true`
5. `GET ${CONTROL_URL}/api/public/releases?limit=100` → count equals `EXPECTED_RELEASES`

### `foundation:checkpoint-platform` flow

1. Resolve frontend dir (`ARTIST_PLATFORM_PATH` → sibling `../artist-platform` → fallback path in script)
2. Allocate unique `STAMP`
3. `npm run foundation:checkpoint` (control)
4. `npm run recover:checkpoint` in artist-platform
5. Write `platform-checkpoint-${STAMP}.md` (fail if exists)
6. Optional `--dry-run` prints steps only

---

## 5. Branch model: `main` vs `dev`

**Recovery doctrine (control)** — `docs/BRANCH_STRATEGY.md`:

| Branch / pattern | Role |
|------------------|------|
| **`main`** | Sacred stable line; production deploys; merges only after verify + guardrails + smoke |
| `experimental/*` | Feature spikes |
| `audit/*` | Verification / read-only audits |
| `recovery/*` | Hotfixes cut **from** foundation tag, PR back to `main` |
| `stable-foundation` (optional) | Branch alias of foundation tag for clones that prefer branches |

**Never** `git push --force origin main`.

**`dev` (both repos)** — used in commerce/feature workflows, not as the disaster-restore target. Active integration happens on `dev`; **production recovery** uses sacred tags / `main` policy / `frontend-stable-foundation` on the frontend.

**Frontend operational branch:** `frontend-stable-foundation` — stable working line; do not force-push. Sacred tag `foundation-stable-v1` marks UI origin; operational pointer may also live in `artist-platform/docs/foundation/recovery-anchor.json`.

---

## 6. Vercel + Supabase + R2 environment requirements

### Control (`2mrrw-control-system`)

**Supabase (auth + database only):**

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SECRET_KEY`)

**Deprecated:** `SUPABASE_MEDIA_BUCKET` — obsolete after R2 migration; do not set on new deployments.

**Cloudflare R2 (all media):**

- `CLOUDFLARE_R2_ACCOUNT_ID`
- `CLOUDFLARE_R2_ACCESS_KEY_ID`
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
- `CLOUDFLARE_R2_BUCKET_NAME` (e.g. `2mrrw-media`)
- `CLOUDFLARE_R2_ENDPOINT` — `https://<account_id>.r2.cloudflarestorage.com` (no bucket in path)
- `NEXT_PUBLIC_R2_PUBLIC_URL` — public CDN base for media URLs

**App / ops:**

- `NEXT_PUBLIC_APP_URL` — production control URL
- `NEXT_PUBLIC_CONTROL_SYSTEM_API_URL`
- `CONTROL_SYSTEM_ALLOWED_ORIGINS` — must include frontend production origin
- `CONTROL_SYSTEM_FRONTEND_SHARED_SECRET`, `CONTROL_SYSTEM_ADMIN_API_KEY`
- `CRON_SECRET` — **Production only** (cron routes)
- `VERCEL_PROJECT_ID`, `VERCEL_ORG_ID` (automation)
- Stripe keys if billing enabled

**Recovery order (control):** Supabase trio → R2 sextet → CORS/origins → app URL → cron/admin secrets.

**Smoke after env fix:**

```bash
curl -sS "${CONTROL_URL}/api/health/basic"
curl -sS "${CONTROL_URL}/api/health/db"
curl -sS "${CONTROL_URL}/api/health/storage"
```

### Frontend (`artist-platform`)

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_CONTROL_SYSTEM_API_URL` — **must** point to healthy control
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Stripe / Printful / `GUEST_SESSION_SECRET` as features require

Templates (names only):

- `2MRRW_RECOVERY_SYSTEM/ENVIRONMENT_BACKUPS/control.env.example`
- `2MRRW_RECOVERY_SYSTEM/ENVIRONMENT_BACKUPS/artist-platform.env.example`

**Pull names locally (values may be redacted):**

```bash
vercel env pull .env.local   # in each repo
```

**Never** commit `.env`, `.env.local`, or secret values into git or zips.

### Production URLs (reference)

| App | URL |
|-----|-----|
| Control | https://2mrrw-control-system.vercel.app |
| Frontend | https://artist-platform-silk.vercel.app |

---

## 7. What Uncle needs at his place

### A. Repos and tooling

1. **Clone both repos** with access to `origin` and ability to `git fetch --tags`.
2. **Node/npm** matching project engines; run `npm ci` (not `npm install` for recovery).
3. **Vercel CLI** (`npx vercel`) logged into the same team/projects.
4. **Dashboard access:** Vercel (both projects), Supabase, Cloudflare R2.
5. **Secret store** (1Password, etc.) with production values — not in this zip.

### B. Directory layout (recommended)

```text
~/2MRRW-Control-System/     # control repo
~/artist-platform/        # frontend (or set ARTIST_PLATFORM_PATH)
```

Platform scripts resolve frontend as: env → `../artist-platform` → machine-specific fallback in script (set `ARTIST_PLATFORM_PATH` if not sibling layout).

### C. One-time setup checklist

- [ ] `git fetch --tags origin` in both repos; confirm `foundation-stable-v1` exists
- [ ] Keep a copy of `2MRRW_RECOVERY_SYSTEM/` off GitHub if desired (`LOCAL_DESKTOP_BACKUP_STRATEGY.md`)
- [ ] Configure Vercel Production env from templates + secret store (Supabase + R2 + CORS + shared secrets)
- [ ] Run `npm run foundation:verify` from control (proves prod smoke from your network)
- [ ] Run `npm run foundation:verify-platform` if frontend is cloned
- [ ] Document `ARTIST_PLATFORM_PATH` in shell profile if not sibling layout

### D. Day-to-day operations

| When | Command |
|------|---------|
| Before risky merge/bump | `npm run foundation:checkpoint` or `foundation:checkpoint-platform` |
| Production broken | `npm run foundation:recover` then `foundation:verify`; add `-- --deploy` if redeploy needed |
| Both apps broken | `npm run foundation:recover-platform` |
| Verify only | `foundation:verify` / `foundation:verify-platform` |
| Restore to a milestone (not sacred) | Read `FOUNDATION_SNAPSHOTS/platform-checkpoint-*.md` or `checkpoint-*.md`, `git checkout <tag>`, `npm ci`, `npm run verify` |

### E. Guardrails Uncle must not break

- Do not add `buildControlCatalogPayload` to control `src/app/layout.tsx`.
- Do not force-push `main` or `frontend-stable-foundation`.
- Do not overwrite sacred tags; promote new foundations only as new versioned tags (e.g. `foundation-stable-v2`).
- Do not put secrets in recovery zips or git.

### F. Offline backup habit

Weekly zip of `2MRRW_RECOVERY_SYSTEM/` to cloud/external drive; monthly full repo rsync excluding `node_modules` — see `RECOVERY_GUIDES/LOCAL_DESKTOP_BACKUP_STRATEGY.md`.

---

## 8. Key source paths (in control repo)

| Path |
|------|
| `2MRRW_RECOVERY_SYSTEM/README.md` |
| `scripts/lib/recovery-common.sh` |
| `scripts/run-foundation-recovery.sh` |
| `scripts/verify-foundation-state.sh` |
| `scripts/run-platform-foundation-checkpoint.sh` |
| `scripts/create-recovery-checkpoint.sh` |
| `.cursor/rules/foundation-recovery.mdc` |

---

*No secrets in this document. Configure production values in Vercel dashboards and your password manager.*
