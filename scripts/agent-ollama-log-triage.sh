#!/usr/bin/env bash
# Optional pre-001 filter: local LLM decides if Docker log heuristics are noise.
# Default: Ollama first, then llama.cpp OpenAI-compatible /v1/chat/completions.
# Set AGENT_001_LLAMA_CPP_FIRST=1 for llama.cpp first (legacy order).
# Invoked from pos-cursor-loop.sh when a local backend is available (unless AGENT_001_OLLAMA_LOG_TRIAGE=0).
#
# Usage: scripts/agent-ollama-log-triage.sh /path/to/001-latest-context.txt
# Env:
#   LLAMA_CPP_BASE_URL     Default http://127.0.0.1:8080/v1
#   LLAMA_CPP_MODEL        Default Bonsai-8B.gguf
#   LLAMA_CPP_REQUEST_TIMEOUT  Seconds for HTTP request (default 180)
#   AGENT_001_SKIP_LLAMA_CPP   If 1, only use Ollama (skip llama.cpp attempt)
#   AGENT_001_LLAMA_CPP_FIRST  If 1, try llama.cpp before Ollama (default is Ollama first)
#   AGENT_001_LOG_TRIAGE_DEBUG If 1, print llama.cpp / ollama stderr (default suppresses stderr)
#   OLLAMA_MODEL           Default Gemma4:latest
#   OLLAMA_HOST            Defaults to http://127.0.0.1:11434 only when unset; if set in the environment (e.g. remote daemon), that value is used.
#
# Exit: 0 = ESCALATE (keep log incident flag for 001)
#       1 = SKIP    (clear log flag; do not call cursor for logs-only triage)
#       2 = error   (both backends failed or unavailable; caller keeps heuristic flag)

set -euo pipefail

ctx="${1:?usage: $0 /path/to/001-latest-context.txt}"
ollama_model="${OLLAMA_MODEL:-Gemma4:latest}"
: "${OLLAMA_HOST:=http://127.0.0.1:11434}"
export OLLAMA_HOST

_log_dbg=0
[[ "${AGENT_001_LOG_TRIAGE_DEBUG:-}" == "1" ]] && _log_dbg=1
_err_sink=/dev/null
((_log_dbg)) && _err_sink=/dev/stderr
llama_base="${LLAMA_CPP_BASE_URL:-http://127.0.0.1:8080/v1}"
llama_model="${LLAMA_CPP_MODEL:-Bonsai-8B.gguf}"
llama_timeout="${LLAMA_CPP_REQUEST_TIMEOUT:-180}"

if [[ ! -f "$ctx" ]]; then
  echo "agent-ollama-log-triage: missing context file: $ctx" >&2
  exit 2
fi

body=$(sed -n '/=== Docker log incident/,/=== Preflight summary ===/p' "$ctx" | head -c 16000)
_body_compact=$(printf '%s' "$body" | tr -d ' \t\n\r')
if [[ -z "$_body_compact" ]]; then
  echo "agent-ollama-log-triage: no Docker section in context" >&2
  exit 2
fi
unset _body_compact

prompt="You triage devops log excerpts. Answer briefly.

ESCALATE = a developer should file follow-up (standing error, repeating 5xx, build still broken, DB FATAL).
SKIP = transient (e.g. one-off TS then compile ok), noise, or clearly self-recovered.

End your reply with a single final line containing only one word: ESCALATE or SKIP (no other text on that line).

Log excerpt:
${body}"

llama_attempted=0
out=""

run_llama_cpp() {
  out=""
  [[ "${AGENT_001_SKIP_LLAMA_CPP:-}" == "1" ]] && return 1
  command -v python3 >/dev/null 2>&1 || return 1
  llama_attempted=1
  # shellcheck disable=SC2016
  out=$(
    printf '%s' "$prompt" | python3 -c '
import json, sys, urllib.request

base, model, timeout = sys.argv[1], sys.argv[2], float(sys.argv[3])
prompt = sys.stdin.read()
url = base.rstrip("/") + "/chat/completions"
payload = {
    "model": model,
    "messages": [{"role": "user", "content": prompt}],
    "stream": False,
    "temperature": 0.2,
}
body = json.dumps(payload).encode("utf-8")
req = urllib.request.Request(
    url,
    data=body,
    headers={"Content-Type": "application/json"},
    method="POST",
)
try:
    with urllib.request.urlopen(req, timeout=timeout) as r:
        raw = r.read().decode("utf-8", errors="replace")
except Exception:
    sys.exit(1)
try:
    j = json.loads(raw)
    text = j["choices"][0]["message"]["content"]
except (KeyError, IndexError, TypeError, json.JSONDecodeError):
    sys.exit(1)
if not (text and str(text).strip()):
    sys.exit(1)
sys.stdout.write(str(text))
' "$llama_base" "$llama_model" "$llama_timeout" 2>"$_err_sink"
  ) || true
  out=$(printf '%s' "$out" | tr -d '\r')
  [[ -n "$(printf '%s' "$out" | tr -d ' \t\n\r')" ]]
}

run_ollama() {
  out=""
  command -v ollama >/dev/null 2>&1 || return 1
  out=$(printf '%s' "$prompt" | ollama run "$ollama_model" 2>"$_err_sink" | tr -d '\r' || true)
  [[ -n "$(printf '%s' "$out" | tr -d ' \t\n\r')" ]]
}

# Return: 0 = ESCALATE, 1 = SKIP, 2 = empty, 3 = ambiguous
_triage_decide() {
  local head_lines last_word ut
  head_lines=$(printf '%s\n' "$out" | head -n 20)
  if [[ -z "$(printf '%s' "$head_lines" | tr -d ' \t\n\r')" ]]; then
    return 2
  fi

  last_word=$(printf '%s\n' "$out" | awk 'NF { w=$NF } END { print w }' | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//;s/[.!?,;:]+$//')
  ut=$(printf '%s' "$last_word" | tr '[:lower:]' '[:upper:]')
  if [[ "$ut" == "SKIP" ]]; then
    return 1
  fi
  if [[ "$ut" == "ESCALATE" ]]; then
    return 0
  fi

  if printf '%s\n' "$head_lines" | grep -qiE '\bescalate\b'; then
    return 0
  fi
  if printf '%s\n' "$head_lines" | grep -qiE '\bskip\b'; then
    return 1
  fi
  return 3
}

if [[ "${AGENT_001_LLAMA_CPP_FIRST:-}" == "1" ]]; then
  if run_llama_cpp; then
    :
  else
    out=""
  fi
  if [[ -z "$(printf '%s' "$out" | tr -d ' \t\n\r')" ]] && run_ollama; then
    if ((llama_attempted)); then
      echo "agent-ollama-log-triage: llama.cpp failed or empty, using Ollama (${ollama_model})" >&2
    fi
  fi
else
  if run_ollama; then
    :
  else
    out=""
    if [[ "${AGENT_001_SKIP_LLAMA_CPP:-}" != "1" ]]; then
      echo "agent-ollama-log-triage: Ollama empty or unavailable, trying llama.cpp (${llama_model})" >&2
    fi
    run_llama_cpp || true
  fi
fi

set +e
_triage_decide
d=$?
set -e
case "$d" in
  0) exit 0 ;;
  1) exit 1 ;;
  2)
    echo "agent-ollama-log-triage: empty model output (primary backends)" >&2
    exit 2
    ;;
esac

echo "agent-ollama-log-triage: unclear verdict from primary; trying alternate backend" >&2
out=""
if [[ "${AGENT_001_LLAMA_CPP_FIRST:-}" == "1" ]]; then
  run_ollama || true
else
  if [[ "${AGENT_001_SKIP_LLAMA_CPP:-}" != "1" ]]; then
    run_llama_cpp || true
  fi
fi

if [[ -z "$(printf '%s' "$out" | tr -d ' \t\n\r')" ]]; then
  echo "agent-ollama-log-triage: alternate backend empty — escalating" >&2
  exit 0
fi

set +e
_triage_decide
d=$?
set -e
case "$d" in
  0) exit 0 ;;
  1) exit 1 ;;
  2) exit 2 ;;
esac

echo "agent-ollama-log-triage: no ESCALATE/SKIP after both backends, escalating" >&2
exit 0
