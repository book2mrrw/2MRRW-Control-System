#!/usr/bin/env bash
# Create a dated recovery checkpoint tag and write a snapshot note.
# Usage: ./scripts/create-recovery-checkpoint.sh [optional note]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "error: not a git repository" >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "warning: working tree has uncommitted changes; tag will still point at HEAD" >&2
fi

STAMP="$(date +%Y%m%d-%H%M)"
TAG="checkpoint-${STAMP}"
NOTE="${1:-Manual recovery checkpoint}"

HEAD="$(git rev-parse HEAD)"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
SUBJECT="$(git log -1 --format='%s')"

if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "error: tag $TAG already exists" >&2
  exit 1
fi

git tag -a "$TAG" -m "Recovery checkpoint ${STAMP}: ${NOTE}"

SNAPSHOT_DIR="2MRRW_RECOVERY_SYSTEM/FOUNDATION_SNAPSHOTS"
mkdir -p "$SNAPSHOT_DIR"
NOTE_FILE="${SNAPSHOT_DIR}/checkpoint-${STAMP}.md"

cat >"$NOTE_FILE" <<EOF
# Recovery checkpoint: ${TAG}

**Created:** $(date -u +"%Y-%m-%dT%H:%M:%SZ")  
**Tag:** \`${TAG}\`  
**Branch:** \`${BRANCH}\`  
**Commit:** \`${HEAD}\`  
**Subject:** ${SUBJECT}

## Note

${NOTE}

## Restore this checkpoint

\`\`\`bash
git fetch --tags origin
git checkout ${TAG}
npm ci
npm run verify
./scripts/check-architecture-guardrails.sh
\`\`\`

## Deploy (if promoting to production)

\`\`\`bash
npx vercel --prod --yes
\`\`\`

See [CHECKPOINT_WORKFLOW.md](../RECOVERY_GUIDES/CHECKPOINT_WORKFLOW.md).
EOF

echo "Created tag: ${TAG} -> ${HEAD}"
echo "Wrote snapshot: ${NOTE_FILE}"
echo ""
echo "Push tag: git push origin ${TAG}"
