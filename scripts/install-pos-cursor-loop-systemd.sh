#!/usr/bin/env bash
# Install / enable / start the POS agent loop as a reboot-safe systemd service,
# plus a cron watchdog that restarts it if it ever stops.
#
# Usage (repo root, as root):
#   ./scripts/install-pos-cursor-loop-systemd.sh
#   ./scripts/install-pos-cursor-loop-systemd.sh --no-cron
#   ./scripts/install-pos-cursor-loop-systemd.sh --uninstall
#
# After install:
#   systemctl status pos-cursor-loop
#   tail -f tmp/pos-cursor-loop.log
#   ./scripts/watchdog-pos-cursor-loop.sh --status

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT" || exit 1

UNIT_NAME="pos-cursor-loop.service"
UNIT_SRC="$REPO_ROOT/scripts/systemd/pos-cursor-loop.service"
UNIT_DST="/etc/systemd/system/$UNIT_NAME"
DEFAULT_SRC="$REPO_ROOT/scripts/systemd/pos-cursor-loop.default"
DEFAULT_DST="/etc/default/pos-cursor-loop"
WATCHDOG="$REPO_ROOT/scripts/watchdog-pos-cursor-loop.sh"
PID_FILE="$REPO_ROOT/tmp/pos-cursor-loop.pid"
CRON_MARKER="watchdog-pos-cursor-loop.sh"
INSTALL_CRON=1
UNINSTALL=0
POS_HOME="${POS_HOME:-${HOME:-/root}}"

for arg in "$@"; do
  case "$arg" in
    --no-cron) INSTALL_CRON=0 ;;
    --uninstall) UNINSTALL=1 ;;
    -h | --help)
      sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
  esac
done

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root (systemd unit + /etc/default + crontab)." >&2
  exit 1
fi

if ! command -v systemctl >/dev/null 2>&1; then
  echo "systemctl not found — cannot install systemd unit." >&2
  exit 1
fi

remove_cron() {
  if crontab -l 2>/dev/null | grep -qF "$CRON_MARKER"; then
    crontab -l 2>/dev/null | grep -vF "$CRON_MARKER" | crontab - || true
    echo "Removed watchdog cron line."
  fi
}

if [ "$UNINSTALL" = "1" ]; then
  systemctl disable --now "$UNIT_NAME" 2>/dev/null || true
  rm -f "$UNIT_DST"
  systemctl daemon-reload
  remove_cron
  echo "Uninstalled $UNIT_NAME (left $DEFAULT_DST in place if present)."
  exit 0
fi

if [ ! -f "$UNIT_SRC" ]; then
  echo "Missing unit template: $UNIT_SRC" >&2
  exit 1
fi
if [ ! -x "$REPO_ROOT/agents2/pos-cursor-loop.sh" ]; then
  echo "Missing executable loop: $REPO_ROOT/agents2/pos-cursor-loop.sh" >&2
  exit 1
fi
if [ ! -x "$WATCHDOG" ]; then
  chmod +x "$WATCHDOG" || true
fi
if [ ! -x "$REPO_ROOT/scripts/start-pos-cursor-loop-background.sh" ]; then
  chmod +x "$REPO_ROOT/scripts/start-pos-cursor-loop-background.sh" || true
fi

mkdir -p "$REPO_ROOT/tmp"

# Stop legacy double-fork daemon so we do not run two loops.
if [ -f "$PID_FILE" ]; then
  OLD_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -n "${OLD_PID:-}" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    echo "Stopping legacy pos-cursor-loop pid=${OLD_PID}"
    kill "$OLD_PID" 2>/dev/null || true
    for _ in 1 2 3 4 5; do
      kill -0 "$OLD_PID" 2>/dev/null || break
      sleep 1
    done
    if kill -0 "$OLD_PID" 2>/dev/null; then
      kill -9 "$OLD_PID" 2>/dev/null || true
    fi
  fi
  rm -f "$PID_FILE"
fi

# Render unit with this checkout path and home (cursor-agent / gh keyring).
tmp_unit="$(mktemp)"
sed \
  -e "s|__POS_REPO__|${REPO_ROOT}|g" \
  -e "s|__POS_HOME__|${POS_HOME}|g" \
  "$UNIT_SRC" >"$tmp_unit"
install -m 0644 "$tmp_unit" "$UNIT_DST"
rm -f "$tmp_unit"

if [ ! -f "$DEFAULT_DST" ]; then
  install -m 0644 "$DEFAULT_SRC" "$DEFAULT_DST"
  echo "Installed $DEFAULT_DST (edit to set AGENT_* overrides)."
else
  echo "Keeping existing $DEFAULT_DST"
fi

systemctl daemon-reload
systemctl enable "$UNIT_NAME"
systemctl restart "$UNIT_NAME"

# Brief settle so status is meaningful.
sleep 1
if systemctl is-active --quiet "$UNIT_NAME"; then
  echo "Started and enabled $UNIT_NAME"
else
  echo "WARNING: $UNIT_NAME not active yet — check: systemctl status $UNIT_NAME" >&2
  systemctl --no-pager --full status "$UNIT_NAME" || true
fi

if [ "$INSTALL_CRON" = "1" ]; then
  CRON_LINE="*/5 * * * * cd ${REPO_ROOT} && ./scripts/watchdog-pos-cursor-loop.sh >>/var/log/pos-cursor-loop-watchdog.log 2>&1"
  if crontab -l 2>/dev/null | grep -qF "$CRON_MARKER"; then
    echo "Watchdog cron already present."
  else
    (
      crontab -l 2>/dev/null || true
      echo "$CRON_LINE"
    ) | crontab -
    echo "Installed watchdog cron (every 5 min)."
  fi
else
  echo "Skipped cron (--no-cron)."
fi

echo "Log: ${REPO_ROOT}/tmp/pos-cursor-loop.log"
echo "Status: systemctl status ${UNIT_NAME}"
echo "Watchdog: ${WATCHDOG} --status"
