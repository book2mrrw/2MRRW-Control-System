#!/usr/bin/env bash
# Verify foundation state without changing git checkout.
# Checks guardrails, npm verify, layout catalog rule, and production smoke (CONTROL_URL).
#
# Usage:
#   ./scripts/verify-foundation-state.sh
#   CONTROL_URL=https://example.com EXPECTED_RELEASES=9 ./scripts/verify-foundation-state.sh
#
# Env:
#   CONTROL_URL          Production base URL (default: 2mrrw-control-system.vercel.app)
#   EXPECTED_RELEASES    Expected public release count (default: 9)
#   CURL_MAX_TIME        curl --max-time seconds (default: 20)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/recovery-common.sh
source "${SCRIPT_DIR}/lib/recovery-common.sh"

cd_repo

step "Foundation verify (no checkout)"
info "Repo: ${ROOT}"
info "Control URL: ${CONTROL_URL}"
info "Expected releases: ${EXPECTED_RELEASES}"

# --- Layout: no buildControlCatalogPayload ---
step "Layout guard (buildControlCatalogPayload)"
LAYOUT="${ROOT}/src/app/layout.tsx"
if [[ ! -f "$LAYOUT" ]]; then
  fail "Missing ${LAYOUT}"
fi
if grep -q 'buildControlCatalogPayload' "$LAYOUT"; then
  fail "buildControlCatalogPayload must not appear in src/app/layout.tsx"
fi
ok "layout.tsx has no buildControlCatalogPayload"

# --- Architecture guardrails ---
step "Architecture guardrails"
"${ROOT}/scripts/check-architecture-guardrails.sh"

# --- npm verify ---
step "npm run verify"
npm run verify

# --- Production smoke ---
step "Production smoke (curl)"
HEALTH_URL="${CONTROL_URL}/api/health/basic"
RELEASES_URL="${CONTROL_URL}/api/public/releases?limit=100"

info "GET ${HEALTH_URL}"
HEALTH_BODY="$(curl -fsS --max-time "${CURL_MAX_TIME}" "${HEALTH_URL}")"
if ! echo "${HEALTH_BODY}" | grep -qE '"ok"[[:space:]]*:[[:space:]]*true'; then
  fail "Health check did not report ok: true — body: ${HEALTH_BODY}"
fi
ok "Health basic: ok"

info "GET ${RELEASES_URL}"
RELEASES_BODY="$(curl -fsS --max-time "${CURL_MAX_TIME}" "${RELEASES_URL}")"
if command -v jq >/dev/null 2>&1; then
  COUNT="$(echo "${RELEASES_BODY}" | jq '(.data.releases // .releases // []) | length')"
else
  COUNT="$(node -e "
    const d = JSON.parse(process.argv[1]);
    const list = d.data?.releases ?? d.releases ?? [];
    process.stdout.write(String(list.length));
  " "${RELEASES_BODY}")"
fi

if [[ "${COUNT}" -ne "${EXPECTED_RELEASES}" ]]; then
  fail "Expected ${EXPECTED_RELEASES} public releases, got ${COUNT}"
fi
ok "Public releases count: ${COUNT}"

echo ""
ok "Foundation state verification passed"
