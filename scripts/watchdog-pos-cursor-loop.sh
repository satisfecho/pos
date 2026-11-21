#!/usr/bin/env bash
# Ensure the POS agent loop is running. Prefer systemd; fall back to the
# background starter when the unit is not installed/enabled.
# Also escalate when tmp/agent-git-sync-blocked.txt is older than the alert
# threshold (process can be "alive" while every git sync fails).
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
BLOCK_FILE="${AGENT_GIT_SYNC_BLOCK_FILE:-$REPO_ROOT/tmp/agent-git-sync-blocked.txt}"
# Minutes before a sync-block stamp opens / refreshes a GitHub alert issue.
BLOCK_ALERT_MINUTES="${AGENT_GIT_SYNC_BLOCK_ALERT_MINUTES:-30}"
GH_REPO="${AGENT_GH_REPO:-satisfecho/pos}"
STATUS_ONLY=0

for arg in "$@"; do
  case "$arg" in
    --status | -s) STATUS_ONLY=1 ;;
    -h | --help)
      sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'
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

block_age_seconds() {
  [ -f "$BLOCK_FILE" ] || return 1
  local now mtime
  now="$(date +%s)"
  if mtime="$(stat -c %Y "$BLOCK_FILE" 2>/dev/null)"; then
    :
  elif mtime="$(stat -f %m "$BLOCK_FILE" 2>/dev/null)"; then
    :
  else
    return 1
  fi
  echo $((now - mtime))
}

# Open at most one open issue with body key agent-loop-blocker: git-sync.
escalate_git_sync_block() {
  local age_s reason body existing
  age_s="$(block_age_seconds || echo 0)"
  reason="$(grep -E '^reason=' "$BLOCK_FILE" 2>/dev/null | head -1 | cut -d= -f2- || echo unknown)"
  log_msg "CRITICAL: git sync blocked for ${age_s}s (threshold ${BLOCK_ALERT_MINUTES}m) file=$BLOCK_FILE reason=$reason"

  if ! command -v gh >/dev/null 2>&1; then
    log_msg "escalate: gh not on PATH — fix unmerged paths on the agent host manually"
    return 0
  fi

  existing="$(
    gh issue list --repo "$GH_REPO" --state open --limit 40 \
      --json number,body,title \
      --jq '.[] | select((.body // "") | contains("agent-loop-blocker: git-sync")) | .number' \
      2>/dev/null | head -1 || true
  )"
  if [[ -n "${existing:-}" ]]; then
    log_msg "escalate: open alert issue already exists #$existing"
    return 0
  fi

  body="$(cat <<EOF
agent-loop-blocker: git-sync

The agent host worktree cannot \`git pull\` / sync \`development\`.

- **Stamp:** \`$BLOCK_FILE\`
- **Age (seconds):** ${age_s}
- **Reason:** ${reason}
- **Host path:** \`$REPO_ROOT\`

The loop process may still be running. Every step that needs git sync skips work (including **001** GitHub → FEAT).

**Operator:** SSH to the agent host, \`cd\` to the repo, \`git status\`, resolve unmerged paths, drop conflicted stashes, then \`./scripts/git-sync-development.sh\`. See \`docs/pos-dev-amvara3.md\` and \`docs/agent-loop.md\`.

Do not paste tokens or \`.env\` into this issue.
EOF
)"
  if gh issue create --repo "$GH_REPO" \
    --title "Agent loop blocked: git sync conflict on agent host" \
    --body "$body" >/dev/null; then
    log_msg "escalate: opened GitHub issue for git-sync blocker"
  else
    log_msg "escalate: gh issue create failed"
  fi
}

check_git_sync_block() {
  local age_s threshold_s
  [ -f "$BLOCK_FILE" ] || return 0
  age_s="$(block_age_seconds || echo 0)"
  threshold_s=$((BLOCK_ALERT_MINUTES * 60))
  if ((age_s < threshold_s)); then
    log_msg "git-sync-block: present age=${age_s}s (alert after ${threshold_s}s)"
    return 0
  fi
  escalate_git_sync_block
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
  if [ -f "$BLOCK_FILE" ]; then
    echo "git_sync_block=yes age_s=$(block_age_seconds || echo '?') file=$BLOCK_FILE"
  else
    echo "git_sync_block=no"
  fi
  exit 0
fi

mkdir -p "$REPO_ROOT/tmp"

# Stuck-sync check even when the process is alive (the 2026-11 failure mode).
check_git_sync_block

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
