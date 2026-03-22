#!/usr/bin/env bash
# Long-running "go-ahead" maintenance: git pull --rebase --autostash, backend pytest in Docker,
# landing Puppeteer smoke. Does not modify application code or auto-commit (no endless commit-hash churn).
#
# Default duration: 8 hours. Requires explicit opt-in.
#
# Usage (from repo root):
#   GO_AHEAD_LOOP=1 ./scripts/go-ahead-loop.sh
#
# Environment:
#   GO_AHEAD_LOOP=1       Required (safety).
#   DURATION_SECONDS      Default 28800 (~8 hours).
#   INTERVAL_SECONDS      Default 600 (10 minutes between cycles).
#   BASE_URL              Default http://127.0.0.1:4202 (landing smoke).
#   GO_AHEAD_LOG          Log file (default: repo root .go-ahead-loop.log, gitignored).
#   SKIP_TESTS=1          Skip pytest and landing-version smoke.
#   COMPOSE_FILES         Arguments for docker compose (default: -f docker-compose.yml -f docker-compose.dev.yml).

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT" || exit 1

if [ "${GO_AHEAD_LOOP:-}" != "1" ]; then
  echo "go-ahead-loop.sh: refusing to run. Set GO_AHEAD_LOOP=1 (see header comments)." >&2
  exit 1
fi

DURATION_SECONDS="${DURATION_SECONDS:-28800}"
INTERVAL_SECONDS="${INTERVAL_SECONDS:-600}"
if [ "$DURATION_SECONDS" -lt 1 ]; then
  echo "go-ahead-loop.sh: DURATION_SECONDS must be >= 1" >&2
  exit 1
fi
if [ "$INTERVAL_SECONDS" -lt 1 ]; then
  INTERVAL_SECONDS=1
fi
BASE_URL="${BASE_URL:-http://127.0.0.1:4202}"
GO_AHEAD_LOG="${GO_AHEAD_LOG:-$REPO_ROOT/.go-ahead-loop.log}"
COMPOSE_FILES="${COMPOSE_FILES:--f docker-compose.yml -f docker-compose.dev.yml}"

ts() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }

log() {
  echo "[$(ts)] $*" | tee -a "$GO_AHEAD_LOG"
}

END_TS=$(( $(date +%s) + DURATION_SECONDS ))
ITER=0

log "start duration_s=${DURATION_SECONDS} interval_s=${INTERVAL_SECONDS} repo=${REPO_ROOT} log=${GO_AHEAD_LOG}"

while [ "$(date +%s)" -lt "$END_TS" ]; do
  ITER=$((ITER + 1))
  log "=== iteration ${ITER} ==="

  if git pull --rebase --autostash 2>&1 | tee -a "$GO_AHEAD_LOG"; then
    :
  else
    log "WARN: git pull --rebase --autostash failed (continuing with local tree)"
  fi

  if [ "${SKIP_TESTS:-}" != "1" ]; then
    # shellcheck disable=SC2086
    if docker compose $COMPOSE_FILES exec -T back python3 -m pytest /app/tests -q 2>&1 | tee -a "$GO_AHEAD_LOG"; then
      log "pytest: OK"
    else
      log "ERROR: pytest failed"
    fi
    if (cd front && BASE_URL="$BASE_URL" HEADLESS=1 npm run test:landing-version) 2>&1 | tee -a "$GO_AHEAD_LOG"; then
      log "landing-version: OK"
    else
      log "ERROR: landing-version failed"
    fi
  fi

  NOW=$(date +%s)
  if [ "$NOW" -ge "$END_TS" ]; then
    break
  fi
  REMAIN=$((END_TS - NOW))
  if [ "$INTERVAL_SECONDS" -lt "$REMAIN" ]; then
    SLEEP_FOR=$INTERVAL_SECONDS
  else
    SLEEP_FOR=$REMAIN
  fi
  if [ "$SLEEP_FOR" -le 0 ]; then
    break
  fi
  log "sleep ${SLEEP_FOR}s (${REMAIN}s remaining in window)"
  sleep "$SLEEP_FOR"
done

log "finished iterations=${ITER}"
