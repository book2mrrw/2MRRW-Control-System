# 2MRRW Vercel Path Build Fix — 2026-05-22

## Vercel symptom

Production deploys failed during `npm run build` with:

```text
TypeError: The "path" argument must be of type string. Received undefined
  code: 'ERR_INVALID_ARG_TYPE'
```

Log sequence (failed deploy `dpl_6tuQ4FmEye3AzdxM9K6iGAnR7oE4`, commit `e8ec9da`):

1. `Applying modifyConfig from Vercel`
2. `> Build error occurred`
3. Path `TypeError` (stack frames hidden as “ignore-listed frames”)

Failure occurs **before** `▲ Next.js … (Turbopack)` and **before** `Creating an optimized production build` — i.e. during early Next config / Vercel adapter setup, not during page compile.

Last **successful** production deploy: `b15f8be` (`dpl_HsnDr4bSBiJUnRqMs3Xgrn2hJeXy`). Failures began on the next commits (`e8ec9da`, `2309f24`, `8935383`) while restoring **build cache** from that successful deployment.

## Local reproduction

| Command | `.env.local` | Exit |
|---------|----------------|------|
| `CI=1 NODE_ENV=production npm run build` | present | **0** |
| same with `.env.local` moved aside | absent | **0** |
| `rm -rf .next && npm run build` (vercel.json buildCommand) | either | **0** |
| `npx vercel@54.3.0 build --yes` (after `vercel pull`) | pulled prod env | **0** |

Could **not** reproduce the path `TypeError` locally; issue is **Vercel build-environment / cache** specific.

## Root cause (operational)

Stale or incompatible **Vercel build cache** (restored from `b15f8be`) combined with Next 16 **Vercel adapter** `modifyConfig` caused early build abort with a path `TypeError` before compilation. Application source at `e8ec9da` builds cleanly on a fresh tree.

## Code hardening (defensive)

| File | Line | Change |
|------|------|--------|
| `src/server/lib/loadEnvLocal.ts` | 18–21 | Normalize `cwd` before `path.join` — avoids `path.join(undefined, '.env.local')` if callers pass `undefined` |
| `src/server/release-management/frontendReleaseIngestionService.ts` | 96–101, 158–162 | `nonEmptyPath()` filter + skip non-strings in `resolveFrontendPath()` |
| `src/server/release-management/frontendIngestionPipeline.ts` | 145–149 | Trim/guard custom `reportDir` before `path.join` / `mkdir` |
| `next.config.mjs` | 3–7 | Explicit `distDir: '.next'` and mutable `experimental: {}` for Vercel `modifyConfig` |
| `vercel.json` | 3 | `buildCommand`: `rm -rf .next && npm run build` — bust stale `.next` on every Vercel build |

## Verification (this run)

```bash
CI=1 NODE_ENV=production npm run build   # exit 0 (with .env.local)
# .env.local moved aside → same, exit 0
rm -rf .next && npm run build            # exit 0 (vercel buildCommand)
```

Full logs: `/tmp/build-with-env.log`, `/tmp/build-no-env.log` (local session).

## Deliverable

Zip: `~/Downloads/2MRRW-Vercel-Path-Build-Fix-2026-05-22.zip`
