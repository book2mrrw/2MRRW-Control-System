#!/usr/bin/env bash
# 2MRRW Control System — emergency rollback (copy-paste safe)
# Run from repo root after clone. Review before executing in production.
set -euo pipefail

CONTROL_URL="https://2mrrw-control-system.vercel.app"
FRONTEND_URL="https://artist-platform-silk.vercel.app"
FOUNDATION_TAG="foundation-stable-v1"
KNOWN_DEPLOY="dpl_3Q5z4Q1b61JrHXVCZPn9EmiBbjgm"

echo "=== 2MRRW Emergency Rollback ==="
echo "Foundation tag: ${FOUNDATION_TAG}"
echo "Control URL:    ${CONTROL_URL}"
echo ""

# --- Git restore ---
echo "[1/5] Fetch tags and checkout foundation..."
git fetch --tags origin
git checkout "${FOUNDATION_TAG}"

# --- Dependencies ---
echo "[2/5] Clean install..."
npm ci

# --- Verify ---
echo "[3/5] Verify + guardrails..."
npm run verify
./scripts/check-architecture-guardrails.sh

# --- Deploy (uncomment when ready) ---
echo "[4/5] Deploy to Vercel production..."
echo "      Uncomment the next line after reviewing env in Vercel dashboard."
# npx vercel --prod --yes

# --- Smoke ---
echo "[5/5] Post-deploy smoke..."
echo "curl -sS \"${CONTROL_URL}/api/health/basic\""
echo "curl -sS \"${CONTROL_URL}/api/public/releases?limit=100\""
curl -sS "${CONTROL_URL}/api/health/basic" || true
curl -sS "${CONTROL_URL}/api/public/releases?limit=100" | head -c 500 || true
echo ""
echo "Done. If smoke fails, promote deploy ${KNOWN_DEPLOY} in Vercel dashboard."
echo "Frontend: set NEXT_PUBLIC_CONTROL_SYSTEM_API_URL=${CONTROL_URL} and redeploy ${FRONTEND_URL}"
