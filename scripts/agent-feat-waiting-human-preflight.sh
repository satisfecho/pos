#!/usr/bin/env bash
# Preflight for agent 006/010 (feature coder): skip FEAT tasks blocked on human
# decisions after a single waiting notice was posted on the linked GitHub issue.
#
# Usage: agent-feat-waiting-human-preflight.sh [digest_file]
# Env: POS_REPO_ROOT, AGENT_GH_REPO (default satisfecho/pos)
#
# Exit 0 always (non-fatal). Writes G006_* summary lines to digest or stdout.

set -euo pipefail

ROOT="${POS_REPO_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
TASKDIR="${ROOT}/agents2/tasks"
GH_REPO="${AGENT_GH_REPO:-satisfecho/pos}"
CTX="${1:-}"

G006_FEAT_OK=1
G006_FEAT_TOTAL=0
G006_FEAT_ACTIONABLE=0
G006_FEAT_WAITING_QUIET=0

emit() {
  if [[ -n "$CTX" ]]; then
    echo "$*" >>"$CTX"
  else
    echo "$*"
  fi
}

issue_num_from_feat_basename() {
  local bn="$1"
  local num
  num=$(printf '%s' "$bn" | sed -nE 's/^FEAT-([0-9]+)-.*/\1/p')
  [[ -n "$num" ]] || return 1
  printf '%s' "$num"
}

task_status_section() {
  local f="$1"
  awk '
    /^## Status[[:space:]]*$/ { in_status=1; next }
    in_status && /^## / { exit }
    in_status { print }
  ' "$f" 2>/dev/null || true
}

task_waiting_for_human() {
  local f="$1"
  local section
  section=$(task_status_section "$f")
  [[ -n "$section" ]] || return 1
  printf '%s\n' "$section" | grep -qiE \
    'waiting for human|human in the loop|hard gate|blocked on (human )?decision|do not add `?agent:wip`? until humans decide|\*\*blocked\*\*'
}

waiting_notice_iso_from_task() {
  local f="$1"
  grep -i 'waiting notice posted' "$f" 2>/dev/null \
    | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z' \
    | head -1 || true
}

human_replied_since_iso() {
  local repo="$1"
  local issue="$2"
  local since_iso="$3"
  command -v gh >/dev/null 2>&1 || return 1
  command -v python3 >/dev/null 2>&1 || return 1
  [[ -n "$since_iso" ]] || return 1
  local raw
  if ! raw=$(gh api "repos/${repo}/issues/${issue}/comments?per_page=100" 2>/dev/null); then
    return 1
  fi
  WAITING_SINCE_ISO="$since_iso" WAITING_COMMENTS_JSON="$raw" python3 - <<'PY'
import json, os, re, sys
from datetime import datetime, timezone

since_raw = os.environ.get("WAITING_SINCE_ISO", "").strip()
raw = os.environ.get("WAITING_COMMENTS_JSON", "[]")

def parse_iso(s: str):
    s = (s or "").strip()
    if not s:
        return None
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    try:
        return datetime.fromisoformat(s)
    except ValueError:
        return None

since = parse_iso(since_raw)
if since is None:
    sys.exit(1)
if since.tzinfo is None:
    since = since.replace(tzinfo=timezone.utc)

try:
    comments = json.loads(raw)
except json.JSONDecodeError:
    sys.exit(1)

agent_pat = re.compile(
    r"(🤖\s*Agent|Blocked\s*[—\-]\s*no implementation|blocked on (human )?decision|"
    r"Questions\s+1[–-]5\s+still|waiting for (a )?human|Re-checked questions|"
    r"Committed to `development`|Task planned|Added feature task for review)",
    re.I,
)

for c in comments:
    created = parse_iso(c.get("created_at", ""))
    if created is None or created <= since:
        continue
    body = c.get("body") or ""
    if agent_pat.search(body):
        continue
    # Any other comment after the waiting notice counts as human input.
    sys.exit(0)

sys.exit(1)
PY
}

feat_task_actionable() {
  local f="$1"
  local bn issue since

  if ! task_waiting_for_human "$f"; then
    return 0
  fi

  bn=$(basename "$f")
  issue=$(issue_num_from_feat_basename "$bn" || true)
  if [[ -z "$issue" || "$issue" == "0" ]]; then
    # No linked issue — allow one agent run (task file should carry waiting-notice stamp).
    since=$(waiting_notice_iso_from_task "$f")
    [[ -z "$since" ]]
    return $?
  fi

  since=$(waiting_notice_iso_from_task "$f")
  if [[ -z "$since" ]]; then
    return 0
  fi

  if human_replied_since_iso "$GH_REPO" "$issue" "$since"; then
    return 0
  fi
  return 1
}

utc_now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
if [[ -n "$CTX" ]]; then
  mkdir -p "$(dirname "$CTX")"
  {
    echo "pos-agent-loop 006 feat waiting-human preflight — ${utc_now} (UTC)"
    echo "repo: ${GH_REPO}  tasks: ${TASKDIR}"
    echo ""
  } >"$CTX"
else
  echo "pos-agent-loop 006 feat waiting-human preflight — ${utc_now} (UTC)"
  echo "repo: ${GH_REPO}  tasks: ${TASKDIR}"
  echo ""
fi

shopt -s nullglob
for f in "$TASKDIR"/FEAT-*.md; do
  bn=$(basename "$f")
  [[ "$bn" == "README.md" ]] && continue
  G006_FEAT_TOTAL=$((G006_FEAT_TOTAL + 1))
  issue=$(issue_num_from_feat_basename "$bn" || echo "?")
  if feat_task_actionable "$f"; then
    G006_FEAT_ACTIONABLE=$((G006_FEAT_ACTIONABLE + 1))
    emit "ACTIONABLE ${bn} issue #${issue}"
  else
    G006_FEAT_WAITING_QUIET=$((G006_FEAT_WAITING_QUIET + 1))
    emit "SKIP feat_waiting_human ${bn} issue #${issue} (waiting notice posted; no human reply since)"
  fi
done
shopt -u nullglob

emit ""
emit "=== Preflight summary ==="
emit "G006_FEAT_OK=${G006_FEAT_OK} G006_FEAT_TOTAL=${G006_FEAT_TOTAL} G006_FEAT_ACTIONABLE=${G006_FEAT_ACTIONABLE} G006_FEAT_WAITING_QUIET=${G006_FEAT_WAITING_QUIET}"
