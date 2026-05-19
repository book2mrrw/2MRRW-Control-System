#!/usr/bin/env bash
# GitHub CLI wrapper when `gh` is not on PATH (uses bundled .tmp/gh/gh).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GH="${ROOT}/.tmp/gh/gh"
if [[ ! -x "$GH" ]]; then
  echo "Missing ${GH}. Install: brew install gh" >&2
  echo "Or download gh to .tmp/gh/gh from https://github.com/cli/cli/releases" >&2
  exit 127
fi
exec "$GH" "$@"
