#!/usr/bin/env bash
# Move a CLOSED-* task from agents/tasks/ to agents/tasks/done/YYYY/MM/DD/
# using the YYYYMMDD segment in the filename (see agents/tasks/README.md).
#
# Usage (repo root):
#   ./scripts/move-agent-task-to-done.sh agents/tasks/CLOSED-20260323-1200-slug.md
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

if [[ ! "$BASENAME" =~ ^CLOSED-[0-9]{8}- ]]; then
  echo "$0: expected basename like CLOSED-YYYYMMDD-HHMM-slug.md, got: $BASENAME" >&2
  exit 1
fi

if [ ! -f "$TASK_PATH" ]; then
  echo "$0: file not found: $TASK_PATH" >&2
  exit 1
fi

TASKS_DIR="$REPO_ROOT/agents/tasks"
EXPECTED_PREFIX="$TASKS_DIR/"

case "$TASK_PATH" in
  "$EXPECTED_PREFIX"*) ;;
  *)
    echo "$0: file must live under $TASKS_DIR (got $TASK_PATH)" >&2
    exit 1
    ;;
esac

# CLOSED-20260323-... -> 2026 03 23
DATE_PART="${BASENAME#CLOSED-}"
YEAR="${DATE_PART:0:4}"
MONTH="${DATE_PART:4:2}"
DAY="${DATE_PART:6:2}"

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
echo "moved to agents/tasks/done/$YEAR/$MONTH/$DAY/$BASENAME"
