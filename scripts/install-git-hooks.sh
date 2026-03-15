#!/bin/sh
# Install Git hooks from scripts/git-hooks/ into .git/hooks/
# Run from repo root: ./scripts/install-git-hooks.sh
set -e
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"
hooks_src="${root}/scripts/git-hooks"
hooks_dst="${root}/.git/hooks"
[ -d "$hooks_src" ] || { echo "No scripts/git-hooks found."; exit 1; }
[ -d "$hooks_dst" ] || { echo "Not a git repo or no .git/hooks."; exit 1; }
for f in "$hooks_src"/*; do
  [ -f "$f" ] || continue
  name="$(basename "$f")"
  cp "$f" "$hooks_dst/$name"
  chmod +x "$hooks_dst/$name"
  echo "Installed .git/hooks/$name"
done
