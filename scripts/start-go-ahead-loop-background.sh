#!/usr/bin/env bash
# Start scripts/go-ahead-loop.sh detached with nohup (~8h by default).
# Same environment variables as go-ahead-loop.sh (pass through before running this script).
#
# Usage (repo root or any cwd):
#   ./scripts/start-go-ahead-loop-background.sh
#
# Stop:
#   kill "$(cat .go-ahead-loop.pid)" && rm -f .go-ahead-loop.pid
#
# Override duration / interval (example: 2h, every 5m):
#   DURATION_SECONDS=7200 INTERVAL_SECONDS=300 ./scripts/start-go-ahead-loop-background.sh

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT" || exit 1

PID_FILE="$REPO_ROOT/.go-ahead-loop.pid"
LOG="${GO_AHEAD_LOG:-$REPO_ROOT/.go-ahead-loop.log}"

if [ -f "$PID_FILE" ]; then
  OLD_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -n "${OLD_PID:-}" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    echo "go-ahead-loop already running (pid ${OLD_PID}). Stop: kill ${OLD_PID} && rm -f ${PID_FILE}" >&2
    exit 1
  fi
  rm -f "$PID_FILE"
fi

export GO_AHEAD_LOOP=1
export DURATION_SECONDS="${DURATION_SECONDS:-28800}"
export INTERVAL_SECONDS="${INTERVAL_SECONDS:-600}"
export BASE_URL="${BASE_URL:-http://127.0.0.1:4202}"
export GO_AHEAD_LOG="$LOG"
# Optional passthrough (only export if set in caller environment)
[ -n "${SKIP_TESTS:-}" ] && export SKIP_TESTS
[ -n "${COMPOSE_FILES:-}" ] && export COMPOSE_FILES

nohup ./scripts/go-ahead-loop.sh >/dev/null 2>&1 &
echo $! >"$PID_FILE"

echo "Started go-ahead-loop pid=$(cat "$PID_FILE") duration_s=${DURATION_SECONDS} interval_s=${INTERVAL_SECONDS}"
echo "Log: $LOG  (tail -f \"$LOG\")"
echo "Stop: kill \"\$(cat \"$PID_FILE\")\" && rm -f \"$PID_FILE\""
