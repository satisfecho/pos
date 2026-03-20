#!/usr/bin/env bash
# Run reservation Puppeteer tests against localhost and optionally production (satisfecho.de).
# Usage: from repo root:
#   ./scripts/run-reservation-tests.sh
#   BASE_URLS="http://127.0.0.1:4203 http://satisfecho.de" ./scripts/run-reservation-tests.sh
#
# Env:
#   BASE_URLS     Space-separated list of base URLs (default: 127.0.0.1 then satisfecho.de)
#   HEADLESS      Set to 1 to run headless
#   STAFF_TEST    Set to 1 to also run staff reservation test (needs LOGIN_EMAIL, LOGIN_PASSWORD or .env)
#   TENANT_ID     Tenant id for book page (default 1)
# For local dev (ng serve / docker dev) front often runs on 4202; set BASE_URLS="http://127.0.0.1:4202" if needed.

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

BASE_URLS="${BASE_URLS:-http://127.0.0.1:4202 http://127.0.0.1:4203 http://satisfecho.de}"
HEADLESS="${HEADLESS:-1}"
STAFF_TEST="${STAFF_TEST:-0}"
TENANT_ID="${TENANT_ID:-1}"

# Load .env for staff test credentials
if [ -f "$REPO_ROOT/.env" ]; then
  set -a
  # shellcheck source=../.env
  . "$REPO_ROOT/.env"
  set +a
fi
export LOGIN_EMAIL="${LOGIN_EMAIL:-$DEMO_LOGIN_EMAIL}"
export LOGIN_PASSWORD="${LOGIN_PASSWORD:-$DEMO_LOGIN_PASSWORD}"

run_public() {
  local base_url="$1"
  echo "--- Public reservation test: $base_url ---"
  if BASE_URL="$base_url" TENANT_ID="$TENANT_ID" HEADLESS="$HEADLESS" node front/scripts/debug-reservations-public.mjs; then
    echo "  OK"
    return 0
  else
    echo "  FAILED"
    return 1
  fi
}

run_staff() {
  local base_url="$1"
  if [ -z "$LOGIN_EMAIL" ] || [ -z "$LOGIN_PASSWORD" ]; then
    echo "  Skip staff test (no LOGIN_EMAIL/LOGIN_PASSWORD)"
    return 0
  fi
  echo "--- Staff reservation test: $base_url ---"
  if BASE_URL="$base_url" HEADLESS="$HEADLESS" LOGIN_EMAIL="$LOGIN_EMAIL" LOGIN_PASSWORD="$LOGIN_PASSWORD" node front/scripts/debug-reservations.mjs; then
    echo "  OK"
    return 0
  else
    echo "  FAILED"
    return 1
  fi
}

FAILED=0
for url in $BASE_URLS; do
  if ! run_public "$url"; then
    FAILED=1
  fi
  if [ "$STAFF_TEST" = "1" ] && ! run_staff "$url"; then
    FAILED=1
  fi
done

echo ""
if [ $FAILED -eq 0 ]; then
  echo "All reservation tests passed."
  exit 0
else
  echo "Some tests failed."
  exit 1
fi
