#!/usr/bin/env bash
# Shared constants and colored logging for foundation recovery scripts.
# Source from other scripts: source "$(dirname "${BASH_SOURCE[0]}")/lib/recovery-common.sh"
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

FOUNDATION_TAG="${FOUNDATION_TAG:-foundation-stable-v1}"
FOUNDATION_SHA="${FOUNDATION_SHA:-6d988f5}"
CONTROL_URL="${CONTROL_URL:-https://2-mrrw-control-system.vercel.app}"
EXPECTED_RELEASES="${EXPECTED_RELEASES:-9}"
CURL_MAX_TIME="${CURL_MAX_TIME:-20}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

info() { echo -e "${BLUE}[INFO]${NC} $*"; }
ok() { echo -e "${GREEN}[OK]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
fail() { echo -e "${RED}[FAIL]${NC} $*" >&2; exit 1; }
step() { echo -e "\n${BOLD}=== $* ===${NC}"; }

cd_repo() {
  cd "$ROOT"
}

warn_dirty_tree() {
  if [[ -n "$(git status --porcelain 2>/dev/null)" ]]; then
    warn "Working tree has uncommitted changes. Recovery may not match a clean foundation checkout."
    git status --short
  fi
}

checkout_foundation_tag() {
  if ! git rev-parse --git-dir >/dev/null 2>&1; then
    fail "Not a git repository"
  fi
  info "Fetching tags from origin..."
  git fetch --tags origin
  if ! git rev-parse "${FOUNDATION_TAG}" >/dev/null 2>&1; then
    fail "Tag ${FOUNDATION_TAG} not found. Run: git fetch --tags origin"
  fi
  info "Checking out ${FOUNDATION_TAG}..."
  git checkout "${FOUNDATION_TAG}"
  ok "Checked out ${FOUNDATION_TAG} ($(git rev-parse --short HEAD))"
}

print_recovery_next_steps() {
  local deployed="${1:-false}"
  echo ""
  step "Next steps"
  if [[ "$deployed" == "true" ]]; then
    ok "Production deploy completed."
    info "Verify production: npm run foundation:verify"
  else
    info "Verify locally:  npm run foundation:verify"
    info "Deploy prod:     npm run foundation:deploy"
    info "Or one-shot:     npm run foundation:recover -- --deploy"
  fi
  info "Create checkpoint: npm run foundation:checkpoint"
  info "Docs: 2MRRW_RECOVERY_SYSTEM/RECOVERY_GUIDES/ONE_COMMAND_RECOVERY.md"
}
