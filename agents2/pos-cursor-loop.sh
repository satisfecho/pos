#!/usr/bin/env bash
# POS agent loop orchestrator (mac-stats-reviewer style). Run from repo root:
#   ./agents/pos-agent-loop.sh [COMMAND]
# or:
#   cd agents && ./pos-agent-loop.sh [COMMAND]
#
# Starts Docker stack: use ./run.sh -dev at repo root (separate from this file).
# Requires: cursor-agent on PATH for steps that invoke it (001 can skip cursor when local; committer uses cursor by default — AGENT_COMMITTER_USE_CURSOR default 1; see AGENT_001_LOCAL_LOG_REVIEWER, AGENT_COMMITTER_LOCAL).
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
LAST_REVIEW_FILE="${SCRIPTDIR}/001-gh-reviewer/time-of-last-review.txt"
MKT_REVIEW_FILE="${SCRIPTDIR}/005-marketing-repos-reviewer/time-of-last-review.txt"
MKT_PREFLIGHT="${REPO_ROOT}/scripts/marketing-repos-preflight.sh"

cd "$SCRIPTDIR" || exit 1

have_cursor_agent() {
  command -v cursor-agent >/dev/null 2>&1
}

# Wall-clock limit for cursor-agent (seconds). 0 = no limit (AGENT_CURSOR_TIMEOUT=0).
# Per-step overrides: AGENT_TESTER_TIMEOUT_MINUTES (default 38), AGENT_FEAT_TIMEOUT_MINUTES,
# AGENT_CODER_TIMEOUT_MINUTES; else AGENT_CURSOR_TIMEOUT_MINUTES (default 25).
cursor_agent_timeout_seconds_for() {
  local step="${1:-default}"
  if [[ "${AGENT_CURSOR_TIMEOUT:-1}" == "0" ]]; then
    echo 0
    return 0
  fi
  local mins
  case "$step" in
    testing) mins="${AGENT_TESTER_TIMEOUT_MINUTES:-32}" ;;
    feat) mins="${AGENT_FEAT_TIMEOUT_MINUTES:-${AGENT_CURSOR_TIMEOUT_MINUTES:-25}}" ;;
    coding) mins="${AGENT_CODER_TIMEOUT_MINUTES:-${AGENT_CURSOR_TIMEOUT_MINUTES:-25}}" ;;
    handoff) mins="${AGENT_HANDOFF_TIMEOUT_MINUTES:-${AGENT_CURSOR_TIMEOUT_MINUTES:-20}}" ;;
    closing) mins="${AGENT_CLOSING_TIMEOUT_MINUTES:-${AGENT_CURSOR_TIMEOUT_MINUTES:-20}}" ;;
    committer) mins="${AGENT_COMMITTER_TIMEOUT_MINUTES:-${AGENT_CURSOR_TIMEOUT_MINUTES:-20}}" ;;
    log|marketing) mins="${AGENT_REVIEWER_TIMEOUT_MINUTES:-${AGENT_CURSOR_TIMEOUT_MINUTES:-25}}" ;;
    *) mins="${AGENT_CURSOR_TIMEOUT_MINUTES:-25}" ;;
  esac
  echo $((mins * 60))
}

# Run cursor-agent with a wall-clock cap so the loop never blocks 30+ minutes on a hung step.
invoke_cursor_agent() {
  local step="$1"
  shift
  local secs
  secs=$(cursor_agent_timeout_seconds_for "$step")
  if ((secs <= 0)); then
    cursor-agent "$@"
    return $?
  fi
  local mins=$((secs / 60))
  echo "cursor-agent wall-clock limit: ${mins}m (${secs}s, step=${step}; AGENT_CURSOR_TIMEOUT=0 disables)" >&2
  if command -v timeout >/dev/null 2>&1; then
    timeout --preserve-status --foreground "$secs" cursor-agent "$@"
    return $?
  fi
  if command -v gtimeout >/dev/null 2>&1; then
    gtimeout --preserve-status --foreground "$secs" cursor-agent "$@"
    return $?
  fi
  # macOS / minimal env: poll and SIGTERM, then SIGKILL
  cursor-agent "$@" &
  local pid=$!
  local waited=0
  while kill -0 "$pid" 2>/dev/null && ((waited < secs)); do
    sleep 1
    waited=$((waited + 1))
  done
  if kill -0 "$pid" 2>/dev/null; then
    echo "cursor-agent: no GNU timeout on PATH — sending SIGTERM after ${secs}s" >&2
    kill -TERM "$pid" 2>/dev/null || true
    sleep 3
    kill -KILL "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
    return 124
  fi
  wait "$pid"
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
# grep exits 1 when no match; with set -o pipefail that must not fail the caller.
last_review_iso_utc() {
  [[ -f "$LAST_REVIEW_FILE" ]] || return 0
  head -1 "$LAST_REVIEW_FILE" | grep -oE '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z' | head -1 || true
}

# True if gh stderr file looks like auth failure (401, bad token, not logged in).
gh_stderr_looks_like_auth_failure() {
  local f="$1"
  [[ -f "$f" ]] || return 1
  grep -qiE '401|Bad credentials|bad credentials|not authenticated|Authentication failed|HTTP 401|must be authenticated|not logged in|gh auth login|could not authenticate|invalid.*token' "$f" 2>/dev/null
}

# Write GitHub + Docker log digest for 001; set G001_* variables for gating.
# G001_GH_OK: 1 if gh produced an open-issues list (issue list or api fallback); 0 if gh missing or both failed.
# G001_GH_AUTH_FAILED: 1 if gh stderr indicated 401 / bad credentials (so the loop can warn loudly).
# G001_UNTRACKED_ISSUES: count of open issues with no #NN / issues/NN link in root tasks (0 if gh failed).
# G001_LOG_SIGNALS: 1 if heuristic incident lines found in recent container logs.
prepare_001_preflight_context() {
  local ctx="$1"
  mkdir -p "$(dirname "$ctx")"
  G001_GH_OK=0
  G001_GH_AUTH_FAILED=0
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

  local gh_list_err gh_api_err
  gh_list_err="$(dirname "$ctx")/gh-issue-list-stderr.$$"
  gh_api_err="$(dirname "$ctx")/gh-api-stderr.$$"
  rm -f "$gh_list_err" "$gh_api_err"

  if command -v gh >/dev/null 2>&1; then
    if gh issue list --repo "$GH_REPO" --state open -L 40 --json number,title,labels,url,updatedAt >>"$ctx" 2>"$gh_list_err"; then
      rm -f "$gh_list_err"
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
      {
        echo "(gh issue list failed — see stderr below — trying REST fallback)"
        echo "=== gh issue list stderr ==="
        cat "$gh_list_err" 2>/dev/null || true
      } >>"$ctx"
      if gh_stderr_looks_like_auth_failure "$gh_list_err"; then
        G001_GH_AUTH_FAILED=1
      fi
      rm -f "$gh_list_err"
      {
        echo ""
        echo "=== gh api fallback: repos/${GH_REPO}/issues?state=open&per_page=40 (no PRs) ==="
      } >>"$ctx"
      if gh api "repos/${GH_REPO}/issues?state=open&per_page=40" \
        --jq '.[] | select(.pull_request == null) | {number,title,labels:[.labels[].name],updatedAt,url}' >>"$ctx" 2>"$gh_api_err"; then
        rm -f "$gh_api_err"
        G001_GH_OK=1
        G001_GH_AUTH_FAILED=0
        local num2 untracked2=0
        while IFS= read -r num2; do
          [[ -z "${num2:-}" ]] && continue
          if ! issue_linked_in_root_tasks "$num2"; then
            untracked2=$((untracked2 + 1))
            echo "UNTRACKED_IN_TASKS issue #$num2" >>"$ctx"
          fi
        done < <(gh api "repos/${GH_REPO}/issues?state=open&per_page=40" --jq '.[] | select(.pull_request == null) | .number' 2>/dev/null || true)
        G001_UNTRACKED_ISSUES=$untracked2
      else
        {
          echo "(gh api fallback also failed — stderr:"
          cat "$gh_api_err" 2>/dev/null || true
          echo ")"
          echo "Fix: gh auth login, or GH_TOKEN with repo scope for private repos."
        } >>"$ctx"
        if gh_stderr_looks_like_auth_failure "$gh_api_err"; then
          G001_GH_AUTH_FAILED=1
        fi
        rm -f "$gh_api_err"
      fi
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
    echo "G001_GH_OK=$G001_GH_OK G001_GH_AUTH_FAILED=$G001_GH_AUTH_FAILED G001_UNTRACKED_ISSUES=$G001_UNTRACKED_ISSUES G001_LOG_SIGNALS=$G001_LOG_SIGNALS"
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
    # Default: do not spend cursor-agent on log-only noise when GitHub queue is empty.
    if [[ "${AGENT_001_LOCAL_LOG_REVIEWER:-1}" != "0" ]] && [[ "$G001_GH_OK" == "1" ]] && [[ "${G001_UNTRACKED_ISSUES:-0}" -eq 0 ]]; then
      return 1
    fi
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

# True when local LLM triage can run: llama.cpp OpenAI API up (/v1/models) + python3, or Ollama with ≥1 model.
# Disable triage entirely with AGENT_001_OLLAMA_LOG_TRIAGE=0.
# Ollama checks use OLLAMA_HOST (default http://127.0.0.1:11434) to match scripts/agent-ollama-log-triage.sh.
local_llm_triage_available() {
  [[ "${AGENT_001_OLLAMA_LOG_TRIAGE:-}" != "0" ]] || return 1
  local base="${LLAMA_CPP_BASE_URL:-http://127.0.0.1:8080/v1}"
  local oh="${OLLAMA_HOST:-http://127.0.0.1:11434}"
  base="${base%/}"
  if curl -sfS -m 3 -o /dev/null "${base}/models" 2>/dev/null && command -v python3 >/dev/null 2>&1; then
    return 0
  fi
  if command -v ollama >/dev/null 2>&1 && OLLAMA_HOST="$oh" ollama list 2>/dev/null | tail -n +2 | head -1 | grep -q '[[:graph:]]'; then
    return 0
  fi
  return 1
}

# If only Docker heuristics fired (no untracked issues), local LLM may clear G001_LOG_SIGNALS.
# Default: Ollama first, then llama.cpp (AGENT_001_LLAMA_CPP_FIRST=1 for legacy llama-first order).
maybe_local_llm_downgrade_log_signals() {
  local ctx="$1"
  local ollama_model="${OLLAMA_MODEL:-Gemma4:latest}"
  local llama_model="${LLAMA_CPP_MODEL:-Bonsai-8B.gguf}"
  local llama_base="${LLAMA_CPP_BASE_URL:-http://127.0.0.1:8080/v1}"
  local triage_label
  if [[ "${AGENT_001_LLAMA_CPP_FIRST:-}" == "1" ]]; then
    triage_label="llama.cpp @ ${llama_base} (${llama_model}) → Ollama (${ollama_model})"
  else
    triage_label="Ollama (${ollama_model}) → llama.cpp @ ${llama_base} (${llama_model})"
  fi
  local_llm_triage_available || return 0
  [[ "$G001_LOG_SIGNALS" == "1" ]] || return 0
  [[ "${G001_UNTRACKED_ISSUES:-0}" -eq 0 ]] || return 0
  local triage_script="${REPO_ROOT}/scripts/agent-ollama-log-triage.sh"
  [[ -f "$triage_script" ]] || return 0
  echo "----- 001 local LLM log triage: auto (${triage_label})"
  set +e
  OLLAMA_MODEL="$ollama_model" bash "$triage_script" "$ctx"
  local trc=$?
  set -e
  if ((trc == 1)); then
    G001_LOG_SIGNALS=0
    echo "----- 001 local LLM log triage: SKIP (log heuristics downgraded by local model)"
    {
      echo ""
      echo "=== Local LLM log triage (${triage_label}) ==="
      echo "SKIP — Docker incident flag cleared (local triage)."
    } >>"$ctx"
  elif ((trc == 2)); then
    echo "----- 001 local LLM log triage: error or empty output — keeping Docker heuristics"
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
    return 1
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

# Paths changed vs HEAD plus untracked (excluding ignored), one per line.
committer_changed_paths() {
  ( cd "$REPO_ROOT" && {
    git diff --name-only HEAD 2>/dev/null || true
    git ls-files --others --exclude-standard 2>/dev/null || true
  } | sort -u )
}

# True when every changed path is allowed for AGENT_COMMITTER_LOCAL stamp-only auto-commit.
committer_paths_all_local_stamp_allowlist() {
  local f had=0
  while IFS= read -r f; do
    [[ -z "$f" ]] && continue
    had=1
    case "$f" in
      agents2/001-gh-reviewer/time-of-last-review.txt) ;;
      agents2/005-marketing-repos-reviewer/time-of-last-review.txt) ;;
      agents2/005-marketing-repos-reviewer/last-scan.json) ;;
      *) return 1 ;;
    esac
  done < <(committer_changed_paths)
  ((had == 1))
}

# Commit + push only 001 reviewer stamp when AGENT_COMMITTER_LOCAL is on and tree is stamp-only.
# Return 0: committed and pushed (or already clean after no-op — should not happen).
# Return 1: use cursor-agent / manual (mixed paths, wrong branch, LOCAL off, or commit failed).
committer_try_local_stamp_only() {
  [[ "${AGENT_COMMITTER_LOCAL:-1}" == "0" ]] && return 1
  local br
  br=$(cd "$REPO_ROOT" && git rev-parse --abbrev-ref HEAD 2>/dev/null) || return 1
  if [[ "$br" != "development" ]]; then
    echo "----- committer (local skip: repo not on development — use cursor or checkout)" >&2
    return 1
  fi
  if ! committer_paths_all_local_stamp_allowlist; then
    return 1
  fi
  (
    cd "$REPO_ROOT" || exit 1
    git add -- agents2/001-gh-reviewer/time-of-last-review.txt
    git add -- agents2/005-marketing-repos-reviewer/time-of-last-review.txt agents2/005-marketing-repos-reviewer/last-scan.json 2>/dev/null || true
    if git diff --staged --quiet; then
      exit 1
    fi
    git commit -m "chore(agents2): update 001 reviewer time-of-last-review stamp"
    set +e
    git pull --rebase --autostash origin development
    local prc=$?
    set -e
    if ((prc != 0)); then
      echo "----- committer (local: git pull --rebase failed — resolve and retry)" >&2
      exit 1
    fi
    set +e
    git push origin development
    local psh=$?
    set -e
    if ((psh != 0)); then
      echo "----- committer (local: git push failed — check network or permissions)" >&2
      exit 1
    fi
    exit 0
  )
}

# After committer created a new commit, comment on linked GitHub issues (non-fatal).
committer_notify_github_issues_if_new_commit() {
  local before="${1:-}"
  local after
  [[ -n "$before" ]] || return 0
  after=$(cd "$REPO_ROOT" && git rev-parse HEAD 2>/dev/null) || return 0
  [[ "$before" != "$after" ]] || return 0
  if [[ -x "$REPO_ROOT/scripts/link-commit-to-github-issues.sh" ]]; then
    "$REPO_ROOT/scripts/link-commit-to-github-issues.sh" "$after" || true
  fi
}

# Only invoke agent if condition is true and prompt file exists.
# Usage: run_agent "description" "condition_cmd" "prompt_relative_path" "message" [step_key]
# step_key selects per-step timeout (testing, feat, coding, …); default "default".
run_agent() {
  local desc="$1" cond="$2" prompt="$3" msg="$4"
  local step="${5:-default}"
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
    echo "starting cursor-agent with prompt: $prompt"
    echo "msg: $msg"
    echo "---"
    set +e
    invoke_cursor_agent "$step" --yolo -p "$prompt" "$msg"
    local _ca_rc=$?
    set -e
    if ((_ca_rc == 124)); then
      echo "----- $desc: cursor-agent TIMED OUT (wall-clock limit; continuing loop — non-fatal)" >&2
      echo "----- $desc: if a task stayed TESTING-/WIP-, the next cycle will retry or finish it" >&2
    elif ((_ca_rc != 0)); then
      echo "----- $desc: cursor-agent exited ${_ca_rc} (continuing loop — non-fatal)" >&2
    fi
  else
    echo "----- $desc (skip: nothing to do)"
  fi
  echo "<-- end of $desc $(date "+%Y-%m-%d %H:%M:%S") -->"
  echo "--------------------------------"
  echo ""
}

# One-line stamp when 001 skips cursor-agent (local log reviewer path).
append_001_local_no_cursor_stamp() {
  local ctx="$1"
  local iso line
  iso=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  line="${iso} UTC | 001 local (no cursor-agent) | FEAT: 0 | NEW: 0 | G001_GH_OK=${G001_GH_OK} G001_UNTRACKED_ISSUES=${G001_UNTRACKED_ISSUES} G001_LOG_SIGNALS=${G001_LOG_SIGNALS} | digest: ${ctx}"
  mkdir -p "$(dirname "$LAST_REVIEW_FILE")"
  printf '%s\n\n' "$line" >>"$LAST_REVIEW_FILE"
  {
    echo ""
    echo "=== 001 cursor-agent skipped (local log reviewer) ==="
    echo "$line"
    echo "cursor-agent was not invoked: GitHub preflight succeeded, zero untracked issues, and AGENT_001_LOCAL_LOG_REVIEWER is not 0 (default 1). Set AGENT_001_LOCAL_LOG_REVIEWER=0 to allow cursor-agent when Docker log heuristics fire alone."
  } >>"$ctx"
}

warn_001_github_auth_if_needed() {
  local d="${AGENT_LOOP_TMP:-${TMPDIR:-/tmp}/pos-agent-loop}"
  if [[ "${G001_GH_AUTH_FAILED:-0}" == "1" ]]; then
    echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!" >&2
    echo "!!! 001 / GitHub: NOT AUTHENTICATED (401 / bad credentials or expired token). !!!" >&2
    echo "!!! Open issues are NOT visible to the preflight — no FEAT queue from GitHub. !!!" >&2
    echo "!!! Fix: gh auth login   or   export GH_TOKEN=<token with repo scope>          !!!" >&2
    echo "!!! Digest (gh stderr is in file): $d/001-latest-context.txt                    !!!" >&2
    echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!" >&2
  fi
}

step_log_reviewer() {
  echo "-----> log reviewer (001) <----"
  mkdir -p "$AGENT_LOOP_TMP"
  local ctx="${AGENT_LOOP_TMP}/001-latest-context.txt"
  prepare_001_preflight_context "$ctx"
  maybe_local_llm_downgrade_log_signals "$ctx"
  echo "----- 001 preflight digest: $ctx"
  warn_001_github_auth_if_needed
  if should_run_001_cursor_agent; then
    if ! have_cursor_agent; then
      echo "----- log reviewer (001) (skip: cursor-agent not on PATH — this run wanted cursor-agent)" >&2
      return 0
    fi
    if ! sync_repo; then
      echo "----- log reviewer (001) (skip this run: git sync failed — loop continues)" >&2
      return 0
    fi
    prepare_001_preflight_context "$ctx"
    maybe_local_llm_downgrade_log_signals "$ctx"
    warn_001_github_auth_if_needed
    if ! should_run_001_cursor_agent; then
      echo "----- log reviewer (001) (skip after sync+preflight: gate closed — e.g. local LLM downgraded logs only)"
      return 0
    fi
    local msg
    msg="Run 001: Read the preflight digest first (absolute path): $ctx
Then follow 001-gh-reviewer.md — (A) GitHub → up to 3 × FEAT-*.md (dedupe as documented). (B) Docker logs → NEW-*.md only for real standing incidents (digest is heuristic; you may run docker logs yourself). gh comment/label. Task conventions: TASKS-README.md. Do your job."
    run_agent "log reviewer (001)" \
      "true" \
      "001-gh-reviewer.md" \
      "$msg" \
      "log"
  elif [[ "$G001_LOG_SIGNALS" == "1" ]] && [[ "$G001_GH_OK" == "1" ]] && [[ "${G001_UNTRACKED_ISSUES:-0}" -eq 0 ]] && [[ "${AGENT_001_LOCAL_LOG_REVIEWER:-1}" != "0" ]]; then
    echo "----- log reviewer (001) (skip cursor-agent: local log review — Docker heuristics only, GitHub ok, zero untracked issues)"
    append_001_local_no_cursor_stamp "$ctx"
  else
    echo "----- log reviewer (001) (skip: nothing for 001 — no open issues missing a task link, no log incident heuristics)"
    echo "----- Override: AGENT_LOG_REVIEWER_ALWAYS=1 or AGENT_001_SKIP_PREFLIGHT=1 (always invoke); AGENT_001_RUN_WHEN_GH_UNKNOWN=1 if gh failed but you still want a run; AGENT_001_LOCAL_LOG_REVIEWER=0 to invoke cursor-agent when only Docker heuristics fire."
  fi
}

# G005_* set by scripts/marketing-repos-preflight.sh (sourced via eval of Summary lines).
prepare_005_preflight_context() {
  local ctx="$1"
  G005_GH_OK=0
  G005_GH_AUTH_FAILED=0
  G005_NEW_REPOS=0
  G005_CHANGED_REPOS=0
  G005_UNTRACKED_ISSUES=0
  G005_DEPLOY_CANDIDATES=0
  mkdir -p "$(dirname "$ctx")"
  if [[ ! -x "$MKT_PREFLIGHT" ]]; then
    echo "G005 preflight script missing: $MKT_PREFLIGHT" >"$ctx"
    return 0
  fi
  MARKETING_PREFLIGHT_READONLY="${2:-0}" POS_REPO_ROOT="$REPO_ROOT" bash "$MKT_PREFLIGHT" "$ctx" || true
  local line
  while IFS= read -r line; do
    case "$line" in
      G005_GH_OK=*) eval "$line" 2>/dev/null || true ;;
      G005_GH_AUTH_FAILED=*) eval "$line" 2>/dev/null || true ;;
      G005_NEW_REPOS=*) eval "$line" 2>/dev/null || true ;;
      G005_CHANGED_REPOS=*) eval "$line" 2>/dev/null || true ;;
      G005_UNTRACKED_ISSUES=*) eval "$line" 2>/dev/null || true ;;
      G005_DEPLOY_CANDIDATES=*) eval "$line" 2>/dev/null || true ;;
    esac
  done < <(grep -E '^G005_' "$ctx" 2>/dev/null || true)
}

should_run_005_cursor_agent() {
  [[ "${AGENT_MARKETING_REVIEWER_ALWAYS:-0}" == "1" ]] && return 0
  [[ "${AGENT_005_SKIP_PREFLIGHT:-0}" == "1" ]] && return 0
  [[ "${G005_GH_OK:-0}" != "1" ]] && return 1
  (( G005_NEW_REPOS + G005_CHANGED_REPOS + G005_UNTRACKED_ISSUES + G005_DEPLOY_CANDIDATES > 0 ))
}

step_marketing_repos() {
  echo "-----> marketing repos reviewer (005) <----"
  mkdir -p "$AGENT_LOOP_TMP"
  local ctx="${AGENT_LOOP_TMP}/005-latest-context.txt"
  prepare_005_preflight_context "$ctx" 1
  echo "----- 005 preflight digest: $ctx"
  if [[ "${G005_GH_AUTH_FAILED:-0}" == "1" ]]; then
    echo "!!! 005 / GitHub: auth failed — marketing repo scan incomplete. Fix gh auth login !!!" >&2
  fi
  if should_run_005_cursor_agent; then
    if ! have_cursor_agent; then
      echo "----- marketing repos (005) (skip: cursor-agent not on PATH)" >&2
      MARKETING_PREFLIGHT_READONLY=0 POS_REPO_ROOT="$REPO_ROOT" bash "$MKT_PREFLIGHT" "$ctx" >/dev/null 2>&1 || true
      return 0
    fi
    if ! sync_repo; then
      echo "----- marketing repos (005) (skip: git sync failed)" >&2
      return 0
    fi
    local msg
    msg="Run 005: Read the preflight digest first (absolute path): $ctx
Then follow 005-marketing-repos-reviewer.md — register new NNN_slug repos in config/marketing-sites.json, trigger deploy when bundles changed, create FEAT-MKT-* tasks for untracked issues in marketing repos (max 3). Task conventions: TASKS-README.md. Do your job."
    run_agent "marketing repos reviewer (005)" \
      "true" \
      "005-marketing-repos-reviewer.md" \
      "$msg" \
      "marketing"
    MARKETING_PREFLIGHT_READONLY=0 POS_REPO_ROOT="$REPO_ROOT" bash "$MKT_PREFLIGHT" "$ctx" >/dev/null 2>&1 || true
  else
    echo "----- marketing repos (005) (skip: no new/changed repos, deploy candidates, or untracked marketing issues)"
    echo "----- Override: AGENT_MARKETING_REVIEWER_ALWAYS=1 or AGENT_005_SKIP_PREFLIGHT=1"
    MARKETING_PREFLIGHT_READONLY=0 POS_REPO_ROOT="$REPO_ROOT" bash "$MKT_PREFLIGHT" "$ctx" >/dev/null 2>&1 || true
  fi
}

step_feat() {
  if ! any_root_task_glob 'FEAT-*.md'; then
    echo "----- feature coding (FEAT) (skip: no FEAT-*.md — no sync, no agent)"
    return 0
  fi
  if ! sync_repo; then
    echo "----- feature coding (FEAT) (skip: git sync failed)" >&2
    return 0
  fi
  echo "-----> feature coding (FEAT) <----"
  run_agent "feature coding (FEAT)" \
    "any_root_task_glob 'FEAT-*.md'" \
    "010-feature-coder.md" \
    "Start feature coding now. Pick up a FEAT task if any. Do your job." \
    "feat"
}

step_feature_coder_handoff() {
  if ! any_root_task_glob 'WIP-*.md'; then
    echo "----- feature coder handoff (012) (skip: no WIP-*.md — no sync, no agent)"
    return 0
  fi
  if ! sync_repo; then
    echo "----- feature coder handoff (012) (skip: git sync failed)" >&2
    return 0
  fi
  echo "-----> feature coder handoff (012: WIP → UNTESTED check) <----"
  run_agent "feature coder handoff (012)" \
    "any_root_task_glob 'WIP-*.md'" \
    "012-feature-coder-handoff.md" \
    "Handoff pass: review WIP-*.md in agents2/tasks/; if implementation is complete per TASKS-README.md, rename to UNTESTED-*.md and apply gh labels as in the prompt. Do your job." \
    "handoff"
}

step_coder() {
  if ! any_root_task_glob 'NEW-*.md' 'WIP-*.md'; then
    echo "----- coding (skip: no NEW-*.md or WIP-*.md — no sync, no agent)"
    return 0
  fi
  if ! sync_repo; then
    echo "----- coding (skip: git sync failed)" >&2
    return 0
  fi
  echo "-----> coding (NEW / WIP) <----"
  run_agent "coding" \
    "any_root_task_glob 'NEW-*.md' 'WIP-*.md'" \
    "002-coder/CODER.md" \
    "Start coding now. Prefer a NEW task if any (rename to WIP on start); otherwise continue an existing WIP to UNTESTED. Implement in this repo (back/, front/). Do your job." \
    "coding"
}

step_tester() {
  if ! any_root_task_glob 'UNTESTED-*.md' 'TESTING-*.md'; then
    echo "----- testing (skip: no UNTESTED-*.md or TESTING-*.md — no sync, no agent)"
    return 0
  fi
  if ! sync_repo; then
    echo "----- testing (skip: git sync failed)" >&2
    return 0
  fi
  echo "-----> testing <----"
  run_agent "testing" \
    "any_root_task_glob 'UNTESTED-*.md' 'TESTING-*.md'" \
    "020-test.md" \
    "Start testing now. Prefer an UNTESTED task (rename to TESTING on start); if only TESTING-*.md remains, finish it — append Test report, then CLOSED (pass) or WIP (fail). Do your job." \
    "testing"
}

step_closing_review() {
  if ! any_root_task_glob 'CLOSED-*.md'; then
    echo "----- closing reviewer (skip: no CLOSED-*.md in tasks/ — no sync, no agent)"
    return 0
  fi
  if ! sync_repo; then
    echo "----- closing reviewer (skip: git sync failed)" >&2
    return 0
  fi
  echo "-----> closing reviewer (CLOSED in tasks/) <----"
  run_agent "closing" \
    "any_root_task_glob 'CLOSED-*.md'" \
    "030-closing-reviewer.md" \
    "Start closing review now. Process CLOSED-*.md in agents/tasks/; prepend summary; move to done/YYYY/MM/DD with scripts/move-agent-task-to-done.sh when done. Do your job." \
    "closing"
}

step_committer() {
  if ! has_pos_repo_uncommitted_changes; then
    echo "----- committer (changelog + commit) (skip: no uncommitted changes — no sync, no agent)"
    return 0
  fi
  if ! sync_repo; then
    echo "----- committer (skip: git sync failed)" >&2
    return 0
  fi
  if ! has_pos_repo_uncommitted_changes; then
    echo "----- committer (skip after sync: working tree clean)"
    return 0
  fi
  echo "-----> committer (changelog + commit, POS repo) <----"

  local head_before=""
  head_before=$(cd "$REPO_ROOT" && git rev-parse HEAD 2>/dev/null) || head_before=""

  if [[ "${AGENT_COMMITTER_LOCAL:-1}" != "0" ]] && committer_try_local_stamp_only; then
    echo "----- committer (local: committed and pushed stamp-only changes; no cursor-agent)"
    committer_notify_github_issues_if_new_commit "$head_before"
    return 0
  fi

  if [[ "${AGENT_COMMITTER_USE_CURSOR:-1}" != "1" ]] && [[ "${AGENT_COMMITTER_LOCAL:-1}" != "0" ]]; then
    echo "----- committer (skip cursor-agent: AGENT_COMMITTER_USE_CURSOR=0 — non-stamp changes need manual commit or set AGENT_COMMITTER_USE_CURSOR=1)"
    ( cd "$REPO_ROOT" && git status -sb ) || true
    return 0
  fi

  if ! have_cursor_agent; then
    echo "----- committer (skip: cursor-agent not on PATH — install cursor-agent or commit manually; then run scripts/link-commit-to-github-issues.sh)"
    return 0
  fi
  run_agent "committer (changelog + commit)" \
    "has_pos_repo_uncommitted_changes" \
    "040-committer.md" \
    "Run the 040-committer role on branch development. Review the diff: commit only when implementation looks complete and tests in task files are not failing. Write a clear, human-readable CHANGELOG.md [Unreleased] entry; bump front/package.json when warranted. Stage and commit all intended project files (not only changelog). Commit message: concise subject plus Refs #N for each related GitHub issue from agents2/tasks/*.md. Push origin development. After push, run ./scripts/link-commit-to-github-issues.sh if you did not already. Do not merge to master unless git-development-branch-workflow allows it." \
    "committer"
  committer_notify_github_issues_if_new_commit "$head_before"
}

run_full_cycle() {
  echo "$(date)"
  step_log_reviewer
  step_marketing_repos
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
  step_feature_coder_handoff
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
    marketing, mkt, 005      Marketing repos reviewer (NNN_slug org repos → deploy / FEAT-MKT)
    feat, feature   Feature coder (FEAT-*.md in agents/tasks/)
    coder           Coder (NEW-*.md or WIP-*.md)
    handoff, 012    Feature-coder handoff (WIP-*.md → verify complete → UNTESTED-*.md)
    tester          Tester (UNTESTED-*.md or in-progress TESTING-*.md)
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
  AGENT_COMMITTER_LOCAL        If not 0 (default 1), committer tries a local git commit+push for allowlisted machine paths only (currently agents2/001-gh-reviewer/time-of-last-review.txt). No cursor-agent for that case.
  AGENT_COMMITTER_USE_CURSOR   If 1 (default), run 040-committer via cursor-agent when there are non-stamp changes. Set to 0 to disable cursor committer (manual commits only).
  AGENT_001_LOCAL_LOG_REVIEWER  If not 0 (default 1), never invoke cursor-agent for 001 when only Docker log heuristics fired and GitHub preflight succeeded with zero untracked issues (fully local digest + optional Ollama triage). Set to 0 to allow cursor-agent for that case (e.g. auto NEW-* from logs).
  AGENT_001_OLLAMA_LOG_TRIAGE  If 0, never run local LLM triage. Otherwise (default) triage runs when llama.cpp OpenAI API responds (GET \$LLAMA_CPP_BASE_URL/models, default http://127.0.0.1:8080/v1) and python3 exists, or when ollama list shows ≥1 model at OLLAMA_HOST (default http://127.0.0.1:11434) — only for log-only 001 signals. LLAMA_CPP_MODEL (default Bonsai-8B.gguf); OLLAMA_MODEL (default Gemma4:latest). Default triage order is Ollama first, then llama.cpp; AGENT_001_LLAMA_CPP_FIRST=1 restores llama-first. AGENT_001_SKIP_LLAMA_CPP=1 forces Ollama only.   AGENT_001_LOG_TRIAGE_DEBUG=1 prints triage script stderr (llama.cpp / ollama errors).
  AGENT_MARKETING_REVIEWER_ALWAYS  If 1, always invoke 005 cursor-agent.
  AGENT_005_SKIP_PREFLIGHT         If 1, always invoke 005 (legacy always-run).
  AGENT_CURSOR_TIMEOUT             If 0, no wall-clock limit on cursor-agent (default: on).
  AGENT_CURSOR_TIMEOUT_MINUTES     Default max minutes per step (default: 25).
  AGENT_TESTER_TIMEOUT_MINUTES     Tester step limit (default: 32; deploy poll + prod checks).
  AGENT_FEAT_TIMEOUT_MINUTES       Feature coder limit (default: same as AGENT_CURSOR_TIMEOUT_MINUTES).
  AGENT_CODER_TIMEOUT_MINUTES      Main coder limit (default: same as AGENT_CURSOR_TIMEOUT_MINUTES).
  AGENT_REVIEWER_TIMEOUT_MINUTES   001 / 005 limit (default: same as AGENT_CURSOR_TIMEOUT_MINUTES).
  On timeout the loop continues (exit 124); TESTING-/WIP- tasks are retried on the next cycle.

Docker / app stack: start separately from repo root with ./run.sh -dev

Git: FEAT/NEW-WIP/tester/closing/committer run scripts/git-sync-development.sh only when that step has work (queue or uncommitted changes). 001 syncs when its gate opens.

Prompt files in this directory (agents2/): 001-gh-reviewer.md, 005-marketing-repos-reviewer.md, 010-feature-coder.md, 012-feature-coder-handoff.md (runs after coder when WIP-*.md exists), 020-test.md, 030-closing-reviewer.md, 040-committer.md; task naming: TASKS-README.md. Main coder (NEW/WIP): 002-coder/CODER.md if present. See docs/agent-loop.md.
EOF
}

if [[ -n "${1:-}" ]]; then
  case "$1" in
    help | -h | --help)
      usage
      exit 0
      ;;
    log | log-reviewer | 001) step_log_reviewer ;;
    marketing | mkt | 005) step_marketing_repos ;;
    feat | feature) step_feat ;;
    coder) step_coder ;;
    handoff | 012 | feature-handoff) step_feature_coder_handoff ;;
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

# Local wall-clock when the current sleep ends (GNU date first, then BSD/macOS).
next_cycle_eta_local() {
  local end_epoch=$(( $(date +%s) + sleepseconds ))
  local fmt='+%Y-%m-%d %H:%M:%S %z'
  date -d "@$end_epoch" "$fmt" 2>/dev/null || date -r "$end_epoch" "$fmt" 2>/dev/null || echo "epoch ${end_epoch}"
}

while true; do
  run_full_cycle
  echo "----- sleeping ${sleepminutes}m (${sleepseconds}s); next cycle ~ $(next_cycle_eta_local)"
  sleep "$sleepseconds"
done
