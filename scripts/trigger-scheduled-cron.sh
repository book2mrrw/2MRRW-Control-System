#!/usr/bin/env bash
# Trigger scheduled-release publish job on production (or local).
# Requires CRON_SECRET in environment or .env.local (from `vercel env pull`).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

: "${CRON_SECRET:?Set CRON_SECRET in .env.local or export it (vercel env pull may redact — copy from Vercel dashboard)}"
: "${CONTROL_SYSTEM_URL:=https://2-mrrw-control-system.vercel.app}"

echo "Triggering cron at ${CONTROL_SYSTEM_URL}/api/cron/scheduled-releases"
curl -sS -w "\nHTTP %{http_code}\n" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  "${CONTROL_SYSTEM_URL%/}/api/cron/scheduled-releases"
echo
