#!/usr/bin/env bash
# Rotate agents2/008-enhancement-reviewer/time-of-last-review.txt when it exceeds a line cap.
# Older lines are appended to time-of-last-review.archive.txt (never discarded).
# Cut point snaps to an ISO stamp line so the active file does not start mid-entry.
#
# Usage: rotate-008-time-of-last-review.sh
# Env:
#   POS_REPO_ROOT                 Repo root (default: parent of scripts/)
#   ENHANCEMENT_STAMP_KEEP_LINES  Max lines to keep in the active stamp (default: 100)
#   ENHANCEMENT_STAMP_ROTATE=0    Skip rotation (no-op)

set -euo pipefail

ROOT="${POS_REPO_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
STATE_DIR="${ROOT}/agents2/008-enhancement-reviewer"
STAMP_FILE="${STATE_DIR}/time-of-last-review.txt"
ARCHIVE_FILE="${STATE_DIR}/time-of-last-review.archive.txt"
KEEP_LINES="${ENHANCEMENT_STAMP_KEEP_LINES:-100}"

if [[ "${ENHANCEMENT_STAMP_ROTATE:-1}" == "0" ]]; then
  exit 0
fi

[[ -f "$STAMP_FILE" ]] || exit 0

# Integer keep lines (minimum 20 so a multi-line agent summary fits).
if ! [[ "$KEEP_LINES" =~ ^[0-9]+$ ]] || (( KEEP_LINES < 20 )); then
  KEEP_LINES=100
fi

python3 - "$STAMP_FILE" "$ARCHIVE_FILE" "$KEEP_LINES" <<'PY'
import os
import sys
from datetime import datetime, timezone

stamp_path, archive_path, keep_s = sys.argv[1:4]
keep = int(keep_s)

with open(stamp_path, "r", encoding="utf-8", errors="replace") as f:
    lines = f.readlines()

total = len(lines)
if total <= keep:
    print(f"008 stamp rotate: skip (lines={total} <= keep={keep})")
    sys.exit(0)

# Candidate start index (0-based) for the kept tail.
start = total - keep

def is_stamp_line(line: str) -> bool:
    # Agent / preflight lines begin with ISO-8601 UTC, e.g. 2026-07-23T18:01:45Z
    if len(line) < 20:
        return False
    head = line[:20]
    if head[4] != "-" or head[7] != "-" or head[10] != "T" or head[19] != "Z":
        return False
    try:
        datetime.strptime(head, "%Y-%m-%dT%H:%M:%SZ")
        return True
    except ValueError:
        return False

# Snap forward to the next stamp line so we do not keep a mid-paragraph fragment.
snap = None
for i in range(start, total):
    if is_stamp_line(lines[i]):
        snap = i
        break
# If the tail has no stamp line, snap backward from the candidate.
if snap is None:
    for i in range(start - 1, -1, -1):
        if is_stamp_line(lines[i]):
            snap = i
            break
if snap is None:
    # No stamp lines at all — keep last `keep` lines as-is.
    snap = start

archived = lines[:snap]
kept = lines[snap:]
if not archived:
    print(f"008 stamp rotate: skip (nothing to archive after snap; lines={total})")
    sys.exit(0)

os.makedirs(os.path.dirname(archive_path) or ".", exist_ok=True)
marker = (
    f"\n=== rotated {datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')} "
    f"moved_lines={len(archived)} kept_lines={len(kept)} ===\n"
)
with open(archive_path, "a", encoding="utf-8") as af:
    af.write(marker)
    af.writelines(archived)

with open(stamp_path, "w", encoding="utf-8") as sf:
    sf.writelines(kept)

print(
    f"008 stamp rotate: archived={len(archived)} kept={len(kept)} "
    f"archive={archive_path}"
)
PY
