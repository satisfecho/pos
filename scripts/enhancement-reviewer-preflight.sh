#!/usr/bin/env bash
# Preflight for agent 008 (enhancement reviewer): weekly improvement sweep signals.
# Writes digest to stdout or AGENT_008_CTX file; sets G008_* for pos-cursor-loop.sh gating.
#
# Usage: enhancement-reviewer-preflight.sh [digest_file]
# Env: POS_REPO_ROOT, AGENT_008_STATE (override state json path), ENHANCEMENT_PREFLIGHT_READONLY=1 (no stamp)

set -euo pipefail

ROOT="${POS_REPO_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
TASKDIR="${ROOT}/agents2/tasks"
STATE_DIR="${ROOT}/agents2/008-enhancement-reviewer"
STATE_FILE="${AGENT_008_STATE:-${STATE_DIR}/last-scan.json}"
STAMP_FILE="${STATE_DIR}/time-of-last-review.txt"
CTX="${1:-}"

G008_OK=1
G008_DAYS_SINCE_LAST_REVIEW=999
G008_WEEKLY_DUE=0
G008_DOC_DRIFT=0
G008_TASK_SIGNALS=0
G008_DEMO_SIGNALS=0
G008_SIGNALS=0

emit() {
  if [[ -n "$CTX" ]]; then
    echo "$*" >>"$CTX"
  else
    echo "$*"
  fi
}

days_between_iso() {
  local iso="$1"
  [[ -n "$iso" ]] || { echo 999; return; }
  python3 - "$iso" <<'PY'
import sys
from datetime import datetime, timezone
raw = sys.argv[1].strip()
for fmt in ("%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d %H:%M:%S"):
    try:
        dt = datetime.strptime(raw[:19].replace("T", " " if " " in fmt else "T"), fmt.replace("T", " " if " " in fmt else "T"))
        if "Z" in raw or fmt.endswith("Z"):
            dt = dt.replace(tzinfo=timezone.utc)
        delta = datetime.now(timezone.utc) - dt.astimezone(timezone.utc)
        print(max(0, delta.days))
        sys.exit(0)
    except ValueError:
        pass
print(999)
PY
}

last_review_iso() {
  [[ -f "$STAMP_FILE" ]] || return 0
  head -1 "$STAMP_FILE" | grep -oE '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z' | head -1 || true
}

count_root_tasks() {
  local prefix="$1"
  shopt -s nullglob
  local n=0 f
  for f in "$TASKDIR"/${prefix}*.md; do
    ((n++)) || true
  done
  shopt -u nullglob
  echo "$n"
}

mkdir -p "$STATE_DIR"
[[ -f "$STATE_FILE" ]] || echo '{"last_run":null,"findings":[]}' >"$STATE_FILE"

utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)
if [[ -n "$CTX" ]]; then
  : >"$CTX"
fi

emit "pos-agent-loop 008 enhancement-reviewer preflight — ${utc} (UTC)"
emit "repo: ${ROOT}  tasks: ${TASKDIR}  state: ${STATE_FILE}"
emit ""

last_iso="$(last_review_iso)"
G008_DAYS_SINCE_LAST_REVIEW=$(days_between_iso "$last_iso")
(( G008_DAYS_SINCE_LAST_REVIEW >= 7 )) && G008_WEEKLY_DUE=1

emit "=== Review cadence ==="
emit "last_review_iso=${last_iso:-never}"
emit "days_since_last_review=${G008_DAYS_SINCE_LAST_REVIEW}"
emit "weekly_due=$([[ $G008_WEEKLY_DUE -eq 1 ]] && echo yes || echo no)"
emit ""

emit "=== Task queue (agents2/tasks/) ==="
new_n=$(count_root_tasks "NEW-")
feat_n=$(count_root_tasks "FEAT-")
wip_n=$(count_root_tasks "WIP-")
untested_n=$(count_root_tasks "UNTESTED-")
testing_n=$(count_root_tasks "TESTING-")
closed_n=$(count_root_tasks "CLOSED-")
emit "NEW=${new_n} FEAT=${feat_n} WIP=${wip_n} UNTESTED=${untested_n} TESTING=${testing_n} CLOSED=${closed_n}"
if (( wip_n + testing_n > 8 )); then
  G008_TASK_SIGNALS=$((G008_TASK_SIGNALS + 1))
  emit "SIGNAL task_backlog wip+testing=${wip_n}+${testing_n} (consider pausing new FEAT until drain)"
fi
emit ""

emit "=== Docs / changelog drift (heuristic) ==="
cd "$ROOT"
code_commits_14d=0
if git rev-parse HEAD >/dev/null 2>&1; then
  code_commits_14d=$(git log --since="14 days ago" --oneline -- back/ front/src/ 2>/dev/null | wc -l | tr -d ' ')
fi
emit "code_commits_last_14d(back+front/src)=${code_commits_14d}"

changelog_touch=""
if [[ -f CHANGELOG.md ]]; then
  changelog_touch=$(git log -1 --format=%ci -- CHANGELOG.md 2>/dev/null | head -1 || stat -f %Sm -t "%Y-%m-%d" CHANGELOG.md 2>/dev/null || true)
  if grep -q '^\[Unreleased\]' CHANGELOG.md 2>/dev/null || grep -q '## \[Unreleased\]' CHANGELOG.md 2>/dev/null; then
    unreleased_lines=$(awk '/^## \[Unreleased\]/{f=1;next} /^## \[[0-9]/{f=0} f && /^- /{c++} END{print c+0}' CHANGELOG.md)
    emit "changelog_unreleased_bullets=${unreleased_lines:-0} changelog_last_touch=${changelog_touch:-unknown}"
    if (( code_commits_14d > 5 && unreleased_lines < 2 )); then
      G008_DOC_DRIFT=$((G008_DOC_DRIFT + 1))
      emit "SIGNAL changelog_sparse Unreleased may lag recent code (${code_commits_14d} commits, ${unreleased_lines} bullets)"
    fi
  fi
fi

stale_docs=0
if [[ -d docs ]]; then
  while IFS= read -r doc; do
    [[ -f "$doc" ]] || continue
    doc_age_days=$(python3 - "$doc" <<'PY'
import os, sys, time
from datetime import datetime, timezone
path = sys.argv[1]
mtime = os.path.getmtime(path)
delta = datetime.now(timezone.utc) - datetime.fromtimestamp(mtime, timezone.utc)
print(delta.days)
PY
)
    if (( doc_age_days > 90 && code_commits_14d > 3 )); then
      stale_docs=$((stale_docs + 1))
      emit "stale_doc path=${doc} age_days=${doc_age_days}"
    fi
  done < <(find docs -maxdepth 1 -name '*.md' -type f 2>/dev/null | head -20)
  if (( stale_docs > 0 )); then
    G008_DOC_DRIFT=$((G008_DOC_DRIFT + stale_docs))
    emit "SIGNAL docs_stale count=${stale_docs} (docs/*.md untouched >90d while code moved)"
  fi
fi
emit ""

emit "=== Demo tenant 1 (seeds) ==="
emit "reset_script=scripts/reset-demo-data-on-server.sh"
emit "seed_module=back/app/seeds/reset_demo_data.py (idempotent orders+reservations reset)"
emit "check_tables=back/app/seeds/check_demo_tables.py"
if [[ -x "${ROOT}/scripts/reset-demo-data-on-server.sh" ]]; then
  if grep -qR '0 4 \* \* \*.*reset-demo-data-on-server\.sh' "${ROOT}/docs" 2>/dev/null; then
    emit "demo_daily_reset=documented (docs mention 04:00 UTC cron + reset-demo-data-on-server.sh)"
  else
    G008_DEMO_SIGNALS=1
    emit "SIGNAL demo_daily_reset_not_scheduled Existing reset path is manual/cron-only — consider FEAT for amvara9 cron"
  fi
else
  emit "demo_reset_script=not_executable (chmod +x scripts/reset-demo-data-on-server.sh)"
fi
if command -v docker >/dev/null 2>&1; then
  if docker compose -f "${ROOT}/docker-compose.yml" -f "${ROOT}/docker-compose.dev.yml" ps -q back 2>/dev/null | grep -q .; then
    if docker compose -f "${ROOT}/docker-compose.yml" -f "${ROOT}/docker-compose.dev.yml" exec -T back python -m app.seeds.check_demo_tables 2>/dev/null; then
      emit "demo_tables_check=ok"
    else
      G008_DEMO_SIGNALS=$((G008_DEMO_SIGNALS + 1))
      emit "SIGNAL demo_tables_check=fail (run seed_demo_tables)"
    fi
  else
    emit "demo_tables_check=skipped (back container not running)"
  fi
else
  emit "demo_tables_check=skipped (docker not on PATH)"
fi
emit ""

emit "=== Summary ==="
G008_SIGNALS=$((G008_WEEKLY_DUE + G008_DOC_DRIFT + G008_TASK_SIGNALS + G008_DEMO_SIGNALS))
emit "G008_OK=${G008_OK}"
emit "G008_DAYS_SINCE_LAST_REVIEW=${G008_DAYS_SINCE_LAST_REVIEW}"
emit "G008_WEEKLY_DUE=${G008_WEEKLY_DUE}"
emit "G008_DOC_DRIFT=${G008_DOC_DRIFT}"
emit "G008_TASK_SIGNALS=${G008_TASK_SIGNALS}"
emit "G008_DEMO_SIGNALS=${G008_DEMO_SIGNALS}"
emit "G008_SIGNALS=${G008_SIGNALS}"
emit "cursor_agent_when: G008_WEEKLY_DUE=1 OR G008_DOC_DRIFT>0 OR G008_TASK_SIGNALS>0 OR AGENT_ENHANCEMENT_REVIEWER_ALWAYS=1"

if [[ "${ENHANCEMENT_PREFLIGHT_READONLY:-0}" != "1" ]]; then
  printf '%s UTC | 008 preflight | days=%s weekly_due=%s signals=%s doc_drift=%s demo=%s\n\n' \
    "$utc" "$G008_DAYS_SINCE_LAST_REVIEW" "$G008_WEEKLY_DUE" "$G008_SIGNALS" "$G008_DOC_DRIFT" "$G008_DEMO_SIGNALS" >>"$STAMP_FILE"
  python3 - "$STATE_FILE" "$utc" "$G008_SIGNALS" <<'PY'
import json, os, sys
path, utc, signals = sys.argv[1:4]
data = {"last_run": None, "findings": []}
if os.path.isfile(path):
    with open(path) as f:
        data = json.load(f)
data["last_run"] = utc
data["last_signals"] = int(signals)
os.makedirs(os.path.dirname(path), exist_ok=True)
with open(path, "w") as f:
    json.dump(data, f, indent=2, sort_keys=True)
    f.write("\n")
PY
fi
