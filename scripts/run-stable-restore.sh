#!/usr/bin/env bash
# Alias for full foundation recovery (same as run-foundation-recovery.sh).
#
# Usage:
#   ./scripts/run-stable-restore.sh [--deploy]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "${SCRIPT_DIR}/run-foundation-recovery.sh" "$@"
