# Talk to POS (#344)

> **Status: first vertical slice (staff navigation demo).** Explores whether talking to the POS is useful without building an LLM platform.

## Product question

Would guests or staff benefit from voice and/or chat with the POS? The GitHub issue is open-ended. This doc records the first scoped answer and what shipped.

## Scope decision (MVP)

| Choice | Value |
|--------|--------|
| **Audience** | Staff (authenticated), any role that can open staff routes |
| **Job** | Speak or type a short phrase to **navigate** to a common floor screen |
| **Why this slice** | No API keys, no server AI, no order/payment mutation. Proves browser speech + intent mapping end-to-end on local HAProxy |
| **Route** | `/talk` (staff shell, `authGuard`) |

### In scope

- Browser **Web Speech API** when the browser supports it (Chrome/Edge typical).
- **Typed command** fallback for unsupported browsers and headless smoke tests.
- Local **keyword → route** matching (client-side only).
- Sidebar entry **Talk** and i18n keys.
- Short smoke: login → `/talk` → type `kitchen` → land on `/kitchen`.

### Out of scope (non-goals)

- Guest public chat or booking assistant.
- Cloud STT/TTS or LLM providers (no secrets in `config.env` for this slice).
- Mutating orders, payments, reservations, or settings by voice.
- Unbounded agent that acts without an explicit UI confirmation for writes.
- Marketing claims that “AI talk” is a live product feature beyond this demo path.

## Architecture notes

| Topic | Decision for this slice |
|-------|-------------------------|
| STT | Browser `SpeechRecognition` / `webkitSpeechRecognition` only |
| TTS | Optional browser `speechSynthesis` for short confirmations; not required |
| Offline | Keyword map works offline; STT depends on the browser (often needs network) |
| PII | Do **not** POST transcripts to the API; do **not** log full transcripts |
| Multi-tenant | Uses existing staff session / tenant; navigation only; no new tenant data |
| Secrets | None |

### Later options (not built)

1. Staff voice shortcuts that **propose** mutations (open table, mark item ready) with on-screen confirm.
2. Public guest FAQ chat grounded on tenant menu/hours (server, rate-limited, no write tools).
3. Optional cloud STT for Safari / mobile gaps - requires env secrets and a privacy review.

## Feasibility result

**Build this demo path.** Browser speech + keyword navigation is enough to answer “can staff talk to the POS?” for a first try. Do **not** build a general AI agent until a write-action design with confirmation exists.

## Smoke

```bash
BASE_URL=http://127.0.0.1:4202 LOGIN_EMAIL=… LOGIN_PASSWORD=… npm run test:talk --prefix front
```

See `docs/testing.md` (`test:talk`).
