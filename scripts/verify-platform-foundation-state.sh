#!/usr/bin/env bash
# Verify control + frontend foundation state without git checkout.
#
# Usage:
#   ./scripts/verify-platform-foundation-state.sh
#   npm run foundation:verify-platform
#
# Env:
#   ARTIST_PLATFORM_PATH   Override frontend repo path
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/recovery-common.sh
source "${SCRIPT_DIR}/lib/recovery-common.sh"

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
  fail "artist-platform not found. Set ARTIST_PLATFORM_PATH or clone beside control repo."
}

ARTIST_PLATFORM_DIR="$(resolve_artist_platform_dir)"
ARTIST_PLATFORM_DIR="$(cd "${ARTIST_PLATFORM_DIR}" && pwd)"

if [[ ! -f "${ARTIST_PLATFORM_DIR}/package.json" ]]; then
  fail "Invalid artist-platform dir (no package.json): ${ARTIST_PLATFORM_DIR}"
fi

cd_repo

step "Platform foundation verify"
info "Control repo: ${ROOT}"
info "Frontend repo: ${ARTIST_PLATFORM_DIR}"

step "Control foundation:verify"
npm run foundation:verify

step "Frontend verify:foundation"
(cd "${ARTIST_PLATFORM_DIR}" && npm run verify:foundation)

ok "Platform foundation state verification passed"
