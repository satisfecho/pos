#!/usr/bin/env bash
# Move a CLOSED-* task from agents/tasks/ to agents/tasks/done/YYYY/MM/DD/
# using the YYYYMMDD segment in the filename (see agents/tasks/README.md).
#
# Usage (repo root):
#   ./scripts/move-agent-task-to-done.sh agents/tasks/CLOSED-20260323-1200-slug.md
#   ./scripts/move-agent-task-to-done.sh agents/tasks/CLOSED-178-20260413-1033-slug.md
#   ./scripts/move-agent-task-to-done.sh /absolute/path/to/CLOSED-....md

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ "${1:-}" = "" ]; then
  echo "usage: $0 <path-to-CLOSED-*.md>" >&2
  exit 1
fi

# Resolve to absolute path
TASK_PATH="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
BASENAME="$(basename "$TASK_PATH")"

# YYYYMMDD is either right after CLOSED- (legacy), CLOSED-<issue>-, or CLOSED-MKT-<repo>-<issue>- (marketing tasks).
YYYYMMDD=""
if [[ "$BASENAME" =~ ^CLOSED-MKT-[0-9]+-[0-9]+-([0-9]{8})-[0-9]{4}- ]]; then
  YYYYMMDD="${BASH_REMATCH[1]}"
elif [[ "$BASENAME" =~ ^CLOSED-[0-9]+-([0-9]{8})-[0-9]{4}- ]]; then
  YYYYMMDD="${BASH_REMATCH[1]}"
elif [[ "$BASENAME" =~ ^CLOSED-([0-9]{8})-[0-9]{4}- ]]; then
  YYYYMMDD="${BASH_REMATCH[1]}"
else
  echo "$0: expected CLOSED-YYYYMMDD-HHMM-slug.md or CLOSED-<issue>-YYYYMMDD-HHMM-slug.md, got: $BASENAME" >&2
  exit 1
fi

if [ ! -f "$TASK_PATH" ]; then
  echo "$0: file not found: $TASK_PATH" >&2
  exit 1
fi

# Canonical task dirs (some clones use agents2/tasks — see agents2/TASKS-README.md).
TASKS_DIR=""
for _dir in "$REPO_ROOT/agents/tasks" "$REPO_ROOT/agents2/tasks"; do
  case "$TASK_PATH" in
    "$_dir"/*) TASKS_DIR="$_dir" ;;
  esac
done
if [ -z "$TASKS_DIR" ]; then
  echo "$0: file must live under agents/tasks/ or agents2/tasks/ (got $TASK_PATH)" >&2
  exit 1
fi
TASKS_REL="${TASKS_DIR#"$REPO_ROOT/"}"

# ...YYYYMMDD... -> YYYY MM DD
YEAR="${YYYYMMDD:0:4}"
MONTH="${YYYYMMDD:4:2}"
DAY="${YYYYMMDD:6:2}"

if ! [[ "$YEAR" =~ ^[0-9]{4}$ && "$MONTH" =~ ^(0[1-9]|1[0-2])$ && "$DAY" =~ ^(0[1-9]|[12][0-9]|3[01])$ ]]; then
  echo "$0: could not parse YYYYMMDD from filename: $BASENAME" >&2
  exit 1
fi

DEST_DIR="$TASKS_DIR/done/$YEAR/$MONTH/$DAY"
mkdir -p "$DEST_DIR"

DEST_PATH="$DEST_DIR/$BASENAME"
if [ -e "$DEST_PATH" ]; then
  echo "$0: destination already exists: $DEST_PATH" >&2
  exit 1
fi

mv "$TASK_PATH" "$DEST_PATH"
echo "moved to $TASKS_REL/done/$YEAR/$MONTH/$DAY/$BASENAME"
