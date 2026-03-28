#!/usr/bin/env bash
# POS agent loop orchestrator (mac-stats-reviewer style). Run from repo root:
#   ./agents/pos-agent-loop.sh [COMMAND]
# or:
#   cd agents && ./pos-agent-loop.sh [COMMAND]
#
# Starts Docker stack: use ./run.sh -dev at repo root (separate from this file).
# Requires: cursor-agent on PATH (Cursor CLI), unless you only use subcommands that skip.
#
# Task dir: agents/tasks/ (sibling of this script).

set -euo pipefail

SCRIPTDIR="$(cd "$(dirname "$0")" && pwd)"
TASKDIR="${SCRIPTDIR}/tasks"
REPO_ROOT="$(cd "${SCRIPTDIR}/.." && pwd)"
sleepminutes="${AGENT_LOOP_SLEEP_MINUTES:-5}"
# macOS sleep(1) uses seconds only; convert minutes → seconds.
sleepseconds=$((sleepminutes * 60))
_tdir="${TMPDIR:-/tmp}"
_tdir="${_tdir%/}"
AGENT_LOOP_TMP="${AGENT_LOOP_TMP:-${_tdir}/pos-agent-loop}"
unset _tdir
GH_REPO="${AGENT_GH_REPO:-satisfecho/pos}"
LAST_REVIEW_FILE="${SCRIPTDIR}/001-log-reviewer/time-of-last-review.txt"

cd "$SCRIPTDIR" || exit 1

have_cursor_agent() {
  command -v cursor-agent >/dev/null 2>&1
}

# True if issue #num is already referenced in a root-level task file (dedupe hint for 001 preflight).
issue_linked_in_root_tasks() {
  local num="$1"
  local f bn
  shopt -s nullglob
  for f in "$TASKDIR"/*.md; do
    bn=$(basename "$f")
    [[ "$bn" == "README.md" ]] && continue
    if grep -qE "#${num}([^0-9]|$)|/issues/${num}([^0-9]|$)" "$f" 2>/dev/null; then
      shopt -u nullglob
      return 0
    fi
  done
  shopt -u nullglob
  return 1
}

# ISO timestamp from first line of time-of-last-review.txt, or empty.
last_review_iso_utc() {
  [[ -f "$LAST_REVIEW_FILE" ]] || return 0
  head -1 "$LAST_REVIEW_FILE" | grep -oE '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z' | head -1
}

# Write GitHub + Docker log digest for 001; set G001_* variables for gating.
# G001_GH_OK: 1 if gh listed issues successfully; 0 if gh missing or failed.
# G001_UNTRACKED_ISSUES: count of open issues with no #NN / issues/NN link in root tasks (0 if gh failed).
# G001_LOG_SIGNALS: 1 if heuristic incident lines found in recent container logs.
prepare_001_preflight_context() {
  local ctx="$1"
  mkdir -p "$(dirname "$ctx")"
  G001_GH_OK=0
  G001_UNTRACKED_ISSUES=0
  G001_LOG_SIGNALS=0
  local utc
  utc=$(date -u "+%Y-%m-%dT%H:%M:%SZ")
  {
    echo "pos-agent-loop 001 preflight — $utc (UTC)"
    echo "repo: $GH_REPO  tasks: $TASKDIR"
    echo ""
    echo "=== GitHub (open issues, limit 40) ==="
  } >"$ctx"

  if command -v gh >/dev/null 2>&1; then
    if gh issue list --repo "$GH_REPO" --state open -L 40 --json number,title,labels,url,updatedAt >>"$ctx" 2>/dev/null; then
      G001_GH_OK=1
      local num untracked=0
      while IFS= read -r num; do
        [[ -z "${num:-}" ]] && continue
        if ! issue_linked_in_root_tasks "$num"; then
          untracked=$((untracked + 1))
          echo "UNTRACKED_IN_TASKS issue #$num" >>"$ctx"
        fi
      done < <(gh issue list --repo "$GH_REPO" --state open -L 40 --json number -q '.[].number' 2>/dev/null || true)
      G001_UNTRACKED_ISSUES=$untracked
    else
      echo "(gh issue list failed — auth/network?)" >>"$ctx"
    fi
  else
    echo "(gh not on PATH — cannot list issues)" >>"$ctx"
  fi

  {
    echo ""
    echo "=== Docker log incident heuristics (pos-front, pos-back, pos-haproxy, pos-postgres) ==="
  } >>"$ctx"

  local last_iso
  last_iso=$(last_review_iso_utc)
  local log_args=()
  if [[ -n "$last_iso" ]]; then
    log_args=(--since "$last_iso")
  else
    log_args=(--tail 800)
  fi

  if docker info >/dev/null 2>&1; then
    local c raw hits
    for c in pos-front pos-back pos-haproxy pos-postgres; do
      if docker inspect "$c" >/dev/null 2>&1; then
        echo "" >>"$ctx"
        echo "--- $c (${log_args[*]}) ---" >>"$ctx"
        raw=$(docker logs "$c" "${log_args[@]}" 2>&1 || true)
        hits=$(printf '%s\n' "$raw" | grep -iE \
          'traceback|Exception in ASGI|Internal Server|Application bundle generation failed|TS[0-9]{4}|NG[0-9]{4}|\bFATAL\b' \
          | head -n 80 || true)
        if [[ -z "$hits" ]]; then
          hits=$(printf '%s\n' "$raw" | grep -E ' [45][0-9][0-9] ' | grep -vE ':[0-9]{5} -' | head -n 80 || true)
        fi
        if [[ -n "$hits" ]]; then
          G001_LOG_SIGNALS=1
          printf '%s\n' "$hits" >>"$ctx"
        else
          echo "(no heuristic matches in sampled window)" >>"$ctx"
        fi
      else
        echo "" >>"$ctx"
        echo "--- $c (container not present) ---" >>"$ctx"
      fi
    done
  else
    echo "Docker not available or not running — log pass skipped." >>"$ctx"
  fi

  {
    echo ""
    echo "=== Preflight summary ==="
    echo "G001_GH_OK=$G001_GH_OK G001_UNTRACKED_ISSUES=$G001_UNTRACKED_ISSUES G001_LOG_SIGNALS=$G001_LOG_SIGNALS"
  } >>"$ctx"
}

# After prepare_001_preflight_context: should we invoke cursor-agent for 001?
should_run_001_cursor_agent() {
  if [[ "${AGENT_001_SKIP_PREFLIGHT:-0}" == "1" ]]; then
    return 0
  fi
  if [[ "${AGENT_LOG_REVIEWER_ALWAYS:-0}" == "1" ]]; then
    return 0
  fi
  if [[ "$G001_LOG_SIGNALS" == "1" ]]; then
    return 0
  fi
  if [[ "$G001_GH_OK" == "1" ]] && [[ "${G001_UNTRACKED_ISSUES:-0}" -gt 0 ]]; then
    return 0
  fi
  if [[ "$G001_GH_OK" == "0" ]] && [[ "${AGENT_001_RUN_WHEN_GH_UNKNOWN:-0}" == "1" ]]; then
    return 0
  fi
  return 1
}

# True when local Ollama is usable: CLI present, daemon responds, at least one model row in `ollama list`.
# Disable triage entirely with AGENT_001_OLLAMA_LOG_TRIAGE=0 (even if ollama is running).
ollama_local_triage_available() {
  [[ "${AGENT_001_OLLAMA_LOG_TRIAGE:-}" != "0" ]] || return 1
  command -v ollama >/dev/null 2>&1 || return 1
  ollama list 2>/dev/null | tail -n +2 | head -1 | grep -q '[[:graph:]]'
}

# If only Docker heuristics fired (no untracked issues), local Ollama may clear G001_LOG_SIGNALS (auto when ollama works).
maybe_ollama_downgrade_log_signals() {
  local ctx="$1"
  ollama_local_triage_available || return 0
  [[ "$G001_LOG_SIGNALS" == "1" ]] || return 0
  [[ "${G001_UNTRACKED_ISSUES:-0}" -eq 0 ]] || return 0
  local triage_script="${REPO_ROOT}/scripts/agent-ollama-log-triage.sh"
  [[ -f "$triage_script" ]] || return 0
  echo "----- 001 ollama log triage: auto (ollama up + models — ${OLLAMA_MODEL:-qwen2.5:1.5b})"
  set +e
  bash "$triage_script" "$ctx"
  local trc=$?
  set -e
  if ((trc == 1)); then
    G001_LOG_SIGNALS=0
    echo "----- 001 ollama log triage: SKIP (log heuristics downgraded by local model)"
    {
      echo ""
      echo "=== Ollama log triage (${OLLAMA_MODEL:-qwen2.5:1.5b}) ==="
      echo "SKIP — Docker incident flag cleared (local triage)."
    } >>"$ctx"
  elif ((trc == 2)); then
    echo "----- 001 ollama log triage: error or empty output — keeping Docker heuristics"
  fi
}

# Integrate latest origin/development before any step that may edit the repo.
sync_repo() {
  if [[ "${AGENT_GIT_SYNC:-1}" == "0" ]]; then
    echo "----- git sync (skip: AGENT_GIT_SYNC=0)"
    return 0
  fi
  echo "-----> git sync development $(date "+%Y-%m-%d %H:%M:%S") <----"
  if ! bash "${REPO_ROOT}/scripts/git-sync-development.sh"; then
    echo "ERROR: git sync failed (conflicts, network, or missing origin/development). Resolve and retry." >&2
    exit 1
  fi
}

# True if agents/tasks/ root has ≥1 file matching any glob (e.g. NEW-*.md WIP-*.md).
any_root_task_glob() {
  shopt -s nullglob
  local g matches
  for g in "$@"; do
    matches=("$TASKDIR"/$g)
    if (( ${#matches[@]} > 0 )); then
      shopt -u nullglob
      return 0
    fi
  done
  shopt -u nullglob
  return 1
}

has_pos_repo_uncommitted_changes() {
  ( cd "$REPO_ROOT" && { ! git diff --quiet 2>/dev/null || ! git diff --staged --quiet 2>/dev/null; } )
}

# Only invoke agent if condition is true and prompt file exists.
# Usage: run_agent "description" "condition_cmd" "prompt_relative_path" "message"
run_agent() {
  local desc="$1" cond="$2" prompt="$3" msg="$4"
  local p="${SCRIPTDIR}/${prompt}"
  if [[ ! -f "$p" ]]; then
    echo "----- $desc (skip: missing prompt $prompt — see docs/agent-loop.md)"
    return 0
  fi
  if ! have_cursor_agent; then
    echo "----- $desc (skip: cursor-agent not on PATH)"
    return 0
  fi
  if eval "$cond" 2>/dev/null; then
    echo "-----> $desc $(date "+%Y-%m-%d %H:%M:%S") <----"
    cursor-agent --yolo -p "$prompt" "$msg"
  else
    echo "----- $desc (skip: nothing to do)"
  fi
  echo "<-- end of $desc $(date "+%Y-%m-%d %H:%M:%S") -->"
  echo "--------------------------------"
  echo ""
}

step_log_reviewer() {
  echo "-----> log reviewer (001) <----"
  mkdir -p "$AGENT_LOOP_TMP"
  local ctx="${AGENT_LOOP_TMP}/001-latest-context.txt"
  prepare_001_preflight_context "$ctx"
  maybe_ollama_downgrade_log_signals "$ctx"
  echo "----- 001 preflight digest: $ctx"
  if ! have_cursor_agent; then
    echo "----- log reviewer (001) (skip: cursor-agent not on PATH)"
    return 0
  fi
  if should_run_001_cursor_agent; then
    sync_repo
    prepare_001_preflight_context "$ctx"
    maybe_ollama_downgrade_log_signals "$ctx"
    if ! should_run_001_cursor_agent; then
      echo "----- log reviewer (001) (skip after sync+preflight: gate closed — e.g. ollama downgraded logs only)"
      return 0
    fi
    local msg
    msg="Run 001: Read the preflight digest first (absolute path): $ctx
Then follow 001-log-reviewer/LOG-REVIEWER-PROMPT.md — (A) GitHub → up to 3 × FEAT-*.md (dedupe as documented). (B) Docker logs → NEW-*.md only for real standing incidents (digest is heuristic; you may run docker logs yourself). gh comment/label. Do your job."
    run_agent "log reviewer (001)" \
      "true" \
      "001-log-reviewer/LOG-REVIEWER-PROMPT.md" \
      "$msg"
  else
    echo "----- log reviewer (001) (skip: nothing for 001 — no open issues missing a task link, no log incident heuristics)"
    echo "----- Override: AGENT_LOG_REVIEWER_ALWAYS=1 or AGENT_001_SKIP_PREFLIGHT=1 (always invoke); AGENT_001_RUN_WHEN_GH_UNKNOWN=1 if gh failed but you still want a run."
  fi
}

step_feat() {
  if ! any_root_task_glob 'FEAT-*.md'; then
    echo "----- feature coding (FEAT) (skip: no FEAT-*.md — no sync, no agent)"
    return 0
  fi
  sync_repo
  echo "-----> feature coding (FEAT) <----"
  run_agent "feature coding (FEAT)" \
    "any_root_task_glob 'FEAT-*.md'" \
    "006-feature-coder/FEATURE-CODER.md" \
    "Start feature coding now. Pick up a FEAT task if any. Do your job."
}

step_coder() {
  if ! any_root_task_glob 'NEW-*.md' 'WIP-*.md'; then
    echo "----- coding (skip: no NEW-*.md or WIP-*.md — no sync, no agent)"
    return 0
  fi
  sync_repo
  echo "-----> coding (NEW / WIP) <----"
  run_agent "coding" \
    "any_root_task_glob 'NEW-*.md' 'WIP-*.md'" \
    "002-coder/CODER.md" \
    "Start coding now. Prefer a NEW task if any (rename to WIP on start); otherwise continue an existing WIP to UNTESTED. Implement in this repo (back/, front/). Do your job."
}

step_tester() {
  if ! any_root_task_glob 'UNTESTED-*.md'; then
    echo "----- testing (skip: no UNTESTED-*.md — no sync, no agent)"
    return 0
  fi
  sync_repo
  echo "-----> testing <----"
  run_agent "testing" \
    "any_root_task_glob 'UNTESTED-*.md'" \
    "003-tester/TESTER.md" \
    "Start testing now. Pick up an UNTESTED task if any. Do your job."
}

step_closing_review() {
  if ! any_root_task_glob 'CLOSED-*.md'; then
    echo "----- closing reviewer (skip: no CLOSED-*.md in tasks/ — no sync, no agent)"
    return 0
  fi
  sync_repo
  echo "-----> closing reviewer (CLOSED in tasks/) <----"
  run_agent "closing" \
    "any_root_task_glob 'CLOSED-*.md'" \
    "004-closing-reviewer/CLOSING-REVIEWER-PROMPT.md" \
    "Start closing review now. Process CLOSED-*.md in agents/tasks/; prepend summary; move to done/YYYY/MM/DD with scripts/move-agent-task-to-done.sh when done. Do your job."
}

step_committer() {
  if ! has_pos_repo_uncommitted_changes; then
    echo "----- committer (changelog + commit) (skip: no uncommitted changes — no sync, no agent)"
    return 0
  fi
  sync_repo
  if ! has_pos_repo_uncommitted_changes; then
    echo "----- committer (skip after sync: working tree clean)"
    return 0
  fi
  echo "-----> committer (changelog + commit, POS repo) <----"
  run_agent "committer (changelog + commit)" \
    "has_pos_repo_uncommitted_changes" \
    "007-committer/COMMITTER.md" \
    "Check this POS repo for uncommitted changes on branch development. Update CHANGELOG.md and front/package.json per project rules; commit. Push origin development. Merge development to master only per .cursor/rules/git-development-branch-workflow.mdc (2h batch, big prod change, or production-urgent issue / explicit user ask)."
}

run_full_cycle() {
  echo "$(date)"
  step_log_reviewer
  local i=0
  local has_feat
  while (( i < 5 )); do
    has_feat=false
    shopt -s nullglob
    for _ in "$TASKDIR"/FEAT-*.md; do has_feat=true; break; done
    shopt -u nullglob
    if ! $has_feat; then
      (( i == 0 )) && echo "----- feature coding (FEAT): queue empty, skipping up to 5 batch slots (saves git sync)"
      break
    fi
    step_feat
    ((i++)) || true
  done
  step_coder
  step_tester
  step_closing_review
  step_committer
}

usage() {
  cat >&2 <<EOF
Usage: $(basename "$0") [COMMAND]

  (no args)       Run full agent cycle every ${AGENT_LOOP_SLEEP_MINUTES:-5} minutes (loop; sleep is minute-based via conversion to seconds).

  Single run:
    log, log-reviewer, 001   Log / incident reviewer (001; runs first in full cycle)
    feat, feature   Feature coder (FEAT-*.md in agents/tasks/)
    coder           Coder (NEW-*.md or WIP-*.md)
    tester          Tester (UNTESTED-*.md)
    closing-review  Closing reviewer (CLOSED-*.md still in agents/tasks/)
    committer       Changelog + commit when POS repo has local changes

    help, -h, --help   Show this help

Environment:
  AGENT_LOOP_SLEEP_MINUTES   Sleep between full cycles when looping (default: 5).
  AGENT_GIT_SYNC             If 0, skip git fetch/pull before each step (default: 1).
  AGENT_LOOP_TMP             Directory for 001 preflight digest (default: \$TMPDIR/pos-agent-loop).
  AGENT_GH_REPO              Repo for gh issue list (default: satisfecho/pos).
  AGENT_LOG_REVIEWER_ALWAYS  If 1, always invoke 001 cursor-agent (skip preflight gate).
  AGENT_001_SKIP_PREFLIGHT   If 1, always invoke 001 (legacy); digest still written when built.
  AGENT_001_RUN_WHEN_GH_UNKNOWN  If 1, run 001 when gh failed/missing and digest otherwise empty.
  AGENT_001_OLLAMA_LOG_TRIAGE  If 0, never run local Ollama triage. Otherwise (default) triage runs when ollama list works and shows ≥1 model, only for log-only 001 signals. OLLAMA_MODEL (default qwen2.5:1.5b).

Docker / app stack: start separately from repo root with ./run.sh -dev

Git: FEAT/NEW-WIP/tester/closing/committer run scripts/git-sync-development.sh only when that step has work (queue or uncommitted changes). 001 syncs when its gate opens.

Prompt files live under agents/ (e.g. 002-coder/CODER.md). See docs/agent-loop.md.
EOF
}

if [[ -n "${1:-}" ]]; then
  case "$1" in
    help | -h | --help)
      usage
      exit 0
      ;;
    log | log-reviewer | 001) step_log_reviewer ;;
    feat | feature) step_feat ;;
    coder) step_coder ;;
    tester) step_tester ;;
    closing-review | closing-closed) step_closing_review ;;
    committer) step_committer ;;
    *)
      usage
      exit 1
      ;;
  esac
  exit 0
fi

if ! have_cursor_agent; then
  echo "cursor-agent not found on PATH. Install Cursor CLI or add to PATH." >&2
  echo "Loop aborted. Single commands will no-op until cursor-agent is available." >&2
  exit 1
fi

while true; do
  run_full_cycle
  echo "----- sleeping ${sleepminutes}m (${sleepseconds}s)"
  sleep "$sleepseconds"
done
