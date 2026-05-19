# Prompt / deploy timeline

Chronological record of production deploy decisions and known-good checkpoints.

## 2026-05-19 — User rollback to edge-verify checkpoint

| Field | Value |
|-------|--------|
| **User-selected restore** | `27bca5a` — "Document full edge verification with media rendering matrix" |
| **Prior HEAD (before restore)** | `eae73ab` — central frontend media manifest |
| **Known-good Vercel deploy** | `dpl_HyJb2XSdrL5AS6cZoL1YdzmybWKQ` (2026-05-19 edge verify: 72 PASS, 4 MP4 singles) |
| **Branch** | `restore/27bca5a` → `main` reset and prod deploy |

### Commit order (media regression context)

```
b26558e  Fix single loop media lookup (MP4 working)
27bca5a  Edge verify doc — 4 singles MP4 verified on prod  ← RESTORE TARGET
025812b  Universal media pipeline — introduced MP4 regression (JPEG when DB has cover_art only)
4c6172e  Partial MP4 fallback fix
f962c51  Full MP4 loop restore fix (after regression)
ba6c7b7  Pin Next.js in vercel.json
eae73ab  Frontend media manifest (reverted by this rollback)
```

**MP4 at `27bca5a`:** Does **not** include `f962c51` (that fix is for code introduced in `025812b`). At `27bca5a`, MP4 still works via `b26558e` resolver — verified in `EDGE_CASE_VERIFICATION.md` matrix J.

**Vercel rollback:** `npx vercel rollback dpl_HyJb2XSdrL5AS6cZoL1YdzmybWKQ` failed (402 — Hobby plan cannot roll back further than previous prod). Restore via git reset + `npx vercel --prod --yes`.

### Commits removed from `main` by this rollback

- `025812b` — universal release media pipeline (regression source)
- `4c6172e` — single MP4 fallback (partial)
- `f962c51` — MP4 loop restore
- `ba6c7b7` — Next.js framework pin
- `eae73ab` — frontend media manifest

If MP4 breaks after restore, prefer cherry-pick `f962c51` onto `27bca5a` rather than restoring to `025812b`..`eae73ab` range.
