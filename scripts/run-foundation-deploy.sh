#!/usr/bin/env bash
# Deploy foundation to Vercel production after local verification.
# Runs verify-foundation-state (local + prod smoke), build, then vercel --prod --yes.
#
# Usage:
#   ./scripts/run-foundation-deploy.sh
#   npm run foundation:deploy
#
# Prerequisites: on foundation tag (or equivalent), npm ci completed, env in Vercel dashboard.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/recovery-common.sh
source "${SCRIPT_DIR}/lib/recovery-common.sh"

cd_repo

step "Foundation deploy"
info "Commit: $(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
warn_dirty_tree

step "Pre-deploy verification"
"${SCRIPT_DIR}/verify-foundation-state.sh"

step "Production build"
npm run build

step "Vercel production deploy"
if ! command -v vercel >/dev/null 2>&1 && ! command -v npx >/dev/null 2>&1; then
  fail "vercel CLI not available (install vercel or use npx)"
fi
npx vercel --prod --yes

step "Post-deploy smoke"
"${SCRIPT_DIR}/verify-foundation-state.sh"

ok "Foundation deployed to production (${CONTROL_URL})"
