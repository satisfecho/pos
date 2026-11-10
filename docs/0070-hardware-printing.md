# Hardware printing ADR and runbook (#317)

**Status:** shipped (MVP Phase 1)

## Phase 0 decision (ADR)

| Option | Summary | Decision |
|--------|---------|----------|
| **A** - WebApp Hardware Bridge | Browser → `ws://localhost:8443` → local bridge → printer | Deferred (good for staff-PC-only; no cloud queue) |
| **B** - Browser extension + native host | Extension + Native Messaging | Rejected for MVP (extra install surface) |
| **C** - Headless LAN agent | Staff UI → `POST /print-jobs` → cloud queue → agent poll → ESC/POS `:9100` | **Chosen default** |

**Why C:** Backend already runs outside the restaurant WiFi (`docs/PRINTING.md`). Staff-triggered and automatic kitchen tickets share one authenticated queue. The agent only needs outbound HTTPS. Browser `window.print()` remains the fallback when no agent has heartbeated within 60s.

Option A remains a future enhancement for venues that prefer a local WebSocket bridge without polling.

Out of scope for this slice: cash-drawer kick, ZPL/label printers, per-station ticket split.

## Architecture

```
[Staff Angular] --POST /print-jobs--> [Backend queue] <--poll Bearer token-- [print agent on LAN] --TCP :9100--> [thermal printer]
                     |                                              |
                     +-- if agent offline → window.print() + warning
```

## API

### Staff (JWT / cookie, `order:read` or `settings:update`)

| Method | Path | Notes |
|--------|------|--------|
| `POST` | `/print-jobs` | Body: `job_type` `kitchen`\|`receipt`, optional `order_id`, `printer_role`, `payload` |
| `GET` | `/print-jobs/status` | `{ agent_online, last_seen_at, … }` |
| `GET` | `/print-jobs` | Recent jobs |
| `GET` | `/tenant/print-agents` | List agents (`settings:update`) |
| `POST` | `/tenant/print-agents` | Create; returns `token` **once** |
| `DELETE` | `/tenant/print-agents/{id}` | Revoke |

### Agent (Bearer token or `X-Print-Agent-Token`)

| Method | Path | Notes |
|--------|------|--------|
| `POST` | `/print-agent/heartbeat` | Updates `last_seen_at` |
| `GET` | `/print-agent/jobs` | Claims pending jobs |
| `POST` | `/print-agent/jobs/{id}/complete` | `{ status: done\|failed }` |

Unauthenticated print endpoints are not exposed. Agent routes are SaaS-paywall exempt (own token).

## Install / runbook

1. **Create agent** in Settings → Printing (owner/admin). Copy the one-time token. The Printing tab links to this runbook on GitHub (`docs/0070-hardware-printing.md`).
2. **On a LAN machine** (Pi / staff PC), set env and run:

```bash
export PRINT_AGENT_API_BASE=https://satisfecho.de/api   # or http://127.0.0.1:4202/api
export PRINT_AGENT_TOKEN='…'                            # from step 1
export KITCHEN_PRINTER_HOST=192.168.1.50
export RECEIPT_PRINTER_HOST=192.168.1.51
# optional dry-run (writes tmp/print-agent-last.bin):
export PRINT_AGENT_DRY_RUN=1
python3 scripts/print-agent/print_agent.py
```

3. Confirm **online** in Settings → Printing (`last_seen` within ~60s).
4. From Orders, print Factura / kitchen ticket - agent should claim the job without a browser print dialog.
5. If agent is offline, UI falls back to `window.print()` and shows a bridge-offline warning.

### Troubleshooting

| Symptom | Check |
|---------|--------|
| Agent never online | Token revoked? Wrong `PRINT_AGENT_API_BASE`? Firewall blocking HTTPS outbound? |
| Jobs stay `pending` | Agent process running? Heartbeat succeeding? |
| TCP print fails | Printer IP/port `:9100`, same LAN as agent; try `PRINT_AGENT_DRY_RUN=1` first |
| Browser dialog still appears | Expected when `agent_online` is false |

See also `docs/PRINTING.md` (design background) and `docs/0015-kitchen-display.md` / `docs/0017-billing-customers-factura.md`.
