# Recovery Anchor

Git tags and commits for restoring the control system to a known-good foundation.

## Foundation tags

| Tag | Points to | Purpose |
|-----|-----------|---------|
| `foundation-stable-v1` | HEAD at foundation lock-in (`0e1b15a` era) | Primary restore tag |
| `foundation-stable-2026-05-19` | Same commit as `foundation-stable-v1` | Date-stamped alias |

Create / verify:

```bash
git tag -l 'foundation-stable*'
git show foundation-stable-v1 --oneline -s
```

## Pre-verification anchor (timeline reference)

| Field | Value |
|-------|--------|
| **Commit** | `c75cab5da6236d37f14781760d74e08e4d37d4f0` |
| **Subject** | Document cron precision and go-live ops on main. |
| **Use** | Last commit **before** edge-case verification docs (`5577196+`). Not the media MP4 baseline — for media regressions prefer `b26558e` / `27bca5a`. |

```bash
git checkout c75cab5 -- # inspection only; prefer tags for restore
```

## How to restore production behavior

### 1. Local checkout

```bash
git fetch --tags origin
git checkout foundation-stable-v1
npm ci
npm run verify
```

### 2. Deploy

```bash
npx vercel --prod --yes
```

### 3. Verify

```bash
curl -sS "https://2mrrw-control-system.vercel.app/api/health/basic"
curl -sS "https://2mrrw-control-system.vercel.app/api/public/releases?limit=100"
```

### 4. Merge policy

- Restore experiments on `experimental/*` or `audit/*`, not direct commits to `main` without smoke + review.
- **Never** `git push --force origin main`.

## Related documentation

- `FOUNDATION_BASELINE.md` — what works at lock-in
- `STABLE_DEPLOYMENT_REFERENCE.md` — Vercel + env names + rollback
- `docs/SAFE_RECOVERY_PROTOCOL.md` — full recovery playbook
- `docs/PRE_VERIFICATION_RECOVERY.md` — media/catalog recovery detail
