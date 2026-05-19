# Known Good Commits & Deploy References

Canonical SHAs and tags for restoring 2MRRW Control System behavior. **Prefer tags over raw SHAs** for production restore.

## Foundation tags (primary)

| Tag | Commit | Role |
|-----|--------|------|
| `foundation-stable-v1` | `6d988f573af1fd6f31daa4b90d25bbf92f840ce1` | **Primary disaster restore tag** — docs lock-in at foundation |
| `foundation-stable-2026-05-19` | `6d988f5` (same as above) | Date-stamped alias |

Stabilization behavior (catalog SLA, studio fallback) is defined by **`0e1b15a`** — the tag commit documents and pins that era.

## Stabilization & timeline commits

| Commit | Short | Role |
|--------|-------|------|
| `0e1b15a9be8681ed27de7f0f54ae2cf7f3a5611e` | `0e1b15a` | **Stabilization** — bounded Supabase catalog reads; studio fallback within 5s |
| `c9b4465` | — | Restore catalog population without layout hydration |
| `c75cab5da6236d37f14781760d74e08e4d37d4f0` | `c75cab5` | **Pre-verification** — last commit before edge-case verification docs; timeline anchor only |
| `b26558ebe00027b0e6c58f1a57adb35f6ea827e1` | `b26558e` | **MP4 media baseline** — singles motion loops; use for media-only regressions |
| `27bca5a` | — | MP4 matrix verification era (see deploy timeline) |

## Vercel production deploy references

From [`DEPLOYMENT_REFERENCES/STABLE_DEPLOYMENT_REFERENCE.md`](../DEPLOYMENT_REFERENCES/STABLE_DEPLOYMENT_REFERENCE.md):

| Deploy ID | Use |
|-----------|-----|
| `dpl_3Q5z4Q1b61JrHXVCZPn9EmiBbjgm` | Known-good post edge-verify restore (catalog + 9 releases) |
| `dpl_HyJb2XSdrL5AS6cZoL1YdzmybWKQ` | Edge-verify deploy (MP4 matrix verified) |

**Project:** `2-mrrw-control-system`  
**URL:** https://2-mrrw-control-system.vercel.app

### Frontend (artist-platform)

| Field | Value |
|-------|--------|
| **URL** | https://artist-platform-silk.vercel.app |
| **Critical env** | `NEXT_PUBLIC_CONTROL_SYSTEM_API_URL` → control production URL |

## Restore commands

```bash
# Preferred
git fetch --tags origin
git checkout foundation-stable-v1

# Stabilization code only (no tag)
git checkout 0e1b15a

# Media regression only
git checkout b26558e

# Timeline / pre-verify docs anchor (inspection — not default restore)
git checkout c75cab5
```

## One-command recovery (preferred)

```bash
npm run foundation:recover
npm run foundation:recover -- --deploy   # includes production deploy
npm run foundation:verify                # smoke without checkout
```

Scripts: `scripts/run-foundation-recovery.sh`, `scripts/verify-foundation-state.sh`, `scripts/run-foundation-deploy.sh`.

See [`../RECOVERY_GUIDES/ONE_COMMAND_RECOVERY.md`](../RECOVERY_GUIDES/ONE_COMMAND_RECOVERY.md).

## Verification after checkout (manual)

```bash
npm ci
npm run verify
./scripts/check-architecture-guardrails.sh
npm run foundation:verify
```

See [`../RECOVERY_GUIDES/KNOWN_GOOD_STATE_REFERENCE.md`](../RECOVERY_GUIDES/KNOWN_GOOD_STATE_REFERENCE.md).
