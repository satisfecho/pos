#!/usr/bin/env bash
# Reject FEAT tasks parked "waiting for human" with no non-agent reply for N days.
#
# Usage (repo root):
#   ./scripts/agent-feat-stale-waiting-reject.sh
#   AGENT_FEAT_WAITING_REJECT_DAYS=30 ./scripts/agent-feat-stale-waiting-reject.sh
#   AGENT_FEAT_STALE_REJECT=0   # disable (no-op)
#   AGENT_FEAT_STALE_CLOSE_ISSUE=0  # comment only; leave GitHub issue open
#   AGENT_FEAT_STALE_REJECT_DRY_RUN=1  # print actions only
#
# Exit 0 always (non-fatal for the agent loop).

set -euo pipefail

ROOT="${POS_REPO_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
TASKDIR="${ROOT}/agents2/tasks"
GH_REPO="${AGENT_GH_REPO:-satisfecho/pos}"
DAYS="${AGENT_FEAT_WAITING_REJECT_DAYS:-30}"
CLOSE_ISSUE="${AGENT_FEAT_STALE_CLOSE_ISSUE:-1}"
DRY_RUN="${AGENT_FEAT_STALE_REJECT_DRY_RUN:-0}"
MOVE_SCRIPT="${ROOT}/scripts/move-agent-task-to-done.sh"

if [[ "${AGENT_FEAT_STALE_REJECT:-1}" == "0" ]]; then
  echo "----- feat stale-reject (skip: AGENT_FEAT_STALE_REJECT=0)"
  exit 0
fi

if ! [[ "$DAYS" =~ ^[0-9]+$ ]] || ((DAYS < 1)); then
  echo "agent-feat-stale-waiting-reject: invalid AGENT_FEAT_WAITING_REJECT_DAYS=${DAYS}" >&2
  exit 0
fi

issue_num_from_feat_basename() {
  local bn="$1"
  local num
  num=$(printf '%s' "$bn" | sed -nE 's/^FEAT-([0-9]+)-.*/\1/p')
  [[ -n "$num" ]] || return 1
  printf '%s' "$num"
}

slug_from_feat_basename() {
  local bn="$1"
  # FEAT-<issue>-YYYYMMDD-HHMM-<slug>.md or FEAT-YYYYMMDD-HHMM-<slug>.md
  if [[ "$bn" =~ ^FEAT-[0-9]+-[0-9]{8}-[0-9]{4}-(.+)\.md$ ]]; then
    printf '%s' "${BASH_REMATCH[1]}"
    return 0
  fi
  if [[ "$bn" =~ ^FEAT-[0-9]{8}-[0-9]{4}-(.+)\.md$ ]]; then
    printf '%s' "${BASH_REMATCH[1]}"
    return 0
  fi
  printf '%s' "stale-waiting"
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
    r"(🤖\s*Agent|Agent\s+\d{3}:|Blocked\s*[—\-]\s*no implementation|blocked on (human )?decision|"
    r"Questions\s+1[–-]5\s+still|waiting for (a )?human|Re-checked questions|"
    r"Committed to `development`|Task planned|Added feature task for review|"
    r"Restored missing feature task|stale waiting|auto-rejected|REJECTED)",
    re.I,
)

for c in comments:
    created = parse_iso(c.get("created_at", ""))
    if created is None or created <= since:
        continue
    body = c.get("body") or ""
    if agent_pat.search(body):
        continue
    sys.exit(0)

sys.exit(1)
PY
}

iso_older_than_days() {
  local iso="$1"
  local days="$2"
  WAITING_SINCE_ISO="$iso" WAITING_DAYS="$days" python3 - <<'PY'
import os, sys
from datetime import datetime, timezone, timedelta

raw = os.environ.get("WAITING_SINCE_ISO", "").strip()
days = int(os.environ.get("WAITING_DAYS", "30"))
if raw.endswith("Z"):
    raw = raw[:-1] + "+00:00"
try:
    since = datetime.fromisoformat(raw)
except ValueError:
    sys.exit(1)
if since.tzinfo is None:
    since = since.replace(tzinfo=timezone.utc)
now = datetime.now(timezone.utc)
sys.exit(0 if (now - since) >= timedelta(days=days) else 1)
PY
}

update_task_status_rejected() {
  local f="$1"
  local days="$2"
  local now_iso="$3"
  local tmp
  tmp="$(mktemp)"
  python3 - "$f" "$days" "$now_iso" "$tmp" <<'PY'
import sys
from pathlib import Path

path = Path(sys.argv[1])
days = sys.argv[2]
now_iso = sys.argv[3]
out = Path(sys.argv[4])
text = path.read_text()
lines = text.splitlines(keepends=True)
out_lines = []
in_status = False
status_done = False
i = 0
while i < len(lines):
    line = lines[i]
    if line.startswith("## Status") and not status_done:
        out_lines.append(line)
        in_status = True
        i += 1
        # Skip old status bullets until next ##
        while i < len(lines) and not lines[i].startswith("## "):
            i += 1
        out_lines.append(
            f"- **REJECTED** - no human reply within {days} days after waiting notice "
            f"(auto, {now_iso}).\n"
        )
        out_lines.append(f"- **Rejected at:** {now_iso}\n")
        out_lines.append("\n")
        status_done = True
        in_status = False
        continue
    out_lines.append(line)
    i += 1
if not status_done:
    # Insert Status after title / GitHub Issues if missing
    insert_at = 0
    for idx, line in enumerate(out_lines):
        if line.startswith("## "):
            insert_at = idx
            break
    block = [
        "## Status\n",
        f"- **REJECTED** - no human reply within {days} days after waiting notice "
        f"(auto, {now_iso}).\n",
        f"- **Rejected at:** {now_iso}\n",
        "\n",
    ]
    out_lines[insert_at:insert_at] = block
out.write_text("".join(out_lines))
PY
  mv "$tmp" "$f"
}

reject_one() {
  local f="$1"
  local bn issue slug since now_iso stamp new_bn new_path days_msg

  bn=$(basename "$f")
  issue=$(issue_num_from_feat_basename "$bn" || echo "0")
  slug=$(slug_from_feat_basename "$bn")
  since=$(waiting_notice_iso_from_task "$f")
  now_iso=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  stamp=$(date -u +%Y%m%d-%H%M)
  days_msg="$DAYS"

  if [[ -z "$since" ]]; then
    return 0
  fi
  if ! iso_older_than_days "$since" "$DAYS"; then
    return 0
  fi
  if [[ "$issue" != "0" ]] && human_replied_since_iso "$GH_REPO" "$issue" "$since"; then
    echo "----- feat stale-reject: keep ${bn} (human replied after waiting notice)"
    return 0
  fi

  new_bn="REJECTED-${issue}-${stamp}-${slug}.md"
  new_path="${TASKDIR}/${new_bn}"

  echo "----- feat stale-reject: ${bn} → ${new_bn} (waiting since ${since}, days=${DAYS})"
  if [[ "$DRY_RUN" == "1" ]]; then
    return 0
  fi

  update_task_status_rejected "$f" "$days_msg" "$now_iso"
  mv "$f" "$new_path"

  if [[ -x "$MOVE_SCRIPT" ]]; then
    "$MOVE_SCRIPT" "$new_path" || echo "----- feat stale-reject: archive move failed for ${new_bn}" >&2
  fi

  if [[ "$issue" != "0" ]] && command -v gh >/dev/null 2>&1; then
    local body
    body=$(cat <<EOF
🤖 Agent loop: **auto-rejected** after **${DAYS} days** with no human reply since the waiting notice (${since}).

Task archived as \`agents2/tasks/done/…/${new_bn}\`.

Reply on this issue (or reopen) if you still want the work; a new \`FEAT-\` can be filed from **001**.
EOF
)
    gh issue comment "$issue" --repo "$GH_REPO" --body "$body" >/dev/null 2>&1 \
      || echo "----- feat stale-reject: gh comment failed for #${issue}" >&2
    if [[ "$CLOSE_ISSUE" == "1" ]]; then
      gh issue close "$issue" --repo "$GH_REPO" --reason "not planned" >/dev/null 2>&1 \
        || echo "----- feat stale-reject: gh close failed for #${issue}" >&2
    fi
  fi
}

rejected=0
shopt -s nullglob
for f in "$TASKDIR"/FEAT-*.md; do
  bn=$(basename "$f")
  [[ "$bn" == "TEMPLATE.md" ]] && continue
  if ! task_waiting_for_human "$f"; then
    continue
  fi
  before=$(basename "$f")
  reject_one "$f"
  # Count if file left the FEAT queue
  if [[ ! -f "$TASKDIR/$before" ]]; then
    rejected=$((rejected + 1))
  fi
done
shopt -u nullglob

echo "----- feat stale-reject: done rejected=${rejected} days=${DAYS} dry_run=${DRY_RUN}"
exit 0
