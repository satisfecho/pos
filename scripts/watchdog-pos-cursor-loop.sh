#!/usr/bin/env bash
# Ensure the POS agent loop is running. Prefer systemd; fall back to the
# background starter when the unit is not installed/enabled.
#
# Usage (repo root or any cwd):
#   ./scripts/watchdog-pos-cursor-loop.sh
#   ./scripts/watchdog-pos-cursor-loop.sh --status
#
# Cron (every 5 min) is installed by scripts/install-pos-cursor-loop-systemd.sh:
#   */5 * * * * cd /development/pos && ./scripts/watchdog-pos-cursor-loop.sh >>/var/log/pos-cursor-loop-watchdog.log 2>&1

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT" || exit 1

UNIT_NAME="${POS_CURSOR_LOOP_UNIT:-pos-cursor-loop.service}"
PID_FILE="${POS_CURSOR_LOOP_PID_FILE:-$REPO_ROOT/tmp/pos-cursor-loop.pid}"
LOG="${POS_CURSOR_LOOP_LOG:-$REPO_ROOT/tmp/pos-cursor-loop.log}"
WATCH_LOG="${POS_CURSOR_LOOP_WATCHDOG_LOG:-/var/log/pos-cursor-loop-watchdog.log}"
STATUS_ONLY=0

for arg in "$@"; do
  case "$arg" in
    --status | -s) STATUS_ONLY=1 ;;
    -h | --help)
      sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
  esac
done

ts() { date -u '+%Y-%m-%dT%H:%M:%SZ'; }

have_systemd_unit() {
  command -v systemctl >/dev/null 2>&1 || return 1
  systemctl cat "$UNIT_NAME" >/dev/null 2>&1
}

unit_enabled() {
  systemctl is-enabled --quiet "$UNIT_NAME" 2>/dev/null
}

unit_active() {
  systemctl is-active --quiet "$UNIT_NAME" 2>/dev/null
}

pid_alive() {
  local pid=""
  [ -f "$PID_FILE" ] || return 1
  pid="$(cat "$PID_FILE" 2>/dev/null || true)"
  [ -n "${pid:-}" ] || return 1
  kill -0 "$pid" 2>/dev/null
}

log_msg() {
  local line
  line="$(ts) $*"
  echo "$line"
  # Best-effort append for cron/operator visibility (may fail if not root).
  mkdir -p "$(dirname "$WATCH_LOG")" 2>/dev/null || true
  echo "$line" >>"$WATCH_LOG" 2>/dev/null || true
}

if [ "$STATUS_ONLY" = "1" ]; then
  if have_systemd_unit; then
    echo "unit=$UNIT_NAME enabled=$(systemctl is-enabled "$UNIT_NAME" 2>/dev/null || echo unknown) active=$(systemctl is-active "$UNIT_NAME" 2>/dev/null || echo unknown)"
  else
    echo "unit=$UNIT_NAME not-installed"
  fi
  if pid_alive; then
    echo "legacy_pid=$(cat "$PID_FILE") alive=yes"
  else
    echo "legacy_pid=none alive=no"
  fi
  exit 0
fi

mkdir -p "$REPO_ROOT/tmp"

# Preferred path: systemd supervises the loop (Restart=always + enable on boot).
if have_systemd_unit && unit_enabled; then
  if unit_active; then
    exit 0
  fi
  log_msg "watchdog: $UNIT_NAME not active — starting"
  if systemctl start "$UNIT_NAME"; then
    log_msg "watchdog: started $UNIT_NAME"
    exit 0
  fi
  log_msg "watchdog: systemctl start $UNIT_NAME failed"
  exit 1
fi

# Fallback: no enabled unit — keep the nohup/double-fork daemon alive.
if pid_alive; then
  exit 0
fi

log_msg "watchdog: legacy loop not running — invoking start-pos-cursor-loop-background.sh"
if ! "$REPO_ROOT/scripts/start-pos-cursor-loop-background.sh"; then
  log_msg "watchdog: start-pos-cursor-loop-background.sh failed (see $LOG)"
  exit 1
fi
log_msg "watchdog: legacy loop started pid=$(cat "$PID_FILE" 2>/dev/null || echo '?')"
exit 0
