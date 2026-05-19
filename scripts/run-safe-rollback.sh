#!/usr/bin/env bash
# Safe git rollback to foundation-stable-v1 (fetch tags + checkout).
# Does not run npm ci or deploy — use run-foundation-recovery.sh for full recovery.
#
# Usage:
#   ./scripts/run-safe-rollback.sh
#   npm run foundation:rollback
#
# Env:
#   FOUNDATION_TAG   Git tag (default: foundation-stable-v1)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/recovery-common.sh
source "${SCRIPT_DIR}/lib/recovery-common.sh"

cd_repo

step "Safe rollback to ${FOUNDATION_TAG} (${FOUNDATION_SHA})"
warn_dirty_tree

checkout_foundation_tag
echo ""
print_recovery_next_steps false
