#!/usr/bin/env bash
# Architecture guardrails — exit 1 on violation.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LAYOUT="$ROOT/src/app/layout.tsx"
FAILED=0

fail() {
  echo "GUARDRAIL FAIL: $*" >&2
  FAILED=1
}

echo "Checking architecture guardrails..."

# 1) No buildControlCatalogPayload in root layout
if [[ -f "$LAYOUT" ]]; then
  if grep -q 'buildControlCatalogPayload' "$LAYOUT"; then
    fail "buildControlCatalogPayload must not appear in src/app/layout.tsx"
  fi
  if grep -qE 'export\s+const\s+dynamic\s*=\s*["'\'']force-dynamic["'\'']' "$LAYOUT"; then
    fail "force-dynamic must not be set on src/app/layout.tsx"
  fi
else
  fail "missing src/app/layout.tsx"
fi

# 2) ensureFrontendReleaseEcosystemImported at most one invocation per page (heuristic)
while IFS= read -r -d '' page; do
  count=$(grep -cE 'ensureFrontendReleaseEcosystemImported\s*\(' "$page" 2>/dev/null || true)
  if [[ "${count:-0}" -gt 1 ]]; then
    fail "$page invokes ensureFrontendReleaseEcosystemImported more than once (${count})"
  fi
done < <(find "$ROOT/src/app" -name 'page.tsx' -print0 2>/dev/null)

# 3) Ingestion hook on at most one page (dashboard)
INGEST_PAGES=()
while IFS= read -r -d '' page; do
  if grep -qE 'ensureFrontendReleaseEcosystemImported\s*\(' "$page" 2>/dev/null; then
    INGEST_PAGES+=("$page")
  fi
done < <(find "$ROOT/src/app" -name 'page.tsx' -print0 2>/dev/null)

if [[ "${#INGEST_PAGES[@]}" -gt 1 ]]; then
  fail "ensureFrontendReleaseEcosystemImported in multiple pages: ${INGEST_PAGES[*]}"
fi

if [[ "$FAILED" -eq 0 ]]; then
  echo "GUARDRAIL PASS: layout catalog, force-dynamic, and ingestion checks OK"
  exit 0
fi

exit 1
