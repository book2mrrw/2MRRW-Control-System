# Sprint history (S1–S6)

Architecture audit: `2MRRW-Platform-Architecture-Audit-2026-05-22.zip`  
Checkpoint: `checkpoint-20260523-000652`

---

## Summary table

| Sprint | Control SHA | Storefront SHA | Theme |
|--------|---------------|----------------|-------|
| **1** | `951de2b` | `ec935d1` | P1.1–P1.6 ownership, signed URLs, playback schema |
| **2** | `cb2827d` | `3c8b49e` | P1.7–P1.11 entitlements table, dual-write, catalog sync releases |
| **3** | `5e9b7b2` | `b17771a` | P2 sync reliability, gift security, publish gates |
| **4** | `2304c9e` | `4d18dc2` | P4 signed URL cache, SSE stability, parity diagnostics |
| **5** | `7fcf4d3` | `4d18dc2` | P4.5 public catalog **503** when durable empty (no demo fallback) |
| **6** | `b2bfa57` | `4d18dc2` | Operator runbook zip, verify documentation, await/IIFE fix |

---

## Commit messages (reference)

| Sprint | Control | Storefront |
|--------|---------|------------|
| 1 | `fix(p1): ownership and sync hardening sprint 1` | `fix(p1): playback and library schema sprint 1` |
| 2 | `fix(p2): entitlements dual-write, catalog sync releases, seed webhook` | `fix(p2): entitlements read path, products schema, e2e playback test` |
| 3 | `fix(p3): sync reliability, publish gates, env validation` | `fix(p3): gift security, sync consumer hardening` |
| 4 | `fix(p4): signed url cache, sse stability, parity diagnostics` | `fix(p4): playback perf, gift reminders, stream e2e http` |
| 5 | `fix(p5): public catalog 503 when durable empty` | _(no code change)_ |
| 6 | `chore(p6): fix foundation test runner, operator runbook` | _(no change)_ |

---

## Deliverables by sprint

| Sprint | Zip / report in Downloads |
|--------|---------------------------|
| 1–4 | `2MRRW-Sprint{N}-HELP-2026-05-22.zip` or implementation reports in `reports/` |
| 5 | `2MRRW-Sprint5-HELP-2026-05-22.zip` |
| 6 | `2MRRW-Sprint6-Operator-Runbook-2026-05-22.zip` |

---

## Production deploys (2026-05-23)

| App | Deployment | SHA |
|-----|------------|-----|
| Control | `dpl_8DanhgyV1SGEC7sb4cb7AzREBTZy` | `7fcf4d3` |
| Storefront | `dpl_4UL1dHuuG1DWLwbQbidQH4foAuUL` | `4d18dc2` |
