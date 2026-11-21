#!/usr/bin/env bash
# Sync local checkout with origin/development (fetch + pull --rebase).
# Use before agents or humans edit/commit so concurrent pushes are integrated.
# Skip entirely: AGENT_GIT_SYNC=0
#
# Stamp-only dirty trees (reviewer time-of-last-review / last-scan.json) are
# restored before pull so --autostash cannot leave unresolved conflicts
# (amvara3 2026-11 incident). Unmerged paths write tmp/agent-git-sync-blocked.txt
# (exit 2) for the watchdog to escalate.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BLOCK_FILE="${AGENT_GIT_SYNC_BLOCK_FILE:-$ROOT/tmp/agent-git-sync-blocked.txt}"

if [[ "${AGENT_GIT_SYNC:-1}" == "0" ]]; then
  exit 0
fi

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "git-sync-development: not a git repository: $ROOT" >&2
  exit 1
fi

clear_block_stamp() {
  rm -f "$BLOCK_FILE"
}

write_block_stamp() {
  local reason="${1:-unknown}"
  mkdir -p "$(dirname "$BLOCK_FILE")"
  {
    echo "ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "reason=${reason}"
    echo "cwd=${ROOT}"
    echo "branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
    echo "--- git status -sb ---"
    git status -sb 2>/dev/null || true
    echo "--- unmerged ---"
    git diff --name-only --diff-filter=U 2>/dev/null || true
  } >"$BLOCK_FILE"
  echo "git-sync-development: wrote blocker stamp ${BLOCK_FILE} (${reason})" >&2
}

has_unmerged_paths() {
  local u
  u="$(git diff --name-only --diff-filter=U 2>/dev/null || true)"
  [[ -n "${u}" ]]
}

# Same allowlist as agents2/pos-cursor-loop.sh committer stamp-only path.
is_stamp_allowlist_path() {
  case "$1" in
    agents2/001-gh-reviewer/time-of-last-review.txt) return 0 ;;
    agents2/005-marketing-repos-reviewer/time-of-last-review.txt) return 0 ;;
    agents2/005-marketing-repos-reviewer/last-scan.json) return 0 ;;
    agents2/008-enhancement-reviewer/time-of-last-review.txt) return 0 ;;
    agents2/008-enhancement-reviewer/last-scan.json) return 0 ;;
    agents2/011-upstream-monitor/time-of-last-review.txt) return 0 ;;
    agents2/011-upstream-monitor/last-scan.json) return 0 ;;
    *) return 1 ;;
  esac
}

changed_paths() {
  {
    git diff --name-only HEAD 2>/dev/null || true
    git diff --name-only --cached 2>/dev/null || true
    git ls-files --others --exclude-standard 2>/dev/null || true
  } | sort -u
}

# If every dirty path is a reviewer stamp, discard local stamp edits so pull
# does not need autostash (avoids stash-pop conflicts on those files).
discard_stamp_only_dirt() {
  local f had=0
  while IFS= read -r f; do
    [[ -z "$f" ]] && continue
    if ! is_stamp_allowlist_path "$f"; then
      return 1
    fi
    had=1
  done < <(changed_paths)
  ((had == 1)) || return 1
  echo "git-sync-development: discarding stamp-only local dirt before pull"
  while IFS= read -r f; do
    [[ -z "$f" ]] && continue
    if git ls-files --error-unmatch "$f" >/dev/null 2>&1; then
      git restore --worktree --staged -- "$f" 2>/dev/null \
        || git checkout -- "$f" 2>/dev/null \
        || true
    else
      rm -f "$f"
    fi
  done < <(changed_paths)
  return 0
}

if has_unmerged_paths; then
  write_block_stamp "unmerged-before-pull"
  echo "git-sync-development: unmerged paths present — resolve conflicts, then re-run sync" >&2
  git diff --name-only --diff-filter=U >&2 || true
  exit 2
fi

git fetch origin

if ! git rev-parse --verify --quiet origin/development >/dev/null; then
  echo "git-sync-development: origin/development missing after fetch" >&2
  exit 1
fi

current="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
if [[ "$current" != "development" ]]; then
  if git show-ref --verify --quiet refs/heads/development; then
    git checkout development
  else
    git checkout -b development origin/development
  fi
fi

discard_stamp_only_dirt || true

if ! git pull --rebase --autostash origin development; then
  if has_unmerged_paths; then
    write_block_stamp "unmerged-after-pull-autostash"
    echo "git-sync-development: pull left unmerged paths (often autostash conflict)" >&2
    exit 2
  fi
  echo "git-sync-development: git pull --rebase --autostash failed" >&2
  exit 1
fi

if has_unmerged_paths; then
  write_block_stamp "unmerged-after-pull-success-path"
  echo "git-sync-development: unmerged paths after pull" >&2
  exit 2
fi

clear_block_stamp
exit 0
