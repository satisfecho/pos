---
## Closing summary (TOP)

- **What happened:** Daily demo reset refreshed orders/reservations/delivery but left tenant 1 waitlist empty, so Waitlist demos looked broken.
- **What was done:** Added idempotent `seed_demo_waiting_list` (3 waiting + 1 notified), wired clear+reseed into `reset_demo_data`/`bootstrap_demo`, and documented in testing/AGENTS/0011 docs.
- **What was tested:** Reset seeded 4 rows; `check_demo_tables` OK; idempotent skip; public `/waitlist/1` 200; staff `GET /waiting-list` returned 4 names — overall PASS.
- **Why closed:** All acceptance criteria passed; tester overall PASS.
- **Closed at (UTC):** 2026-07-23 20:19
---

# Seed demo waiting-list entries for tenant 1

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Waiting list shipped (#282 / **2.1.11**): public `/waitlist/:tenantId` and staff Reservations → Waitlist. Daily **`reset_demo_data`** refreshes orders and reservations (and now Satisfecho Delivery samples) but **never** clears or seeds **`waiting_list_entry`**. Fresh demos and amvara9 after reset show an empty Waitlist tab even when Delivery/tables look alive, so sales and staff demos of the queue look broken.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T20:14Z: `SIGNAL docs_stale×14` + `changelog_sparse` already owned; `demo_tables_check=ok`; Unreleased empty post-**2.1.30**; NEW backlog≈111 — product/demo gap, not a bulk doc rewrite
- `rg WaitingList|waiting_list` under `back/app/seeds/` → no hits
- `reset_demo_data.py` deletes orders + reservations only; does not touch `waiting_list_entry`
- Sibling smoke **`NEW-0-20260723-1648-waiting-list-puppeteer-smoke`** owns Puppeteer only — this task owns **seed/reset hygiene**

## High-level instructions for coder

- Add an idempotent seed (new module or helper) that ensures tenant 1 has a small mix of **`waiting_list_entry`** rows (e.g. a few `waiting`, optionally one `notified`) with demo names/phones/party sizes
- Wire into **`reset_demo_data`**: delete tenant-1 waiting-list rows (or equivalent safe clear) then re-seed, alongside orders/reservations
- Document the one-liner next to other demo seeds in **`docs/testing.md`** / **`AGENTS.md`** Demo section; optional note in waitlist user guide if it already describes demo setup
- Do not change public/staff waiting-list APIs; tenant 1 only
- Pass/fail: after `python -m app.seeds.reset_demo_data`, tenant 1 has ≥1 active waitlist row; staff Waitlist tab / public page show data; `check_demo_tables` still OK

## Implementation notes (feature coder)

- Added `back/app/seeds/seed_demo_waiting_list.py`: 3 `waiting` + 1 `notified` for tenant 1; idempotent (skips if any rows exist).
- `reset_demo_data` deletes `waiting_list_entry` for tenant 1 then calls the seed; `bootstrap_demo` also runs it on virgin deploy.
- Documented in `docs/testing.md`, `AGENTS.md` Demo reset blurb, and `docs/0011-table-reservation-user-guide.md` testing section.
- Verified locally: after `reset_demo_data`, 4 active rows; `check_demo_tables` OK.

## Testing instructions

1. From repo root with stack up:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python -m app.seeds.reset_demo_data
   docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python -m app.seeds.check_demo_tables
   ```
2. Confirm seed output includes `seeded N waiting-list entries` and `check_demo_tables` exits 0.
3. Count active rows (expect ≥1 `waiting`/`notified`):
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python -c "
   from sqlmodel import Session, select
   from app.db import engine
   from app.models import WaitingListEntry, WaitingListStatus
   with Session(engine) as s:
       rows = s.exec(select(WaitingListEntry).where(WaitingListEntry.tenant_id == 1)).all()
       active = [r for r in rows if r.status in (WaitingListStatus.waiting, WaitingListStatus.notified)]
       print(len(active), [(r.status.value, r.customer_name) for r in active])
       assert len(active) >= 1
   "
   ```
4. Optional UI: open `http://127.0.0.1:4202/waitlist/1` (public form still works) and staff `/reservations` → **Waiting list** — queue shows demo names.
5. Idempotency: re-run `python -m app.seeds.seed_demo_waiting_list` → should print skip message when entries already exist.

## Test report

1. **Date/time (UTC):** 2026-07-23T20:17:36Z start → 2026-07-23T20:18:44Z end. Log window: `docker logs --since 15m pos-back`.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` (synced via `./scripts/git-sync-development.sh`).
3. **What was tested:** `reset_demo_data` clears/reseeds waiting-list; `check_demo_tables` OK; ≥1 active row for tenant 1; idempotent seed skip; public `/waitlist/1` loads; staff `GET /waiting-list` returns demo names; docs mention seed.
4. **Results:**
   - Reset seeds waiting list — **PASS** — stdout: `Tenant 1: seeded 4 waiting-list entries (3 waiting, 1 notified).` / `Demo data reset and re-seeded.`
   - `check_demo_tables` exit 0 — **PASS** — `OK: tenant 1 has T01–T10 with correct seat counts.`
   - Active rows ≥1 — **PASS** — `4 [('notified', 'Marco Bianchi'), ('waiting', 'Jonas Berg'), ('waiting', 'Claire Dupont'), ('waiting', 'Ana Ruiz')]`
   - Idempotency skip — **PASS** — `Tenant 1 already has waiting-list entries. Skipping demo waiting-list seed.`
   - Public `/waitlist/1` — **PASS** — HTTP 200; form shows Demo Pizzeria / Warteliste (name, party size, phone).
   - Staff queue data — **PASS** — cookie auth + `GET /api/waiting-list` → `api_count 4` with Ana Ruiz, Jonas Berg, Claire Dupont, Marco Bianchi.
   - Docs — **PASS** — `docs/testing.md` Demo waiting list one-liner; `AGENTS.md` reset blurb; `docs/0011-…` demo seed note.
5. **Overall:** **PASS**
6. **Product owner feedback:** Demo reset now leaves a believable Waitlist queue for tenant 1, so sales/staff demos match Delivery/tables. Public join form still works; staff API lists the four seeded guests. No API contract changes observed.
7. **URLs tested:**
   1. http://127.0.0.1:4202/waitlist/1
   2. http://127.0.0.1:4202/api/token (login)
   3. http://127.0.0.1:4202/api/waiting-list
8. **Relevant log excerpts:**
   ```
   INFO: … "POST /token HTTP/1.1" 200 OK
   INFO: … "GET /waiting-list HTTP/1.1" 200 OK
   INFO: … "GET /public/tenants/1 HTTP/1.1" 200 OK
   ```
   Seed evidence (compose exec stdout, not access log): `Tenant 1: seeded 4 waiting-list entries (3 waiting, 1 notified).`
