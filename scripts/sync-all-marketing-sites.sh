#!/usr/bin/env bash
# Populate front/sites/<slug>/ from CI artifacts (token) or local ng build (sibling ../NNN_slug repos).
# Reads config/marketing-sites.json; optional sibling auto-discovery for folders matching ^[0-9]{3}_*
#
# Env: POS_REPO_ROOT, MARKETING_ARTIFACT_TOKEN / GUSTAZO_ARTIFACT_TOKEN / GH_TOKEN,
#      SYNC_MARKETING_ON_START (default 1), SYNC_GUSTAZO_ON_START fallback,
#      MARKETING_SYNC_FORCE / GUSTAZO_SYNC_FORCE, MARKETING_REFRESH_EVERY_START,
#      MARKETING_NG_CONFIGURATION (default production)

set -euo pipefail

ROOT="${POS_REPO_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
MANIFEST="$ROOT/config/marketing-sites.json"
PLACEHOLDER_SIG='bundle not loaded'

log() { echo "[marketing-sync] $*"; }

if [[ "${SYNC_MARKETING_ON_START:-${SYNC_GUSTAZO_ON_START:-1}}" != "1" ]]; then
  log "disabled (SYNC_MARKETING_ON_START / SYNC_GUSTAZO_ON_START)"
  exit 0
fi

if ! command -v jq >/dev/null 2>&1; then
  log "::error::jq is required"
  exit 1
fi

if [[ ! -f "$MANIFEST" ]]; then
  log "::error::missing $MANIFEST"
  exit 1
fi

TOKEN="${MARKETING_ARTIFACT_TOKEN:-${GUSTAZO_ARTIFACT_TOKEN:-${GH_TOKEN:-}}}"
FORCE="${MARKETING_SYNC_FORCE:-${GUSTAZO_SYNC_FORCE:-0}}"
REFRESH="${MARKETING_REFRESH_EVERY_START:-${GUSTAZO_REFRESH_EVERY_START:-0}}"
CFG="${MARKETING_NG_CONFIGURATION:-${GUSTAZO_NG_CONFIGURATION:-production}}"

PROCESSED_SLUGS_FILE="$(mktemp)"
cleanup_slug_file() { rm -f "${PROCESSED_SLUGS_FILE}"; }
trap cleanup_slug_file EXIT

slug_seen() {
  grep -qxF "$1" "${PROCESSED_SLUGS_FILE}" 2>/dev/null
}

slug_mark() {
  echo "$1" >>"${PROCESSED_SLUGS_FILE}"
}

artifact_dir() {
  local slug="$1" subpath="${2:-}"
  local dir="$ROOT/front/sites/$slug"
  [[ -n "$subpath" ]] && dir="${dir}/${subpath}"
  echo "$dir"
}

site_needs_update() {
  local target="$1" subpath="${2:-}"
  local check="${target}/index.html"
  [[ -n "$subpath" ]] && check="${target}/${subpath}/index.html"
  [[ "$FORCE" == "1" ]] || [[ "$REFRESH" == "1" ]] && return 0
  if [[ ! -f "$check" ]]; then
    return 0
  fi
  if grep -q "${PLACEHOLDER_SIG}" "$check" 2>/dev/null; then
    return 0
  fi
  return 1
}

infer_clone_dir() {
  echo "$1" | awk -F/ '{print $NF}'
}

fetch_one() {
  local slug="$1" repo="$2" branch="$3" artifact="$4" subpath="${5:-}"
  local target="$ROOT/front/sites/$slug"
  local artifact_target
  artifact_target="$(artifact_dir "$slug" "$subpath")"
  if ! site_needs_update "$target" "$subpath"; then
    log "up-to-date ${slug}"
    return 0
  fi
  [[ -n "$TOKEN" ]] || { log "no token — try local build for ${slug}"; return 1; }

  export GH_TOKEN="$TOKEN"
  export MARKETING_ARTIFACT_TOKEN="$TOKEN"
  export MARKETING_REPO="$repo"
  export MARKETING_BRANCH="${branch:-development}"
  export MARKETING_ARTIFACT_NAME="${artifact:-dist}"
  export TARGET_DIR="${artifact_target#"$ROOT/"}"
  export POS_REPO_ROOT="$ROOT"

  if bash "$ROOT/scripts/fetch-marketing-artifact.sh"; then
    log "artifact OK: ${slug}${subpath:+/${subpath}}"
    return 0
  fi
  return 1
}

build_one_local() {
  local slug="$1" local_dir="$2" subpath="${3:-}"
  local target="$ROOT/front/sites/$slug"
  local base_href="/${slug}/"
  [[ -n "$subpath" ]] && base_href="/${slug}/${subpath}/"

  if ! site_needs_update "$target" "$subpath"; then
    log "up-to-date ${slug} (local)"
    return 0
  fi

  if [[ ! -d "$local_dir" ]] || [[ ! -f "$local_dir/package.json" ]]; then
    log "no local repo at ${local_dir} — skip ${slug}"
    return 1
  fi

  log "ng build ${slug} from ${local_dir} ..."
  WORK="$(mktemp -d)"
  trap 'rm -rf "${WORK}"' RETURN
  cp -a "${local_dir}/." "${WORK}/"
  cd "${WORK}"

  npm ci --ignore-scripts
  set +e
  npx ng build --configuration "${CFG}" --base-href "${base_href}"
  ok=$?
  set -e
  if [[ "$ok" -ne 0 ]]; then
    log "ng build failed: ${slug}"
    return 1
  fi

  BROWSER="$(find "${WORK}/dist" -type d -name browser 2>/dev/null | head -1)"
  if [[ -z "${BROWSER}" ]] || [[ ! -f "${BROWSER}/index.html" ]]; then
    log "no browser output for ${slug}"
    return 1
  fi

  local dest="${target}"
  [[ -n "$subpath" ]] && dest="${target}/${subpath}"
  mkdir -p "${dest}"
  find "${dest}" -mindepth 1 -maxdepth 1 ! -name 'gitkeep.txt' -exec rm -rf {} +
  if [[ -n "$subpath" && -d "${BROWSER}/${subpath}" ]]; then
    cp -a "${BROWSER}/${subpath}/." "${dest}/"
  else
    cp -a "${BROWSER}/." "${dest}/"
  fi
  log "local build OK: ${slug}${subpath:+/${subpath}}"
  return 0
}

process_manifest_site() {
  local slug repo branch artifact clone_dir deploy_subpath
  slug=$(echo "$1" | jq -r '.slug')
  repo=$(echo "$1" | jq -r '.repo')
  branch=$(echo "$1" | jq -r '.branch // "development"')
  artifact=$(echo "$1" | jq -r '.artifact // "dist"')
  clone_dir=$(echo "$1" | jq -r '.cloneDir // empty')
  deploy_subpath=$(echo "$1" | jq -r '.deploySubpath // empty')

  [[ -n "$slug" && "$slug" != "null" ]] || return 0
  slug_mark "$slug"

  local folder="$clone_dir"
  [[ -n "$folder" ]] || folder="$(infer_clone_dir "$repo")"
  local sibling="$ROOT/../${folder}"

  if fetch_one "$slug" "$repo" "$branch" "$artifact" "$deploy_subpath"; then
    return 0
  fi
  build_one_local "$slug" "$sibling" "$deploy_subpath" || true
}

discover_siblings() {
  jq -e '.autoDiscoverSiblingRepos == true' "$MANIFEST" >/dev/null 2>&1 || return 0

  for dirpath in "$ROOT"/../*/; do
    [[ -d "$dirpath" ]] || continue
    base=$(basename "$dirpath")
    [[ "$base" =~ ^([0-9]{3})_(.+)$ ]] || continue
    local slug
    slug=$(echo "${BASH_REMATCH[2]}" | tr '[:upper:]' '[:lower:]')

    slug_seen "$slug" && continue
    [[ -f "$dirpath/package.json" ]] || continue

    slug_mark "$slug"
    local repo="satisfecho/${base}"

    log "discovered ${base} → slug=${slug} repo=${repo}"
    if fetch_one "$slug" "$repo" "development" "dist"; then
      continue
    fi
    build_one_local "$slug" "$dirpath" || true
  done
}

mkdir -p "$ROOT/front/sites"

while IFS= read -r obj; do
  [[ -z "$obj" ]] || [[ "$obj" == "null" ]] && continue
  process_manifest_site "$obj"
done < <(jq -c '.sites[]?' "$MANIFEST")

discover_siblings

bash "$ROOT/scripts/flatten-marketing-for-angular.sh"

if [[ "${MARKETING_VERIFY_NO_PLACEHOLDERS:-0}" == "1" ]]; then
  _ph_fail=0
  while IFS= read -r obj; do
    [[ -z "$obj" ]] || [[ "$obj" == "null" ]] && continue
    _slug=$(echo "$obj" | jq -r '.slug')
    [[ -n "$_slug" && "$_slug" != "null" ]] || continue
    _idx="${ROOT}/front/sites/${_slug}/index.html"
    if [[ -f "$_idx" ]] && grep -q "${PLACEHOLDER_SIG}" "$_idx" 2>/dev/null; then
      log "::error::placeholder still present for slug=${_slug} — missing artifact or PAT scope; use a token with Actions read on every repo in config/marketing-sites.json (not only 040_gustazo)."
      _ph_fail=1
    fi
  done < <(jq -c '.sites[]?' "$MANIFEST")
  if [[ "$_ph_fail" -ne 0 ]]; then
    exit 1
  fi
  log "verify: no placeholder index.html in manifest sites"
fi

log "done."
