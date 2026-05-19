#!/usr/bin/env bash
# Full foundation recovery: checkout tag, npm ci, verify, guardrails, next steps.
# Optional production deploy with --deploy (runs run-foundation-deploy.sh).
#
# Usage:
#   ./scripts/run-foundation-recovery.sh [--deploy]
#   npm run foundation:recover
#   npm run foundation:recover -- --deploy
#
# Env:
#   FOUNDATION_TAG   Git tag (default: foundation-stable-v1)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/recovery-common.sh
source "${SCRIPT_DIR}/lib/recovery-common.sh"

DEPLOY=false
for arg in "$@"; do
  case "$arg" in
    --deploy) DEPLOY=true ;;
    -h|--help)
      echo "Usage: $0 [--deploy]"
      echo "  --deploy   After verify, run foundation deploy (verify + build + vercel --prod)"
      exit 0
      ;;
    *)
      fail "Unknown argument: $arg (try --deploy)"
      ;;
  esac
done

cd_repo

step "Foundation recovery — ${FOUNDATION_TAG} (${FOUNDATION_SHA})"
warn_dirty_tree

checkout_foundation_tag

step "Clean install"
npm ci

step "Verify + guardrails"
npm run verify
"${ROOT}/scripts/check-architecture-guardrails.sh"

DEPLOYED=false
if [[ "$DEPLOY" == "true" ]]; then
  step "Deploy (--deploy)"
  "${SCRIPT_DIR}/run-foundation-deploy.sh"
  DEPLOYED=true
fi

ok "Foundation recovery complete at $(git rev-parse --short HEAD)"
print_recovery_next_steps "$DEPLOYED"
