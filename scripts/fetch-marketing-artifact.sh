#!/usr/bin/env bash
# Download latest successful GitHub Actions artifact for a marketing repo into front/sites/<slug>/.
# Uses curl + jq only. See config/marketing-sites.json and scripts/sync-all-marketing-sites.sh.
#
# Env:
#   GH_TOKEN / MARKETING_ARTIFACT_TOKEN — PAT with Actions read on the target repo
#   MARKETING_REPO — owner/name (required)
#   MARKETING_BRANCH — default development
#   MARKETING_ARTIFACT_NAME — artifact name from workflow (default dist)
#   TARGET_DIR — relative to repo root, e.g. front/sites/wimpi
#   MARKETING_SKIP=1 — no-op success
#   POS_REPO_ROOT — repo root (default: parent of scripts/)

set -euo pipefail

ROOT="${POS_REPO_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$ROOT"

TARGET_DIR="${TARGET_DIR:?TARGET_DIR required}"
REPO="${MARKETING_REPO:?MARKETING_REPO required}"
BRANCH="${MARKETING_BRANCH:-development}"
[[ -n "$BRANCH" ]] || BRANCH="development"
ARTIFACT_NAME="${MARKETING_ARTIFACT_NAME:-dist}"
[[ -n "$ARTIFACT_NAME" ]] || ARTIFACT_NAME="dist"
TOKEN="${MARKETING_ARTIFACT_TOKEN:-${GH_TOKEN:-${GUSTAZO_ARTIFACT_TOKEN:-}}}"

if [[ "${MARKETING_SKIP:-0}" == "1" ]]; then
  echo "[fetch-marketing] SKIP=1 — skipping."
  exit 0
fi

if [[ -z "$TOKEN" ]]; then
  echo "[fetch-marketing] No token — skipping ${REPO} → ${TARGET_DIR}"
  exit 1
fi

API="https://api.github.com"
AUTH_HDR=(-H "Authorization: Bearer ${TOKEN}" -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28")

echo "[fetch-marketing] Latest successful run for ${REPO}@${BRANCH}..."
RUNS_JSON="$(curl -sf "${AUTH_HDR[@]}" "${API}/repos/${REPO}/actions/runs?branch=${BRANCH}&status=completed&per_page=20")" || {
  echo "::error::GitHub API failed (runs list)."
  exit 1
}

RUN_ID="$(echo "$RUNS_JSON" | jq -r '.workflow_runs[] | select(.conclusion == "success") | .id' | head -1)"
if [[ -z "$RUN_ID" || "$RUN_ID" == "null" ]]; then
  echo "::error::No successful workflow run for ${REPO}@${BRANCH}"
  exit 1
fi

ARTIFACTS_JSON="$(curl -sf "${AUTH_HDR[@]}" "${API}/repos/${REPO}/actions/runs/${RUN_ID}/artifacts")" || {
  echo "::error::GitHub API failed (artifacts)."
  exit 1
}

ZIP_URL="$(echo "$ARTIFACTS_JSON" | jq -r --arg name "$ARTIFACT_NAME" '.artifacts[] | select(.name == $name) | .archive_download_url' | head -1)"
if [[ -z "$ZIP_URL" || "$ZIP_URL" == "null" ]]; then
  NAMES="$(echo "$ARTIFACTS_JSON" | jq -r '.artifacts[].name' | paste -sd, -)"
  echo "::error::No artifact '${ARTIFACT_NAME}'. Available: ${NAMES:-none}"
  exit 1
fi

TMP_ZIP="$(mktemp)"
TMP_EX="$(mktemp -d)"
cleanup() { rm -f "$TMP_ZIP"; rm -rf "$TMP_EX"; }
trap cleanup EXIT

curl -sfL "${AUTH_HDR[@]}" -o "$TMP_ZIP" "$ZIP_URL" || {
  echo "::error::Artifact download failed."
  exit 1
}

mkdir -p "$TMP_EX"
unzip -q -o "$TMP_ZIP" -d "$TMP_EX"

mkdir -p "${TARGET_DIR}"
find "${TARGET_DIR}" -mindepth 1 -maxdepth 1 ! -name 'gitkeep.txt' -exec rm -rf {} +

shopt -s dotglob nullglob
TOP=( "$TMP_EX"/* )
if [[ ${#TOP[@]} -eq 1 && -d "${TOP[0]}" ]]; then
  mv "${TOP[0]}"/* "${TARGET_DIR}/" 2>/dev/null || true
else
  mv "$TMP_EX"/* "${TARGET_DIR}/" 2>/dev/null || true
fi
shopt -u dotglob nullglob

if [[ -d "${TARGET_DIR}/browser" && ! -f "${TARGET_DIR}/index.html" ]]; then
  mv "${TARGET_DIR}/browser"/* "${TARGET_DIR}/" || true
  rmdir "${TARGET_DIR}/browser" 2>/dev/null || true
fi

echo "[fetch-marketing] OK → ${TARGET_DIR} ($(find "${TARGET_DIR}" -type f 2>/dev/null | wc -l | tr -d ' ') files)"
exit 0
