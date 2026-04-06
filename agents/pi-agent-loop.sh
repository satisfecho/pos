#!/usr/bin/env bash
# pi-agent-loop orchestrator (optimized with Ollama triage).
# Uses "pi" instead of "cursor-agent".
#
# Run from repo root:
#   ./agents/pi-agent-loop.sh [COMMAND]

set -euo pipefail

SCRIPTDIR="$(cd "$(dirname "$0")" && pwd)"
echo "SCRIPTDIR: $SCRIPTDIR"
TASKDIR="${SCRIPTDIR}/tasks"
REPO_ROOT="$(cd "${SCRIPTDIR}/.." && pwd)"
sleepminutes="${AGENT_LOOP_SLEEP_MINUTES:-5}"
sleepseconds=$((sleepminutes * 60))
_tdir="${TMPDIR:-/tmp}"
_tdir="${_tdir%/}"
AGENT_LOOP_TMP="${AGENT_LOOP_TMP:-${_tdir}/pi-agent-loop}"
unset _tdir
GH_REPO="${AGENT_GH_REPO:-satisfecho/pos}"
LAST_REVIEW_FILE="${SCRIPTDIR}/001-log-reviewer/time-of-last-review.txt"
OLLAMA_URL="http://localhost:11434/api/generate"
TRIAGE_MODEL="qwen2.5:1.5b"

cd "$REPO_ROOT" || exit 1

have_pi() {
  command -v pi >/dev/null 2>&1
}

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

last_review_iso_utc() {
  [[ -f "$LAST_REVIEW_FILE" ]] || return 0
  head -1 "$LAST_REVIEW_FILE" | grep -oE '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z' | head -1 || true
}

gh_stderr_looks_like_auth_failure() {
  local f="$1"
  [[ -f "$f" ]] || return 1
  grep -qiE '401|Bad credentials|bad credentials|not authenticated|Authentication failed|HTTP 401|must be authenticated|not logged in|gh auth login|could not authenticate|invalid.*token' "$f" 2>/dev/null
}

# NEW: Lightweight triage using Ollama
triage_logs_with_ollama() {
  local ctx="$1"
  # Extract the Docker log section from the context
  local logs_content
  logs_content=$(sed -n '/=== Docker log incident heuristics/,/=== Preflight summary ===/p' "$ctx" | sed '1d;$d')

  if [[ -z "$(echo "$logs_content" | tr -d '[:space:]')" ]]; then
    return 1 # Nothing to triage
  fi

  echo "-----> 001 Triage: Asking $TRIAGE_MODEL if logs contain actionable errors..."

  local prompt="Analyze these server logs. Is there a new, actionable error (Exception, Traceback, FATAL, or 500 error) that requires a developer to fix? Answer ONLY 'YES' or 'NO'.
Logs:
$logs_content"

  local response
  response=$(curl -s -X POST "$OLLAMA_URL" -d "$(printf '{"model":"%s","prompt":"%s","stream":false}' "$TRIAGE_MODEL" "$prompt")" | jq -r '.response' | tr -d '[:space:]')

  if [[ "$response" == *"YES"* ]]; then
    echo "Triage Result: YES (Actionable errors found)"
    return 0
  else
    echo "Triage Result: NO (No actionable errors found)"
    return 1
  fi
}

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
    echo "pi-agent-loop 001 preflight — $utc (UTC)"
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
      local num untracked=0 listed=0
      while IFS= read -r num; do
        [[ -z "${num:-}" ]] && continue
        listed=$((listed + 1))
        if ! issue_linked_in_root_tasks "$num"; then
          untracked=$((untracked + 1))
          echo "UNTRACKED_IN_TASKS issue #$num" >>"$ctx"
        fi
      done < <(gh issue list --repo "$GH_REPO" --state open -L 40 --json number -q '.[].number' 2>/dev/null || true)
      G001_UNTRACKED_ISSUES=$untracked
      {
        echo ""
        echo "gh issue list count: $listed (open issues in this fetch, max 40)"
      } >>"$ctx"
      echo "gh issue list count: $listed (open issues in this fetch, max 40)"
      echo "Found $untracked untracked GitHub issues."
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
        local num2 untracked2=0 listed2=0
        while IFS= read -r num2; do
          [[ -z "${num2:-}" ]] && continue
          listed2=$((listed2 + 1))
          if ! issue_linked_in_root_tasks "$num2"; then
            untracked2=$((untracked2 + 1))
            echo "UNTRACKED_IN_TASKS issue #$num2" >>"$ctx"
          fi
        done < <(gh api "repos/${GH_REPO}/issues?state=open&per_page=40" --jq '.[] | select(.pull_request == null) | .number' 2>/dev/null || true)
        G001_UNTRACKED_ISSUES=$untracked2
        {
          echo ""
          echo "gh issue list count: $listed2 (open issues in this fetch, max 40; via gh api fallback)"
        } >>"$ctx"
        echo "gh issue list count: $listed2 (open issues in this fetch, max 40; via gh api fallback)"
        echo "Found $untracked2 untracked GitHub issues."
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
    {
      echo "(gh not on PATH — cannot list issues)"
      echo "gh issue list count: N/A"
    } >>"$ctx"
    echo "gh issue list count: N/A (gh not on PATH)"
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

should_run_001_pi() {
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

run_agent() {
  local desc="$1" cond="$2" prompt="$3" msg="$4"
  local p="${SCRIPTDIR}/${prompt}"
  if [[ ! -f "$p" ]]; then
    echo "----- $desc (skip: missing prompt $prompt)"
    return 0
  fi
  if ! have_pi; then
    echo "----- $desc (skip: pi not on PATH)"
    return 0
  fi
  if eval "$cond" 2>/dev/null; then
    echo "-----> $desc $(date "+%Y-%m-%d %H:%M:%S") <----"
    echo "starting pi with prompt: $prompt"
    echo "msg: $msg"
    echo "---"
    set +e
    pi --tools read,bash,edit,write,grep,find,ls -p "$prompt" "$msg"
    local _pi_rc=$?
    set -e
    if ((_pi_rc != 0)); then
      echo "----- $desc: pi exited ${_pi_rc} (continuing loop — non-fatal)" >&2
    fi
  else
    echo "----- $desc (skip: nothing to do)"
  fi
  echo "<-- end of $desc $(date "+%Y-%m-%d %H:%M:%S") -->"
  echo "--------------------------------"
  echo ""
}

warn_001_github_auth_if_needed() {
  local d="${AGENT_LOOP_TMP:-${TMPDIR:-/tmp}/pi-agent-loop}"
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
  echo "----- 001 preflight digest: $ctx"
  warn_001_github_auth_if_needed

  if ! have_pi; then
    echo "----- log reviewer (001) (skip: pi not on PATH)"
    return 0
  fi

  # SMART TRIAE STEP
  if [[ "$G001_LOG_SIGNALS" == "1" ]]; then
    if ! triage_logs_with_ollama "$ctx"; then
       if [[ "$G001_UNTRACKED_ISSUES" -eq 0 ]]; then
          echo "----- log reviewer (001) (skip: Ollama triage says logs are fine and no GitHub issues pending)"
          return 0
       fi
       echo "----- log reviewer (001) (Ollama triage says logs are fine, but GitHub issues pending. Continuing...)"
    fi
  fi

  if should_run_001_pi; then
    if ! sync_repo; then
      echo "----- log reviewer (001) (skip this run: git sync failed — loop continues)" >&2
      return 0
    fi
    prepare_001_preflight_context "$ctx"
    warn_001_github_auth_if_needed
    if ! should_run_001_pi; then
      echo "----- log reviewer (001) (skip after sync+preflight: gate closed)"
      return 0
    fi
    local msg
    if (( G001_UNTRACKED_ISSUES > 0 )); then
      msg="URGENT: You have $G001_UNTRACKED_ISSUES untracked GitHub issues in the preflight digest.
Your FIRST priority is to convert these untracked issues into FEAT-*.md tasks in "tasks/" folder.
Only after addressing the GitHub queue should you proceed to (B) Docker logs -> NEW-*.md.
Read the preflight digest first: $ctx
Follow 001-log-reviewer/LOG-REVIEWER-PROMPT.md. Do your job."
    else
      msg="Run 001: Read the preflight digest first (absolute path): $ctx
Then follow 001-log-reviewer/LOG-REVIEWER-PROMPT.md — (A) GitHub (none pending) → up to 3 × FEAT-*.md. (B) Docker logs → NEW-*.md only for real standing incidents. gh comment/label. Do your job."
    fi
    run_agent "log reviewer (001)" \
      "true" \
      "001-log-reviewer/LOG-REVIEWER-PROMPT.md" \
      "$msg"
  else
    echo "----- log reviewer (001) (skip: nothing for 001)"
  fi
}

step_feat() {
  local feat_files
  feat_files=($(shopt -s nullglob; ls "${TASKDIR}"/FEAT-*.md 2>/dev/null))

  if [[ ${#feat_files[@]} -eq 0 ]]; then
    echo "----- feature coding (FEAT) (skip: no FEAT-*.md)"
    return 0
  fi

  local target_task="${feat_files[0]}"
  local task_name
  task_name=$(basename "$target_task")

  if ! sync_repo; then
    echo "----- feature coding (FEAT) (skip: git sync failed)" >&2
    return 0
  fi

  echo "-----> feature coding (FEAT) <----"
  echo "Target task: $task_name"
  run_agent "feature coding (FEAT)" \
    "true" \
    "006-feature-coder/FEATURE-CODER.md" \
    "Start feature coding now on the specific task: ${target_task#$TASKDIR/} ($task_name). Read it carefully and do your job."
}

step_coder() {
  if ! any_root_task_glob 'NEW-*.md' 'WIP-*.md'; then
    echo "----- coding (skip: no NEW-*.md or WIP-*.md)"
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
    "Start coding now. Prefer a NEW task if any (rename to WIP on start); otherwise continue an existing WIP to UNTESTED. Implement in this repo (back/, front/). Do your job."
}

step_tester() {
  if ! any_root_task_glob 'UNTESTED-*.md' 'TESTING-*.md'; then
    echo "----- testing (skip: no UNTESTED-*.md or TESTING-*.md)"
    return 0
  fi
  if ! sync_repo; then
    echo "----- testing (skip: git sync failed)" >&2
    return 0
  fi
  echo "-----> testing <----"
  run_agent "testing" \
    "any_root_task_glob 'UNTESTED-*.md' 'TESTING-*.md'" \
    "003-tester/TESTER.md" \
    "Start testing now. Prefer an UNTESTED task (rename to TESTING on start); if only TESTING-*.md remains, finish it — append Test report, then CLOSED (pass) or WIP (fail). Do your job."
}

step_closing_review() {
  if ! any_root_task_glob 'CLOSED-*.md'; then
    echo "----- closing reviewer (skip: no CLOSED-*.md in tasks/)"
    return 0
  fi
  if ! sync_repo; then
    echo "----- closing reviewer (skip: git sync failed)" >&2
    return 0
  fi
  echo "-----> closing reviewer (CLOSED in tasks/) <----"
  run_agent "closing" \
    "any_root_task_glob 'CLOSED-*.md'" \
    "004-closing-reviewer/CLOSING-REVIEWER-PROMPT.md" \
    "Start closing review now. Process CLOSED-*.md in tasks/; prepend summary; move to done/YYYY/MM/DD with scripts/move-agent-task-to-done.sh when done. Do your job."
}

step_committer() {
  if ! has_pos_repo_uncommitted_changes; then
    echo "----- committer (changelog + commit) (skip: no uncommitted changes)"
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

  (no args)       Run full agent cycle every ${AGENT_LOOP_SLEEP_MINUTES:-5} minutes (loop).

  Single run:
    log, log-reviewer, 001   Log / incident reviewer (001; runs first in full cycle)
    feat, feature   Feature coder (FEAT-*.md in tasks/)
    coder           Coder (NEW-*.md or WIP-*.md)
    tester          Tester (UNTESTED-*.md or in-progress TESTING-*.md)
    closing-review  Closing reviewer (CLOSED-*.md still in tasks/)
    committer       Changelog + commit when POS repo has local changes

    help, -h, --help   Show this help

Environment:
  AGENT_LOOP_SLEEP_MINUTES   Sleep between full cycles when looping (default: 5).
  AGENT_GIT_SYNC             If 0, skip git fetch/pull before each step (default: 1).
  AGENT_LOOP_TMP             Directory for 001 preflight digest (default: \$TMPDIR/pi-agent-loop).
  AGENT_GH_REPO              Repo for gh issue list (default: satisfecho/pos).
  AGENT_LOG_REVIEWER_ALWAYS  If 1, always invoke 001 pi (skip preflight gate).
  AGENT_001_SKIP_PREFLIGHT   If 1, always invoke 001 (legacy).
  AGENT_001_RUN_WHEN_GH_UNKNOWN  If 1, run 001 when gh failed/missing and digest otherwise empty.
  OLLAMA_URL                  URL for Ollama API (default: http://localhost:11434/api/generate).
  TRIAGE_MODEL               Ollama model for triage (default: qwen2.5:1.5b).

Docker / app stack: start separately from repo root with ./run.sh -dev

Git: FEAT/NEW-WIP/tester/closing/committer run scripts/git-sync-development.sh only when that step has work. 001 syncs when its gate opens.

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

if ! have_pi; then
  echo "pi not found on PATH. Install pi or add to PATH." >&2
  echo "Loop aborted. Single commands will no-op until pi is available." >&2
  exit 1
fi

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
