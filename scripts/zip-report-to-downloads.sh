#!/usr/bin/env bash
# Zip audit/report/summary markdown (and optional evidence) to ~/Downloads.
set -euo pipefail

usage() {
  cat >&2 <<'EOF'
Usage:
  zip-report-to-downloads.sh <report.md> [--desc "one line"] [extra-file-or-dir ...]
  zip-report-to-downloads.sh --type ReportType <report.md> [--desc "one line"] [extra ...]
  zip-report-to-downloads.sh --archive <file.md> [file2.md ...]

Output: ~/Downloads/2MRRW-{ReportType}-YYYY-MM-DD.zip
        ~/Downloads/2MRRW-Reports-Archive-YYYY-MM-DD.zip  (with --archive)

Never pass .env, .env.local, credentials, or other secret files.
EOF
}

is_secret_path() {
  local p="$1"
  case "$p" in
    *.env|*.env.*|*credentials*|*secret*|*.pem|*.key) return 0 ;;
  esac
  [[ "$(basename "$p")" == .env.local ]] && return 0
  return 1
}

report_type_from_basename() {
  local b="$1"
  b="${b%.md}"
  b="${b#2MRRW-}"
  b="${b%-READONLY-*}"
  b="${b%-READONLY}"
  b="$(echo "$b" | sed -E 's/-[0-9]{4}-[0-9]{2}-[0-9]{2}$//')"
  b="${b//_/-}"
  local IFS='-'
  local -a parts=()
  read -ra parts <<< "$b"
  local out="" seg first rest
  for seg in "${parts[@]}"; do
    [[ -z "$seg" ]] && continue
    first="${seg:0:1}"
    rest="${seg:1}"
    seg="$(printf '%s' "$first" | tr '[:lower:]' '[:upper:]')$(printf '%s' "$rest" | tr '[:upper:]' '[:lower:]')"
    out="${out:+$out-}$seg"
  done
  echo "$out"
}

readme_from_report() {
  local report="$1"
  if [[ -f "$report" ]]; then
    local line
    line="$(grep -m1 '^# ' "$report" 2>/dev/null || true)"
    if [[ -n "$line" ]]; then
      echo "${line#\# }"
      return
    fi
  fi
  echo "2MRRW report deliverable"
}

zip_staging() {
  local out="$1"
  local readme="$2"
  shift 2
  local -a paths=("$@")
  local staging
  staging="$(mktemp -d "/tmp/2mrrw-report-zip-XXXXXX")"
  trap 'rm -rf "$staging"' RETURN
  for p in "${paths[@]}"; do
    if is_secret_path "$p"; then
      echo "Skipping secret path: $p" >&2
      continue
    fi
    if [[ ! -e "$p" ]]; then
      echo "Not found (skipped): $p" >&2
      continue
    fi
    cp -R "$p" "$staging/"
  done
  echo "$readme" > "$staging/README.txt"
  (cd "$staging" && zip -qr "$out" .)
  echo "$out"
  ls -lh "$out"
}

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

TS="$(date +%Y-%m-%d)"

if [[ "$1" == --archive ]]; then
  shift
  if [[ $# -lt 1 ]]; then
    echo "--archive requires at least one file" >&2
    exit 1
  fi
  OUT="$HOME/Downloads/2MRRW-Reports-Archive-${TS}.zip"
  zip_staging "$OUT" "2MRRW reports archive bundle (${TS})" "$@"
  exit 0
fi

REPORT_TYPE=""
DESC=""
if [[ "$1" == --type ]]; then
  [[ $# -lt 3 ]] && { usage; exit 1; }
  REPORT_TYPE="$2"
  shift 2
fi

REPORT="$1"
shift

if [[ ! -f "$REPORT" ]]; then
  echo "Report not found: $REPORT" >&2
  exit 1
fi

while [[ $# -gt 0 && "$1" == --desc ]]; do
  [[ $# -lt 2 ]] && { echo "--desc requires a value" >&2; exit 1; }
  DESC="$2"
  shift 2
done

extras=(); [[ $# -gt 0 ]] && extras=("$@")
[[ -z "$REPORT_TYPE" ]] && REPORT_TYPE="$(report_type_from_basename "$(basename "$REPORT")")"
[[ -z "$DESC" ]] && DESC="$(readme_from_report "$REPORT")"

OUT="$HOME/Downloads/2MRRW-${REPORT_TYPE}-${TS}.zip"
paths=("$REPORT"); (( ${#extras[@]} > 0 )) && paths+=("${extras[@]}")
zip_staging "$OUT" "$DESC" "${paths[@]}"
