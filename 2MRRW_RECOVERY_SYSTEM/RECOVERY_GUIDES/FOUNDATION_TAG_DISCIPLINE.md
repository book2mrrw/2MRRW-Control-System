# Foundation Tag Discipline

Separates **experimental milestones** from **promoted sacred foundations**.

## Experimental (disposable milestones)

| Pattern | Repo | Purpose |
|---------|------|---------|
| `checkpoint-YYYYMMDD-HHMM` | Control | Pre-change backend snapshot |
| `frontend-checkpoint-YYYYMMDD-HHMM` | Frontend | Pre-change frontend snapshot |
| `platform-checkpoint-*.md` | Control bundle | Cross-repo coordination record |

Create freely before risky work. Fail if tag/manifest already exists (no overwrites).

## Promoted foundations (immutable anchors)

| Tag | Repo | Role |
|-----|------|------|
| `foundation-stable-v1` | Control | Sacred backend disaster baseline |
| `foundation-stable-2026-05-19` | Control | Dated alias (same lineage as v1 era) |
| `foundation-stable-v1` | Frontend | Sacred frontend origin (on anchor commit) |
| `frontend-stable-foundation` | Frontend | **Branch** — working stable line (do not force-push) |

**Not every good build becomes a foundation.** Only verified, production-smoked, operationally signed-off states are promoted.

## Philosophy

| Concept | Checkpoints | Foundations |
|---------|-------------|-------------|
| Mutability | Many over time; never delete casually | Immutable; never move or overwrite |
| Promotion | Manual, rare, documented | |
| Recovery default | Use latest sacred tag/branch | |
| Lineage | Rollback reference ladder | Canonical anchor |

## Warnings

- **Checkpoint chaos** — dozens of unpushed tags with no manifests
- **Tag mutation** — `git tag -f` on any recovery tag
- **Rollback lineage corruption** — deleting checkpoints that production still references
- **Overwriting anchors** — replacing `foundation-stable-v1` without a new versioned tag (e.g. `foundation-stable-v2`)

## Do not

- Delete old `checkpoint-*` or `frontend-checkpoint-*` tags without explicit ops approval
- Auto-promote checkpoints to foundation
- Self-mutating recovery scripts that rewrite anchors

## Related

- [`MILESTONE_RECOVERY_RECALL.md`](MILESTONE_RECOVERY_RECALL.md)
- [`OPERATIONAL_PHILOSOPHY.md`](OPERATIONAL_PHILOSOPHY.md)
- Frontend: `artist-platform/docs/foundation/FRONTEND_FOUNDATION_TAG_STRATEGY.md`
