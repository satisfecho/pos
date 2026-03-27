#!/usr/bin/env bash
# Sync local checkout with origin/development (fetch + pull --rebase).
# Use before agents or humans edit/commit so concurrent pushes are integrated.
# Skip entirely: AGENT_GIT_SYNC=0
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ "${AGENT_GIT_SYNC:-1}" == "0" ]]; then
  exit 0
fi

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "git-sync-development: not a git repository: $ROOT" >&2
  exit 1
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

git pull --rebase --autostash origin development
