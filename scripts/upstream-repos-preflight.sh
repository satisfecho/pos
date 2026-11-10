#!/usr/bin/env bash
# Preflight for agent 011: public activity on the upstream watch list (config/upstream-watch.json).
# Writes a digest and G011_* summary lines for agents2/pos-cursor-loop.sh.
#
# Usage: upstream-repos-preflight.sh [digest_file]
# Env:
#   POS_REPO_ROOT
#   AGENT_GH_REPO (default satisfecho/pos) — where adaptation issues are filed
#   AGENT_011_STATE — override last-scan.json path
#   UPSTREAM_PREFLIGHT_READONLY=1 — do not write last-scan.json or the stamp
#   UPSTREAM_WATCH_INTERVAL_DAYS — override config interval_days
#   UPSTREAM_WATCH_FORCE=1 — scan even when the interval has not elapsed

set -euo pipefail

ROOT="${POS_REPO_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
GH_REPO="${AGENT_GH_REPO:-satisfecho/pos}"
WATCH="${ROOT}/config/upstream-watch.json"
STATE_DIR="${ROOT}/agents2/011-upstream-monitor"
STATE_FILE="${AGENT_011_STATE:-${STATE_DIR}/last-scan.json}"
STAMP_FILE="${AGENT_011_STAMP:-${STATE_DIR}/time-of-last-review.txt}"
CTX="${1:-}"

G011_GH_OK=0
G011_GH_AUTH_FAILED=0
G011_DUE=0
G011_CHANGES=0
G011_BASELINE=0

emit() {
  if [[ -n "$CTX" ]]; then
    echo "$*" >>"$CTX"
  else
    echo "$*"
  fi
}

days_since() {
  python3 - "$1" <<'PY'
import sys
from datetime import datetime, timezone
raw = (sys.argv[1] or "").strip()
if not raw:
    print(999)
    raise SystemExit
try:
    dt = datetime.strptime(raw[:19], "%Y-%m-%dT%H:%M:%S").replace(tzinfo=timezone.utc)
except ValueError:
    print(999)
    raise SystemExit
print(max(0, (datetime.now(timezone.utc) - dt).days))
PY
}

last_stamp_iso() {
  [[ -f "$STAMP_FILE" ]] || return 0
  grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z' "$STAMP_FILE" 2>/dev/null | tail -1 || true
}

write_project_state() {
  python3 - "$STATE_FILE" "$1" <<'PY'
import json, os, sys
path, blob = sys.argv[1], sys.argv[2]
entry = json.loads(blob)
data = {"projects": {}}
if os.path.isfile(path):
    with open(path) as f:
        data = json.load(f)
data.setdefault("projects", {})
data["projects"][entry["id"]] = {k: v for k, v in entry.items() if k != "id"}
os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
with open(path, "w") as f:
    json.dump(data, f, indent=2, sort_keys=True)
    f.write("\n")
PY
}

stored_project() {
  jq -c --arg id "$1" '.projects[$id] // empty' "$STATE_FILE" 2>/dev/null || true
}

doc_headings() {
  local repo="$1" path="$2" branch="$3"
  gh api "repos/${repo}/contents/${path}?ref=${branch}" 2>/dev/null \
    | python3 -c '
import json, sys, base64
raw = sys.stdin.read().strip()
if not raw:
    print("MISSING")
    raise SystemExit
try:
    data = json.loads(raw)
except json.JSONDecodeError:
    print("MISSING")
    raise SystemExit
sha = data.get("sha") or "missing"
content = data.get("content") or ""
try:
    text = base64.b64decode(content).decode("utf-8", "replace")
except Exception:
    text = ""
heads = []
for line in text.splitlines():
    s = line.strip()
    if s.startswith("#") and len(s) < 120:
        heads.append(s)
    if len(heads) >= 25:
        break
print(sha)
for h in heads:
    print(h)
' || echo "MISSING"
}

mkdir -p "$STATE_DIR"
[[ -f "$STATE_FILE" ]] || echo '{"projects":{}}' >"$STATE_FILE"

utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)
if [[ -n "$CTX" ]]; then
  : >"$CTX"
fi

emit "pos-agent-loop 011 upstream-monitor preflight — ${utc} (UTC)"
emit "watch: ${WATCH}  state: ${STATE_FILE}  issues: ${GH_REPO}"
emit ""

if [[ ! -f "$WATCH" ]]; then
  emit "G011_GH_OK=0 (missing ${WATCH})"
  emit "G011_GH_AUTH_FAILED=0"
  emit "G011_DUE=0"
  emit "G011_CHANGES=0"
  emit "G011_BASELINE=0"
  exit 0
fi

interval="${UPSTREAM_WATCH_INTERVAL_DAYS:-$(jq -r '.interval_days // 7' "$WATCH")}"
max_commits="$(jq -r '.max_commits // 12' "$WATCH")"
prev_iso="$(last_stamp_iso)"
age="$(days_since "${prev_iso:-}")"
emit "=== Cadence ==="
emit "interval_days=${interval} last_stamp=${prev_iso:-none} days_since=${age}"

if [[ "${UPSTREAM_WATCH_FORCE:-0}" != "1" && -n "$prev_iso" && "$age" -lt "$interval" ]]; then
  emit "weekly_due=no (skip GitHub until interval elapses)"
  emit ""
  emit "=== Summary ==="
  emit "G011_GH_OK=1"
  emit "G011_GH_AUTH_FAILED=0"
  emit "G011_DUE=0"
  emit "G011_CHANGES=0"
  emit "G011_BASELINE=0"
  exit 0
fi

G011_DUE=1
emit "weekly_due=yes"
emit ""

if ! command -v gh >/dev/null 2>&1 || ! command -v jq >/dev/null 2>&1; then
  emit "G011_GH_OK=0 (gh and jq required)"
  emit "G011_GH_AUTH_FAILED=0"
  emit "G011_DUE=1"
  emit "G011_CHANGES=0"
  emit "G011_BASELINE=0"
  exit 0
fi

gh_err="$(mktemp)"
if ! gh api user -q .login >/dev/null 2>"$gh_err"; then
  if grep -qiE '401|Bad credentials|not authenticated' "$gh_err" 2>/dev/null; then
    G011_GH_AUTH_FAILED=1
  fi
  emit "=== gh auth FAILED ==="
  emit "$(cat "$gh_err" 2>/dev/null || true)"
  emit "=== Summary ==="
  emit "G011_GH_OK=0"
  emit "G011_GH_AUTH_FAILED=${G011_GH_AUTH_FAILED}"
  emit "G011_DUE=1"
  emit "G011_CHANGES=0"
  emit "G011_BASELINE=0"
  rm -f "$gh_err"
  exit 0
fi
rm -f "$gh_err"
G011_GH_OK=1

emit "=== Watched projects ==="
while IFS= read -r proj; do
  [[ -z "$proj" ]] && continue
  id=$(echo "$proj" | jq -r '.id')
  name=$(echo "$proj" | jq -r '.name')
  repo=$(echo "$proj" | jq -r '.repo')
  docs=$(echo "$proj" | jq -r '.public_docs // [] | .[]')
  meta="$(gh api "repos/${repo}" --jq '[.default_branch, .pushed_at] | @tsv' 2>/dev/null || true)"
  if [[ -z "$meta" ]]; then
    emit "- ${id} ${repo} ERROR (repo metadata failed; cursor unchanged)"
    continue
  fi
  branch="${meta%%$'\t'*}"
  pushed_at="${meta#*$'\t'}"
  head_sha="$(gh api "repos/${repo}/commits/${branch}" --jq '.sha' 2>/dev/null || true)"
  release_tag="$(gh api "repos/${repo}/releases?per_page=1" --jq '.[0].tag_name // empty' 2>/dev/null || true)"
  milestones="$(gh api "repos/${repo}/milestones?state=open&per_page=20" --jq '[.[].title] | sort | join(" | ")' 2>/dev/null || true)"

  prev="$(stored_project "$id")"
  prev_head=""
  prev_rel=""
  prev_ms=""
  if [[ -n "$prev" ]]; then
    prev_head=$(echo "$prev" | jq -r '.head_sha // empty')
    prev_rel=$(echo "$prev" | jq -r '.release_tag // empty')
    prev_ms=$(echo "$prev" | jq -r '.milestones // empty')
  fi

  project_changed=0
  if [[ -z "$prev" ]]; then
    G011_BASELINE=$((G011_BASELINE + 1))
    emit "- ${id} (${name}) ${repo} branch=${branch} BASELINE head=${head_sha:-unknown} release=${release_tag:-none} pushed_at=${pushed_at}"
  else
    emit "- ${id} (${name}) ${repo} branch=${branch} head=${head_sha:-unknown} prev_head=${prev_head:-none} release=${release_tag:-none} pushed_at=${pushed_at}"
    if [[ -n "$head_sha" && "$head_sha" != "$prev_head" ]]; then
      project_changed=1
      emit "  CHANGE commits since ${prev_head:-none} (subjects only, max ${max_commits}):"
      gh api "repos/${repo}/commits?per_page=${max_commits}&sha=${branch}" --jq '.[] | [.sha, (.commit.message | split("\n")[0] | .[0:120])] | @tsv' 2>/dev/null \
        | while IFS=$'\t' read -r sha subject; do
            [[ -z "$sha" ]] && continue
            if [[ -n "$prev_head" && "$sha" == "$prev_head" ]]; then
              break
            fi
            emit "    - ${sha:0:10} ${subject}"
          done || true
    fi
    if [[ "${release_tag}" != "${prev_rel}" ]]; then
      project_changed=1
      emit "  CHANGE release ${prev_rel:-none} -> ${release_tag:-none}"
    fi
    if [[ "${milestones}" != "${prev_ms}" ]]; then
      project_changed=1
      emit "  CHANGE milestones: ${milestones:-none}"
    fi
  fi

  doc_json="{}"
  if [[ -n "$docs" ]]; then
    while IFS= read -r doc; do
      [[ -z "$doc" ]] && continue
      headings="$(doc_headings "$repo" "$doc" "$branch" || true)"
      doc_sha="$(printf '%s\n' "$headings" | head -1)"
      [[ -z "$doc_sha" ]] && doc_sha="missing"
      prev_doc=""
      if [[ -n "$prev" ]]; then
        prev_doc=$(echo "$prev" | jq -r --arg p "$doc" '.docs[$p] // empty')
      fi
      doc_json=$(echo "$doc_json" | jq -c --arg p "$doc" --arg s "$doc_sha" '. + {($p): $s}')
      if [[ -n "$prev" && "$doc_sha" != "$prev_doc" ]]; then
        project_changed=1
        emit "  CHANGE public_doc ${doc} ${prev_doc:-none} -> ${doc_sha} (headings only):"
        printf '%s\n' "$headings" | tail -n +2 | head -25 | while IFS= read -r h; do
          emit "    ${h}"
        done
      elif [[ -z "$prev" ]]; then
        emit "  doc ${doc} sha=${doc_sha} (baseline)"
      fi
    done <<< "$docs"
  fi

  if [[ "$project_changed" -eq 1 ]]; then
    G011_CHANGES=$((G011_CHANGES + 1))
  fi

  if [[ "${UPSTREAM_PREFLIGHT_READONLY:-0}" != "1" && -n "$head_sha" ]]; then
    blob=$(jq -nc \
      --arg id "$id" \
      --arg repo "$repo" \
      --arg branch "$branch" \
      --arg pushed "$pushed_at" \
      --arg head "$head_sha" \
      --arg rel "${release_tag}" \
      --arg ms "${milestones}" \
      --argjson docs "$doc_json" \
      '{id:$id,repo:$repo,branch:$branch,pushed_at:$pushed,head_sha:$head,release_tag:$rel,milestones:$ms,docs:$docs}')
    write_project_state "$blob"
  fi
  emit ""
done < <(jq -c '.projects[]' "$WATCH")

if [[ "$G011_CHANGES" -gt 0 ]]; then
  emit "=== Existing upstream-watch issues on ${GH_REPO} ==="
  found="$(gh search issues --repo "$GH_REPO" "upstream-watch" --limit 20 --json number,title,state,body 2>/dev/null || echo '[]')"
  count=$(echo "$found" | jq 'length')
  if [[ "$count" -eq 0 ]]; then
    emit "(none)"
  else
    echo "$found" | jq -r '.[] | . as $i | (($i.body // "") | [try capture("upstream-watch: (?<k>[^\\n]+)"; "g") catch empty | .k] | join(", ")) as $k | "\($i.state) #\($i.number) \(if $k == "" then "no-key" else $k end) \($i.title)"' \
      | head -20 | while IFS= read -r line; do
        emit "$line"
      done
  fi
  emit ""
fi

emit "=== Summary ==="
emit "G011_GH_OK=${G011_GH_OK}"
emit "G011_GH_AUTH_FAILED=${G011_GH_AUTH_FAILED}"
emit "G011_DUE=${G011_DUE}"
emit "G011_CHANGES=${G011_CHANGES}"
emit "G011_BASELINE=${G011_BASELINE}"

if [[ "${UPSTREAM_PREFLIGHT_READONLY:-0}" != "1" && "$G011_GH_OK" == "1" ]]; then
  printf '%s | 011 preflight | changes=%s baseline=%s\n' \
    "$utc" "$G011_CHANGES" "$G011_BASELINE" >>"$STAMP_FILE"
fi
