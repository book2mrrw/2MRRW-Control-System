# Commit, checkpoint, deploy — 2026-05-23

## Commits

### Control (`2MRRW-Control-System`)
| SHA | Message |
|-----|---------|
| `e227b0f` | docs: sprint reports, operator bundle, audit cross-links |
| `9290a5a` | chore: platform checkpoint 20260523-100052 snapshots |

**HEAD:** `9290a5aafa59492c582f55e46dd7792f8c482446`

### Storefront (`artist-platform`)
| SHA | Message |
|-----|---------|
| `0866f99` | chore: bump recovery anchor to main HEAD (pre-existing unpushed) |
| `a501936` | docs: fix E2E control-storefront audit report link |
| `d56874e` | chore: frontend checkpoint 20260523-1000 manifest |

**HEAD:** `d56874e26925aa1dac2fe129519536e574a0c7a1`

## Platform checkpoint tags (pushed to origin)

| Repo | Tag | Points at |
|------|-----|-----------|
| Control | `checkpoint-20260523-100052` | `e227b0fa4769559479e88678cb8e7640ab7ada20` |
| Storefront | `frontend-checkpoint-20260523-1000` | `a5019368c573cc526b95d89dba2302aa3c0d6a5e` |

Manifest: `2MRRW_RECOVERY_SYSTEM/FOUNDATION_SNAPSHOTS/platform-checkpoint-20260523-100052.md`

## Production deploys

### Control
- **Deployment ID:** `dpl_79xKVt8chu3erABmnBg63HeYzerT`
- **URL:** https://2mrrw-control-system-mo7pvn5uz-eellian-morrows-projects.vercel.app
- **Alias:** https://2mrrw-control-system.vercel.app
- **Inspect:** https://vercel.com/eellian-morrows-projects/2mrrw-control-system/79xKVt8chu3erABmnBg63HeYzerT

### Storefront
- **Deployment ID:** `dpl_H6CWrqVR56NF9t78Br1v6mED18Sa`
- **URL:** https://artist-platform-pentyy6t5-eellian-morrows-projects.vercel.app
- **Alias:** https://artist-platform-silk.vercel.app
- **Inspect:** https://vercel.com/eellian-morrows-projects/artist-platform/H6CWrqVR56NF9t78Br1v6mED18Sa

## Smoke tests (production aliases)

| Check | Result |
|-------|--------|
| `GET /api/health/basic` (control) | **200** — `{"data":{"ok":true,...}}` |
| `GET /api/health` (control) | **503** degraded (cron not configured; catalog/storage OK) |
| Public release count (`/api/public/releases`) | **9** releases |
| `GET /` (storefront) | **200** |

## Notes

- Checkpoint run completed fresh (stamp `20260523-100052`); tags pushed without force-push.
- Full `/api/health` returns 503 when status is degraded; basic health and catalog endpoints are OK for operator smoke.
