# Pre-Verification Recovery

**Date:** 2026-05-19  
**Production URL:** https://2mrrw-control-system.vercel.app  
**HEAD (recovery deploy):** `6112e55` (stabilization base `84d5e6e`)

---

## Phase 1 — Anchor commit (pre edge verification)

| Field | Value |
|-------|--------|
| **PRIMARY TARGET** | `c75cab5da6236d37f14781760d74e08e4d37d4f0` |
| **Timestamp** | `2026-05-19 04:10:34 -0500` |
| **Subject** | Document cron precision and go-live ops on main. |
| **First audit commit (excluded)** | `5577196` — Add comprehensive go-live edge-case verification report (`EDGE_CASE_VERIFICATION.md`) |

**Rationale:** `git log -- PRE_LAUNCH_AUDIT.md` is empty (file never landed on `main`). Edge / pre-launch verification work begins at `5577196` with `EDGE_CASE_VERIFICATION.md`. The commit **immediately before** that line is `c75cab5`.

### Related checkpoints (media context)

| Commit | When | Role |
|--------|------|------|
| `ac7d902` | 2026-05-19 | PR #2 merge — media sync studio baseline |
| `cb21099` | 04:45 | Cover/hydration fixes during go-live ops |
| `b26558e` | 05:39 | MP4 single loop resolver fix |
| `27bca5a` | 05:49 | Edge verify doc — prod matrix (4 MP4 singles PASS) |
| `84d5e6e` | later | Surgical prod recovery (layout/catalog load) |

**Media reference state for recovery:** `b26558e` / `27bca5a` (not `c75cab5` — anchor is timeline only).

---

## Phase 2 — KEEP (current main stabilization)

Preserved on `main` after `84d5e6e`:

| Requirement | Status |
|-------------|--------|
| `layout.tsx` — no `buildControlCatalogPayload`, no `force-dynamic` | ✅ `initialCatalog={[]}` |
| Hydration promise cache | ✅ `frontendReleaseIngestionService.ts` |
| Reduced signing in catalog payload | ✅ `resolveReleaseMediaPublic` (public paths + slug MP4) |
| Scoped `media_assets` queries | ✅ `releaseCatalogService.ts`, `releaseService.ts` |
| Singleton Supabase client | ✅ `src/server/supabase/client.ts` |
| Pinned `next@16.2.6`, `@supabase/supabase-js@2.105.4` | ✅ `package.json` |
| `/api/health/basic` | ✅ |
| Light `/diagnostics` page | ✅ `force-dynamic` only on dashboard/diagnostics |

---

## Phase 3 — RECOVER (media / catalog rendering)

```bash
git diff b26558e..HEAD -- src/lib/media src/components/media src/server/catalog src/server/media src/app/api/public
```

**Result:** No media file regressions vs `b26558e` / `27bca5a` except stabilization paths:

- `controlCatalogPayload.ts` — inlined `resolveReleaseMediaPublic` (slug MP4 + JPEG albums/features); no per-track signing
- `releaseCatalogService.ts` — scoped `media_assets`
- `signedUrlService.ts` — `[recovery-timing]` logs only

**Files verified present (pre-verify stack, not removed):**

- `src/lib/media/frontendMediaFallbacks.ts`
- `src/lib/media/releasePrimaryAsset.ts`
- `src/lib/media/mediaVisual.ts`
- `src/server/media/resolveReleasePrimaryAsset.ts`
- `src/components/media/ReleaseMedia.tsx`, `ReleaseMediaCard.tsx`, `AnimatedCoverArt.tsx`
- `src/app/api/public/releases/route.ts` — `buildReleasePrimaryAsset` + slug motion via `releasePrimaryAsset.ts`

**Not restored (intentional):** `frontendMediaManifest.ts`, `ReleaseMediaRenderer.tsx`, layout hydration, PRE_LAUNCH audit routes, universal pipeline commits (`025812b`..`eae73ab` — removed by rollback per `docs/PROMPT_DEPLOY_TIMELINE.md`).

**Cherry-picks applied:** None required — media behavior already matches edge-verify checkpoint.

---

## Phase 4 — Catalog payload alignment

`buildControlCatalogPayload` uses the same resolver rules as `resolveReleasePrimaryAssetForCatalog` but via public URLs + `slugMotionPublicUrl` to avoid N× signed URL calls. `primaryAsset`, `loopUrl`, `motionUrl`, `posterUrl` populated for studio cards.

---

## Phase 5 — Supabase connectivity

### Vercel env (required)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY` | Server queries |
| `SUPABASE_MEDIA_BUCKET` | Storage signing |
| `NEXT_PUBLIC_APP_URL` | Public API base |

See `.env.example`.

### Code changes

- `src/server/supabase/fetchWithTimeout.ts` — 10s abort on all Supabase `fetch` calls
- `src/server/supabase/client.ts` — `global.fetch: fetchWithTimeout`
- `src/app/api/health/db/route.ts` — 10s `Promise.race` guard on releases count

---

## Phase 6 — Deploy

```bash
npx vercel --prod --yes
git push origin main
```

**Deploy:** `dpl_8psXqWEj4237G4fTPpRNu75t3bs9` — commit `6112e55`  
**Pushed:** `main` → `origin/main`

---

## Phase 7 — Validate

```bash
npm run verify && npm run build
```

Prod smoke:

```bash
curl -sS -o /dev/null -w '%{http_code} %{time_total}s\n' --max-time 15 \
  'https://2mrrw-control-system.vercel.app/api/health/basic'
curl -sS --max-time 15 \
  'https://2mrrw-control-system.vercel.app/api/health/db'
curl -sS --max-time 25 \
  'https://2mrrw-control-system.vercel.app/api/public/releases?limit=5'
curl -sS -o /dev/null -w '%{http_code} %{time_total}s\n' --max-time 15 -I \
  'https://2mrrw-control-system.vercel.app/media'
```

**4 singles MP4 check:** In `/api/public/releases?limit=5`, count releases where `primaryAsset.type === "mp4"` and `src` contains `/videos/singles/`.

---

## Phase 8 — Curl results (post-deploy `6112e55`, 2026-05-19)

| Endpoint | HTTP | Time | Notes |
|----------|------|------|-------|
| `/api/health/basic` | 200 | 0.76s | OK |
| `/api/health/db` | 503 | 10.46s | `Supabase releases count timed out after 10000ms` (fail-fast vs prior >15s hang) |
| `/api/public/releases?limit=5` | timeout | >25s | Still blocked on Supabase-backed `getLatestReleasesDurable` |
| `/media` (HEAD) | 200 | 0.50s | Shell OK |

**MP4 singles in API:** Not verified on prod — `/api/public/releases` did not return JSON (Supabase unreachable/slow from Vercel). Local `npm run test` asserts 4 singles → MP4 via `buildReleasePrimaryAsset`.

### Pre-deploy baseline (before `6112e55`)

| Endpoint | HTTP | Time |
|----------|------|------|
| `/api/health/basic` | 200 | 0.36s |
| `/api/health/db` | timeout | >15s (no body) |

---

## Return summary

| Item | Value |
|------|--------|
| **PRE_VERIFICATION commit** | `c75cab5` (`2026-05-19 04:10:34 -0500`) |
| **Recovered** | Media stack already on `main` (matches `b26558e`/`27bca5a`); Supabase 10s fetch timeout + health/db fail-fast |
| **Deploy URL** | https://2mrrw-control-system.vercel.app |
| **Follow-up** | Fix Vercel ↔ Supabase connectivity (env, region, pooler); then re-run MP4 API smoke |
