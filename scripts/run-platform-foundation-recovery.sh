#!/usr/bin/env bash
# Unified platform foundation recovery (control + artist-platform).
# Thin wrapper — does not modify foundation:recover or recover:foundation internals.
#
# Usage:
#   ./scripts/run-platform-foundation-recovery.sh [--deploy] [--verify-only] [--dry-run]
#   npm run foundation:recover-platform
#   npm run foundation:recover-platform -- --deploy
#
# Env:
#   ARTIST_PLATFORM_PATH   Override frontend repo path
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/recovery-common.sh
source "${SCRIPT_DIR}/lib/recovery-common.sh"

DEPLOY=false
VERIFY_ONLY=false
DRY_RUN=false

for arg in "$@"; do
  case "$arg" in
    --deploy) DEPLOY=true ;;
    --verify-only) VERIFY_ONLY=true ;;
    --dry-run) DRY_RUN=true ;;
    -h|--help)
      cat <<'EOF'
Usage: run-platform-foundation-recovery.sh [--deploy] [--verify-only] [--dry-run]

  (default)     Backend foundation:recover, then frontend recover:foundation
  --deploy      Backend recover+deploy, frontend recover, verify:foundation, recover:deploy --deploy
  --verify-only Skip recover; run foundation:verify + verify:foundation
  --dry-run     Print commands only (no mutations)

Env:
  ARTIST_PLATFORM_PATH   Frontend repo (default: sibling ../artist-platform or ~/artist-platform)
EOF
      exit 0
      ;;
    *)
      fail "Unknown argument: $arg (try --help)"
      ;;
  esac
done

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

run_cmd() {
  local label="$1"
  shift
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] ${label}: (cd ${ROOT}) ${*}"
    return 0
  fi
  step "${label}"
  cd_repo
  "$@"
}

run_frontend() {
  local label="$1"
  shift
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] ${label}: (cd ${ARTIST_PLATFORM_DIR}) ${*}"
    return 0
  fi
  step "${label}"
  (cd "${ARTIST_PLATFORM_DIR}" && "$@")
}

ARTIST_PLATFORM_DIR="$(resolve_artist_platform_dir)"
ARTIST_PLATFORM_DIR="$(cd "${ARTIST_PLATFORM_DIR}" && pwd)"

if [[ ! -f "${ARTIST_PLATFORM_DIR}/package.json" ]]; then
  fail "Invalid artist-platform dir (no package.json): ${ARTIST_PLATFORM_DIR}"
fi

cd_repo

step "Platform foundation recovery"
info "Control repo: ${ROOT}"
info "Frontend repo: ${ARTIST_PLATFORM_DIR}"
if [[ "$VERIFY_ONLY" == "true" ]]; then
  info "Mode: verify-only"
elif [[ "$DEPLOY" == "true" ]]; then
  info "Mode: recover + deploy (backend then frontend)"
elif [[ "$DRY_RUN" == "true" ]]; then
  info "Mode: dry-run"
else
  info "Mode: recover (no production deploy)"
fi

if [[ "$VERIFY_ONLY" == "true" ]]; then
  run_cmd "Control verify" "npm run foundation:verify"
  run_frontend "Frontend verify" "npm run verify:foundation"
  ok "Platform verification complete"
  exit 0
fi

if [[ "$DEPLOY" == "true" ]]; then
  run_cmd "Backend recover + deploy" "npm run foundation:recover -- --deploy"
  run_cmd "Backend post-deploy verify" "npm run foundation:verify"
  run_frontend "Frontend recover" "npm run recover:foundation"
  run_frontend "Frontend verify" "npm run verify:foundation"
  run_frontend "Frontend deploy" "npm run recover:deploy -- --deploy"
else
  run_cmd "Backend recover" "npm run foundation:recover"
  run_frontend "Frontend recover" "npm run recover:foundation"
fi

ok "Platform foundation recovery complete"
if [[ "$DRY_RUN" == "true" ]]; then
  info "Dry run finished — no commands were executed."
elif [[ "$DEPLOY" != "true" ]]; then
  info "Verify platform: npm run foundation:verify-platform"
  info "Deploy frontend: cd artist-platform && npm run recover:deploy -- --deploy"
fi
