# Architecture Guardrails

Anti-patterns that caused production incidents (catalog timeout, MP4 regression, layout blocking). Enforced by `scripts/check-architecture-guardrails.sh` in CI/local verify.

## Forbidden patterns

### 1. Catalog build in root layout

**Do not** import or call `buildControlCatalogPayload` from `src/app/layout.tsx`.

- **Why:** Blocks every page on full catalog + media signing.
- **Do instead:** `initialCatalog={[]}` + client fetch to `/api/admin/catalog`.

### 2. `force-dynamic` on root layout

**Do not** add `export const dynamic = "force-dynamic"` to `src/app/layout.tsx`.

- **Why:** Forces dynamic rendering for the entire app tree.
- **Do instead:** Scope `force-dynamic` to routes that need it (`/diagnostics`, `/dashboard` if required).

### 3. Duplicate frontend ingestion per page

**Do not** call `ensureFrontendReleaseEcosystemImported()` on every `page.tsx`.

- **Why:** Multiplies cold-start import work.
- **Do instead:** Single call on `/dashboard` (or behind one admin entry point).

### 4. Unpinned foundation dependencies

**Do not** use `latest` for `next`, `react`, `react-dom`, or `@supabase/supabase-js`.

- **Pinned:** `next@16.2.6`, `@supabase/supabase-js@2.105.4`, `react@19.2.6`, `react-dom@19.2.6`

### 5. Full-table `media_assets` scans in hot paths

**Do not** reintroduce unscoped `media_assets` selects in catalog/release services.

- **Do instead:** Scoped queries in `releaseCatalogService.ts` / `releaseService.ts`.

### 6. N× signed URL catalog payload

**Do not** sign every track asset when building studio catalog.

- **Do instead:** Public paths + `slugMotionPublicUrl` in `controlCatalogPayload.ts`.

### 7. Universal media pipeline without MP4 matrix test

**Do not** merge pipeline rewrites (`025812b`..`eae73ab` range) without prod MP4 single verification.

- **Reference:** `docs/PROMPT_DEPLOY_TIMELINE.md`, `EDGE_CASE_VERIFICATION.md`

## Automated check

```bash
chmod +x scripts/check-architecture-guardrails.sh
./scripts/check-architecture-guardrails.sh
```

Exit code `0` = pass; non-zero = fail (block merge).

## Allowed exceptions

| Location | Pattern | Reason |
|----------|---------|--------|
| `src/app/api/admin/catalog/route.ts` | `buildControlCatalogPayload` | On-demand API only |
| `src/app/dashboard/page.tsx` | `ensureFrontendReleaseEcosystemImported` | Single hydration entry |
| `src/app/diagnostics/page.tsx` | `force-dynamic` | Ops diagnostics |
