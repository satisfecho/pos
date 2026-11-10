# Investigate production 500 errors (#438)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/438
- **438**

## Status
- **Blocked - waiting for human** (ops access): no amvara9 SSH key on this agent host; `gh` / `GH_TOKEN` return HTTP 401 (cannot read issue body or post comments). Need either (a) redacted prod `pos-back` / `pos-haproxy` lines showing path + exception type on #438, or (b) restore deploy SSH and a working GitHub token, then clear this wait.
- **Waiting notice posted:** 2026-11-07T10:13:28Z
- **Note:** `gh issue comment` for the waiting notice **failed** with Bad credentials at that timestamp. Re-post the notice once `gh auth` works; do not treat the missing issue comment as a human reply.

## Problem / goal
Production is reporting HTTP 500s. Goal: identify which endpoints/services fail on the live amvara9 stack, find root cause(s), and fix or document mitigations so guests/staff stop hitting server errors. Issue body is thin ("investigate on 500 errors on prod logfiles") - treat as an ops/reliability incident, not a feature.

Relevant docs: `docs/0001-ci-cd-amvara9.md`, `docs/0004-deployment.md`, `docs/0026-haproxy-ssl-amvara9.md`, `.cursor/rules/error-investigation-workflow.mdc`. Local digest invoice-email 500s were already fixed under CLOSED-434 - do not reopen that path unless prod logs still show the same SlowAPI `response` signature error.

## High-level instructions for coder
- Prefer production-impact triage: reproduce or confirm via current prod/back/haproxy logs (pattern: 500 / Exception / Traceback), then map failing paths to `back/` handlers.
- Check HAProxy vs backend: 502/503 vs application 500; note whether failures cluster on public menu, payments, auth, or admin APIs.
- Compare with local stack only as a secondary check (`http://127.0.0.1:14202`, `docker logs pos-back` / `pos-haproxy`); do not invent a NEW task for historical local digest noise.
- Fix concrete bugs with tenant scoping preserved; add or extend a focused pytest/Puppeteer smoke for the failing path.
- Do not paste secrets, full prod env dumps, or raw log blobs with PII into the task file or commits.
- When done: append **Testing instructions**; verify the previously failing endpoint returns non-500 under HAProxy and that recent `pos-back` logs stay clean for that route.

## Agent notes (010) - 2026-11-07T10:13:28Z
- Synced `development`; left task as **FEAT** (no WIP / no code).
- Public `https://satisfecho.de` probes (health, public tenant/menu, book/waitlist/delivery, login/token, payment-intent guards, customer register validation): **no HTTP 500**.
- Local HAProxy `127.0.0.1:14202`: landing/health 200; `pos-back` / `pos-haproxy` last 24h: **0** Internal Server Error / 5xx lines.
- Agent-loop 001 digest still surfaces historical local `POST .../invoice-email` 500s (SlowAPI `response`) already fixed under CLOSED-434 - not reopened.
- SSH to amvara9 (port 60022): all available keys **Permission denied**; jump via amvara8 also denied.
- GitHub: hosts.yml / `GH_TOKEN` / `GITHUB_TOKEN` / `MARKETING_ARTIFACT_TOKEN` all same invalid credential (401).
