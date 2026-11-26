# LiveKit agents for reservations

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/456
- **456**

## Status
- **Blocked - waiting for human:** voice vs chat, reservation actions, pilot tenant(s), approve thin LiveKit worker vs existing APIs.
- **Waiting notice posted:** 2026-11-26T15:43:06Z

## Problem / goal
Explore and (if product agrees) add LiveKit Agents so voice/chat agents can handle restaurant reservations end-to-end, using existing public and staff reservation APIs rather than a parallel booking system.

Issue ask is open-ended ("Possible?"). Scope must be clarified before a large build: channel (voice vs chat), which reservation actions (create / modify / cancel / availability), and tenant multi-tenancy / auth.

## High-level instructions for coder
- Read issue #456 and reservation docs: `docs/0010-table-reservation-implementation-plan.md`, `docs/0011-table-reservation-user-guide.md`, `docs/0025-reservation-overbooking-detection.md`.
- Survey existing reservation endpoints (public book-by-tenant, staff reservations, cancel-by-token) and note what an agent would call.
- There is no LiveKit usage in this repo yet. Propose a thin integration path (LiveKit Agents + worker talking to existing APIs) on **`development`**; do not invent a second reservation store.
- Prefer a small vertical slice (e.g. check availability + create reservation for one tenant) over a full contact-center product.
- Secrets (LiveKit API key/secret, SIP, etc.) belong in `config.env` / deployment secrets only - never hard-code or paste into the task file.
- If product decisions (voice vs chat, which actions, which tenants, cost/ops) are unclear, post **one** waiting-for-human comment on #456 and park this FEAT per `agents2/TASKS-README.md`. Do not unilaterally commit to a large LiveKit platform build.
- Keep multi-tenant scoping and auth consistent with adjacent reservation routes.
