# Commit, checkpoint, deploy — 2026-05-24

## Commits

### Control (`2MRRW-Control-System`)
| SHA | Message |
|-----|---------|
| `ea23fd3` | chore: platform checkpoint 20260524-125540 snapshots |

**HEAD:** `ea23fd34ee6674d07bb2f3f60ff4e367da2c883b`

### Storefront (`artist-platform`)
| SHA | Message |
|-----|---------|
| `eae082b` | feat: gift icon on release cards, animated gift badge in library and player |
| `11ede22` | fix: auth screens inline styles, 6-digit OTP, guaranteed render |
| `aece1b5` | chore: frontend checkpoint 20260524-1255 manifest |

**HEAD:** `aece1b581ebafc1742b313d5ca346c40f09533c0`

## Platform checkpoint tags (pushed to origin)

| Repo | Tag | Points at |
|------|-----|-----------|
| Control | `checkpoint-20260524-125540` | `9290a5aafa59492c582f55e46dd7792f8c482446` |
| Storefront | `frontend-checkpoint-20260524-1255` | `eae082ba5ca01b62b37981a207aa98ecf1e28bcc` |

Manifest: `2MRRW_RECOVERY_SYSTEM/FOUNDATION_SNAPSHOTS/platform-checkpoint-20260524-125540.md`

## Production deploys

### Control
- **Deployment ID:** `dpl_w78pKv711vP9ExiWWmm3cEXiJfEE`
- **URL:** https://2mrrw-control-system-7y3388lek-eellian-morrows-projects.vercel.app
- **Alias:** https://2mrrw-control-system.vercel.app
- **Inspect:** https://vercel.com/eellian-morrows-projects/2mrrw-control-system/w78pKv711vP9ExiWWmm3cEXiJfEE

### Storefront
- **Deployment ID:** `dpl_6Hb2syCD4jtDoaSN9s4kFbu9wqfx`
- **URL:** https://artist-platform-1a1hd4i43-eellian-morrows-projects.vercel.app
- **Alias:** https://artist-platform-silk.vercel.app
- **Inspect:** https://vercel.com/eellian-morrows-projects/artist-platform/6Hb2syCD4jtDoaSN9s4kFbu9wqfx

## Smoke

| Check | Result |
|-------|--------|
| `GET /api/health/basic` (control) | HTTP 200 — `{"data":{"ok":true,...}}` |
| `GET /api/public/releases` (control) | 9 published releases |
| `GET /` (storefront alias) | HTTP 200 |

## Evidence

See `smoke-evidence.txt` in zip.
