#!/usr/bin/env bash
# Optional pre-001 filter: local LLM decides if Docker log heuristics are noise.
# Tries llama.cpp (OpenAI-compatible /v1/chat/completions) first, then Ollama.
# Invoked from pos-agent-loop.sh when a local backend is available (unless AGENT_001_OLLAMA_LOG_TRIAGE=0).
#
# Usage: scripts/agent-ollama-log-triage.sh /path/to/001-latest-context.txt
# Env:
#   LLAMA_CPP_BASE_URL     Default http://127.0.0.1:8080/v1
#   LLAMA_CPP_MODEL        Default Bonsai-8B.gguf
#   LLAMA_CPP_REQUEST_TIMEOUT  Seconds for HTTP request (default 180)
#   AGENT_001_SKIP_LLAMA_CPP   If 1, only use Ollama (skip llama.cpp attempt)
#   OLLAMA_MODEL           Default qwen2.5:1.5b
#   OLLAMA_HOST            Default http://127.0.0.1:11434 (local daemon; saves Cursor usage)
#
# Exit: 0 = ESCALATE (keep log incident flag for 001)
#       1 = SKIP    (clear log flag; do not call cursor for logs-only triage)
#       2 = error   (both backends failed or unavailable; caller keeps heuristic flag)

set -euo pipefail

ctx="${1:?usage: $0 /path/to/001-latest-context.txt}"
ollama_model="${OLLAMA_MODEL:-qwen2.5:1.5b}"
# Pin local Ollama HTTP API unless the user overrides OLLAMA_HOST (e.g. remote daemon).
: "${OLLAMA_HOST:=http://127.0.0.1:11434}"
export OLLAMA_HOST
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

prompt="You triage devops log excerpts. Answer briefly. First decide, then one word on its own line: either ESCALATE or SKIP.

ESCALATE = a developer should file follow-up (standing error, repeating 5xx, build still broken, DB FATAL).
SKIP = transient (e.g. one-off TS then compile ok), noise, or clearly self-recovered.

Log excerpt:
${body}"

llama_attempted=0
out=""
if [[ "${AGENT_001_SKIP_LLAMA_CPP:-}" != "1" ]] && command -v python3 >/dev/null 2>&1; then
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
' "$llama_base" "$llama_model" "$llama_timeout" 2>/dev/null
  ) || true
  out=$(printf '%s' "$out" | tr -d '\r')
fi

if [[ -z "$out" ]] && command -v ollama >/dev/null 2>&1; then
  if ((llama_attempted)); then
    echo "agent-ollama-log-triage: llama.cpp failed or empty, using Ollama (${ollama_model})" >&2
  fi
  out=$(printf '%s' "$prompt" | ollama run "$ollama_model" 2>/dev/null | tr -d '\r' || true)
fi

head_lines=$(printf '%s\n' "$out" | head -n 20)

if [[ -z "$head_lines" ]]; then
  echo "agent-ollama-log-triage: empty model output (llama.cpp and Ollama unavailable or both failed)" >&2
  exit 2
fi

if printf '%s\n' "$head_lines" | grep -qiE '\bescalate\b'; then
  exit 0
fi
if printf '%s\n' "$head_lines" | grep -qiE '\bskip\b'; then
  exit 1
fi

echo "agent-ollama-log-triage: no ESCALATE/SKIP token in model reply, escalating" >&2
exit 0
