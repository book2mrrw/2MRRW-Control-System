# Operational Philosophy

The 2MRRW platform is **recoverable, reproducible, and milestone-managed**. Recovery architecture should now **stabilize**; future work should focus on product features, not continuously mutating operational machinery.

## Principles

1. **Immutable recovery anchors** — `foundation-stable-v1`, `recovery-anchor.json`, lockfile archives
2. **Rollback lineage** — annotated checkpoint tags + manifests; never delete casually
3. **Reproducible deployments** — pinned dependencies, `npm ci`, documented deploy commands
4. **Milestone checkpointing** — `foundation:checkpoint`, `recover:checkpoint`, `foundation:checkpoint-platform`
5. **Promoted stable foundations** — rare, manual, verified
6. **Synchronized platform recovery** — `foundation:recover-platform` / `foundation:verify-platform`
7. **Deterministic dependency resolution** — no `latest` floats on control foundation packages
8. **Operational continuity** — `2MRRW_RECOVERY_SYSTEM` offline bundle + desktop copies

## What should not keep changing

- Core recover script behavior (`foundation:recover`, `recover:foundation`)
- Sacred tag names and anchor commits without versioned successors
- Layout, media pipeline, and rendering guardrails (separate change control)

## Checkpoint vs foundation

- **Checkpoints** — frequent, disposable, tag collision fails safe
- **Foundations** — rare, sacred, documented in recovery bundle

Only verified states become foundations. Checkpoints do not auto-promote.

## Recovery architecture stabilization

This operational lock-in layer is the **final maturity pass** for recovery mechanics. New capabilities should extend via **new scripts** and docs, not by rewriting anchors or recover internals.

## Related

- [`FOUNDATION_TAG_DISCIPLINE.md`](FOUNDATION_TAG_DISCIPLINE.md)
- [`MILESTONE_RECOVERY_RECALL.md`](MILESTONE_RECOVERY_RECALL.md)
- [`../../OPERATIONAL_LOCK_IN_REPORT.md`](../../OPERATIONAL_LOCK_IN_REPORT.md)
