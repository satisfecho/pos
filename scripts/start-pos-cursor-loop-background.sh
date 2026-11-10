#!/usr/bin/env bash
# Start agents2/pos-cursor-loop.sh detached with nohup.
#
# Preferred (reboot-safe + Restart=always): install the systemd unit instead:
#   ./scripts/install-pos-cursor-loop-systemd.sh
#   ./scripts/watchdog-pos-cursor-loop.sh --status
#
# Usage (repo root, legacy / no-systemd hosts):
#   ./scripts/start-pos-cursor-loop-background.sh
#   ./scripts/start-pos-cursor-loop-background.sh --restart   # kill existing pid first
#
# Stop:
#   kill "$(cat tmp/pos-cursor-loop.pid)" && rm -f tmp/pos-cursor-loop.pid
#
# Optional env (passed through): AGENT_LOOP_SLEEP_MINUTES, AGENT_PROMOTE,
# AGENT_PROMOTE_INTERVAL_HOURS, AGENT_GIT_SYNC, OLLAMA_MODEL, etc.

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT" || exit 1

mkdir -p "$REPO_ROOT/tmp"
PID_FILE="${POS_CURSOR_LOOP_PID_FILE:-$REPO_ROOT/tmp/pos-cursor-loop.pid}"
LOG="${POS_CURSOR_LOOP_LOG:-$REPO_ROOT/tmp/pos-cursor-loop.log}"
RESTART=0
for arg in "$@"; do
  case "$arg" in
    --restart | -r) RESTART=1 ;;
    -h | --help)
      sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
  esac
done

if [ -f "$PID_FILE" ]; then
  OLD_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -n "${OLD_PID:-}" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    if [ "$RESTART" = "1" ]; then
      echo "Stopping existing pos-cursor-loop pid=${OLD_PID}" >&2
      kill "$OLD_PID" 2>/dev/null || true
      # Give the sleep/cycle a moment to exit; escalate if needed.
      for _ in 1 2 3 4 5; do
        kill -0 "$OLD_PID" 2>/dev/null || break
        sleep 1
      done
      if kill -0 "$OLD_PID" 2>/dev/null; then
        kill -9 "$OLD_PID" 2>/dev/null || true
      fi
      rm -f "$PID_FILE"
    else
      echo "pos-cursor-loop already running (pid ${OLD_PID}). Use --restart or: kill ${OLD_PID} && rm -f ${PID_FILE}" >&2
      exit 1
    fi
  else
    rm -f "$PID_FILE"
  fi
fi

{
  echo ""
  echo "===== loop start $(date) ====="
} >>"$LOG"

# Double-fork daemon so IDE/agent shells cannot reap the loop when their
# command session ends (plain nohup/disown is not enough under Cursor).
LOOP_SCRIPT="$REPO_ROOT/agents2/pos-cursor-loop.sh"
if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 required to daemonize pos-cursor-loop" >&2
  exit 1
fi
python3 - "$LOOP_SCRIPT" "$REPO_ROOT" "$LOG" "$PID_FILE" <<'PY'
import os
import sys

script, repo, log_path, pid_file = sys.argv[1:5]
if os.fork() > 0:
    sys.exit(0)
os.setsid()
if os.fork() > 0:
    sys.exit(0)
os.chdir(repo)
os.umask(0o022)
devnull = os.open(os.devnull, os.O_RDWR)
os.dup2(devnull, 0)
logfd = os.open(log_path, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o644)
os.dup2(logfd, 1)
os.dup2(logfd, 2)
if devnull > 2:
    os.close(devnull)
if logfd > 2:
    os.close(logfd)
with open(pid_file, "w", encoding="utf-8") as fh:
    fh.write(str(os.getpid()))
os.environ["PWD"] = repo
os.execve(script, [script], os.environ)
PY

# Wait briefly for grandchild to write the pid file
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE" 2>/dev/null)" 2>/dev/null; then
    break
  fi
  sleep 0.2
done

if [ ! -f "$PID_FILE" ] || ! kill -0 "$(cat "$PID_FILE" 2>/dev/null)" 2>/dev/null; then
  echo "Failed to start pos-cursor-loop (see $LOG)" >&2
  exit 1
fi

echo "Started pos-cursor-loop pid=$(cat "$PID_FILE")"
echo "Log: $LOG  (tail -f \"$LOG\")"
echo "Stop: kill \"\$(cat \"$PID_FILE\")\" && rm -f \"$PID_FILE\""
