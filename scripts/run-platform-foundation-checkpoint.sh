#!/usr/bin/env bash
# Unified platform checkpoint: backend tag, frontend tag, platform manifest.
# Usage: ./scripts/run-platform-foundation-checkpoint.sh ["optional note"]
#   npm run foundation:checkpoint-platform
#   npm run foundation:checkpoint-platform -- --dry-run
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/recovery-common.sh
source "${SCRIPT_DIR}/lib/recovery-common.sh"

DRY_RUN=false
NOTE=""
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    -h|--help)
      cat <<'EOF'
Usage: run-platform-foundation-checkpoint.sh [--dry-run] ["note"]

  1. npm run foundation:checkpoint (control)
  2. npm run recover:checkpoint (artist-platform)
  3. Write platform-checkpoint-YYYYMMDD-HHMM.md (fail if exists)

Env:
  ARTIST_PLATFORM_PATH   Frontend repo path
EOF
      exit 0
      ;;
    *) NOTE="${NOTE:+$NOTE }$arg" ;;
  esac
done

NOTE="${NOTE:-Platform recovery checkpoint}"

resolve_artist_platform_dir() {
  if [[ -n "${ARTIST_PLATFORM_PATH:-}" ]]; then
    echo "${ARTIST_PLATFORM_PATH}"
    return
  fi
  local sibling="${ROOT}/../artist-platform"
  if [[ -d "${sibling}" ]]; then
    echo "${sibling}"
    return
  fi
  if [[ -d "/Users/recharge/artist-platform" ]]; then
    echo "/Users/recharge/artist-platform"
    return
  fi
  fail "artist-platform not found. Set ARTIST_PLATFORM_PATH."
}

ARTIST_PLATFORM_DIR="$(resolve_artist_platform_dir)"
ARTIST_PLATFORM_DIR="$(cd "${ARTIST_PLATFORM_DIR}" && pwd)"

STAMP="$(date +%Y%m%d-%H%M)"
SNAPSHOT_DIR="${ROOT}/2MRRW_RECOVERY_SYSTEM/FOUNDATION_SNAPSHOTS"
PLATFORM_FILE="${SNAPSHOT_DIR}/platform-checkpoint-${STAMP}.md"

if [[ -f "${PLATFORM_FILE}" ]]; then
  fail "Platform manifest already exists: ${PLATFORM_FILE}"
fi

step "Platform checkpoint ${STAMP}"
info "Control repo:  ${ROOT}"
info "Frontend repo: ${ARTIST_PLATFORM_DIR}"
info "Note:          ${NOTE}"

if [[ "$DRY_RUN" == "true" ]]; then
  echo "[dry-run] npm run foundation:checkpoint -- \"${NOTE}\""
  echo "[dry-run] (cd ${ARTIST_PLATFORM_DIR}) npm run recover:checkpoint -- --dry-run \"${NOTE}\""
  echo "[dry-run] Would write: ${PLATFORM_FILE}"
  exit 0
fi

BACKEND_OUT="$(npm run foundation:checkpoint -- "$NOTE" 2>&1 | tee /dev/stderr)"
FRONTEND_OUT="$(cd "${ARTIST_PLATFORM_DIR}" && npm run recover:checkpoint -- "$NOTE" 2>&1 | tee /dev/stderr)"

BACKEND_TAG="$(echo "$BACKEND_OUT" | sed -n 's/^Created tag: \(checkpoint-[^ ]*\).*/\1/p' | tail -1)"
FRONTEND_TAG="$(echo "$FRONTEND_OUT" | sed -n 's/^Created tag: \(frontend-checkpoint-[^ ]*\).*/\1/p' | tail -1)"

if [[ -z "${BACKEND_TAG}" ]]; then
  BACKEND_TAG="checkpoint-${STAMP}"
fi
if [[ -z "${FRONTEND_TAG}" ]]; then
  FRONTEND_TAG="frontend-checkpoint-${STAMP}"
fi

BACKEND_SHA="$(git rev-parse "${BACKEND_TAG}^{commit}" 2>/dev/null || git rev-parse HEAD)"
FRONTEND_SHA="$(git -C "${ARTIST_PLATFORM_DIR}" rev-parse "${FRONTEND_TAG}^{commit}" 2>/dev/null || git -C "${ARTIST_PLATFORM_DIR}" rev-parse HEAD)"

VERIFY_BACKEND="not run"
VERIFY_FRONTEND="not run"
if npm run foundation:verify >/dev/null 2>&1; then
  VERIFY_BACKEND="pass"
else
  VERIFY_BACKEND="fail or skipped"
fi
if (cd "${ARTIST_PLATFORM_DIR}" && npm run verify:foundation >/dev/null 2>&1); then
  VERIFY_FRONTEND="pass"
else
  VERIFY_FRONTEND="fail or skipped"
fi

SYNC_STATUS="aligned"
if [[ "${BACKEND_TAG}" != "checkpoint-${STAMP}" ]] || [[ "${FRONTEND_TAG}" != "frontend-checkpoint-${STAMP}" ]]; then
  SYNC_STATUS="staggered stamps (tags may differ by minute); see tags below"
fi

mkdir -p "${SNAPSHOT_DIR}"
cat >"${PLATFORM_FILE}" <<EOF
# Platform recovery checkpoint: ${STAMP}

**Created:** $(date -u +"%Y-%m-%dT%H:%M:%SZ")  
**Operator note:** ${NOTE}

## Repository SHAs

| Repo | Commit | Checkpoint tag |
|------|--------|----------------|
| Control (backend) | \`${BACKEND_SHA}\` | \`${BACKEND_TAG}\` |
| artist-platform (frontend) | \`${FRONTEND_SHA}\` | \`${FRONTEND_TAG}\` |

## Deployment references

| App | URL |
|-----|-----|
| Control | ${CONTROL_URL:-https://2-mrrw-control-system.vercel.app} |
| Frontend | https://artist-platform-silk.vercel.app |

Sacred foundations (not replaced by checkpoints):

| Repo | Anchor |
|------|--------|
| Control | tag \`foundation-stable-v1\` (\`${FOUNDATION_SHA:-6d988f5}\`) |
| Frontend | branch \`frontend-stable-foundation\` / tag \`foundation-stable-v1\` @ ce6ae20 |

## Verification status

| Step | Result |
|------|--------|
| Backend \`foundation:verify\` | ${VERIFY_BACKEND} |
| Frontend \`verify:foundation\` | ${VERIFY_FRONTEND} |
| Synchronization | ${SYNC_STATUS} |

## Recovery order

1. Control: \`npm run foundation:recover\` or \`git checkout ${BACKEND_TAG}\`
2. Frontend: \`npm run recover:foundation\` or \`git checkout ${FRONTEND_TAG}\`
3. Verify: \`npm run foundation:verify-platform\`

One command: \`npm run foundation:recover-platform\`

## Rollback order

1. Identify target checkpoint tags (this manifest or \`git tag -l '*checkpoint-*'\`)
2. Control: \`git checkout <backend-checkpoint-tag>\` → \`npm ci\` → \`npm run verify\`
3. Frontend: \`git checkout <frontend-checkpoint-tag>\` → \`npm ci\` → \`npm run verify:foundation\`
4. For sacred baseline (not checkpoint): \`foundation-stable-v1\` / \`frontend-stable-foundation\`

## Environment references

- \`2MRRW_RECOVERY_SYSTEM/ENVIRONMENT_BACKUPS/control.env.example\`
- \`2MRRW_RECOVERY_SYSTEM/ENVIRONMENT_BACKUPS/artist-platform.env.example\`
- Frontend anchor: \`artist-platform/docs/foundation/recovery-anchor.json\`

## Push tags

\`\`\`bash
git push origin ${BACKEND_TAG}
cd ${ARTIST_PLATFORM_DIR} && git push origin ${FRONTEND_TAG}
\`\`\`

See [MILESTONE_RECOVERY_RECALL.md](../RECOVERY_GUIDES/MILESTONE_RECOVERY_RECALL.md).
EOF

ok "Platform manifest: ${PLATFORM_FILE}"
info "Backend tag:  ${BACKEND_TAG}"
info "Frontend tag: ${FRONTEND_TAG}"
