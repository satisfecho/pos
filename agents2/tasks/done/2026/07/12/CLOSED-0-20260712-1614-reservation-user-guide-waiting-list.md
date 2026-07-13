---
## Closing summary (TOP)

- **What happened:** Documentation-only enhancement to bring `docs/0011-table-reservation-user-guide.md` in line with the waiting-list feature shipped in v2.1.11 (#282).
- **What was done:** Added §3 Waiting list (guest `/waitlist/:tenantId` flow, book-page link, staff queue actions), updated the URL table and testing checklist, and added a one-line waiting-list pointer in `README.md`.
- **What was tested:** Doc grep, structure, cross-links, README pointers, and live spot-check of `/book/1` → `/waitlist/1` — all **PASS**.
- **Why closed:** All verification criteria passed; no code changes required.
- **Closed at (UTC):** 2026-07-12 16:33
---

# Add waiting list to reservation user guide (docs/0011)

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

`docs/0011-table-reservation-user-guide.md` still describes only timed **book a table** and staff reservation management. The **waiting list** shipped in **2.1.11** (#282): public `/waitlist/:tenantId`, link from `/book/:tenantId`, staff queue on `/reservations`. Staff and support still rely on **0011** as the reservation URL guide; the gap causes confusion after preflight flagged stale docs (>90d untouched while code moved).

## Evidence (008 preflight / review)

- `stale_doc path=docs/0011-table-reservation-user-guide.md age_days=119`
- `SIGNAL docs_stale count=16` — this task scopes **one** doc only (no bulk rewrite).
- Feature reference: `CLOSED-282` implementation summary; migration `20260712120000_waiting_list_entry.sql`; routes `/waitlist/:tenantId`, staff Waiting list tab.

## High-level instructions for coder

- Update **`docs/0011-table-reservation-user-guide.md`** only: add a **Waiting list** section covering guest flow (`/waitlist/:tenantId`), link from book page, and staff queue actions (notified, book table, seated, cancel) — mirror behaviour in `docs/0010-table-reservation-implementation-plan.md` / closed #282 task without copying entire implementation plan.
- Add public URL examples (local `http://127.0.0.1:4202/waitlist/1`, production `https://www.satisfecho.de/waitlist/1`).
- Cross-link **`docs/0010-table-reservation-implementation-plan.md`** for API detail; do not edit other stale docs in this task.
- Optional: one-line pointer in **`README.md`** docs table only if 0011 is already listed there.
- Pass criteria: `rg -i 'waitlist|waiting list' docs/0011-table-reservation-user-guide.md` finds guest + staff coverage; reservation book/view/cancel sections remain accurate.
- Append **Testing instructions** when complete (doc review checklist is enough).

## Implementation summary

- Updated **`docs/0011-table-reservation-user-guide.md`**: section 1 (staff/end-user/backend bullets), new **§3 Waiting list** (guest + staff flows, local/production URLs), URL table, testing checklist, migration cross-link.
- **`README.md`**: one-line waiting-list pointer in Table Reservations + docs table blurb (0011 already listed).

## Testing instructions

1. **Doc grep (pass criteria):** `rg -i 'waitlist|waiting list' docs/0011-table-reservation-user-guide.md` — expect guest flow (`/waitlist/:tenantId`, book-page link) and staff tab/actions (notified, book table, seated, cancel).
2. **Structure:** Confirm §2 book/view/cancel flow unchanged in intent; §4 URL table includes `/waitlist/:tenantId` and staff `/reservations` tabs.
3. **Cross-links:** `docs/0010-table-reservation-implementation-plan.md` linked from §3 and §6; no other stale docs edited.
4. **README:** Table Reservations bullet mentions waiting list; docs table entry updated.
5. **Optional live spot-check:** `http://127.0.0.1:4202/waitlist/1` and `/book/1` waitlist link match documented URLs (no code change — docs only).

---

## Test report

**Date/time (UTC):** 2026-07-12 16:30 UTC (log window ~16:00–16:30 UTC)

**Environment:** `docker-compose.yml` + `docker-compose.dev.yml`, `BASE_URL=http://127.0.0.1:4202`, branch `development` @ `4233b43d`

**What was tested:** Doc grep and structure per Testing instructions; README pointers; optional live spot-check of `/book/1` → `/waitlist/1`.

**Results:**

| Criterion | Result | Evidence |
|-----------|--------|----------|
| Doc grep — guest + staff waitlist coverage | **PASS** | `rg -i 'waitlist\|waiting list' docs/0011-table-reservation-user-guide.md` — 20+ hits incl. `/waitlist/:tenantId`, book-page link, staff tab actions (Mark notified, Book table, Mark seated, Cancel) |
| Structure — §2 book/view/cancel intact; §4 URL table | **PASS** | §2 steps 1–4 unchanged; §4 table rows for `/waitlist/:tenantId` and `/reservations` (Reservations / Waiting list tabs) |
| Cross-links — 0010 from §3 and §6 | **PASS** | Two links to `docs/0010-table-reservation-implementation-plan.md` in §3 (staff API) and §6 (Related files) |
| README — waiting list mentioned | **PASS** | Table Reservations bullet + docs table blurb reference waiting list / 0011 |
| Optional live spot-check | **PASS** | `/book/1` link “No table now? Join the waiting list” → `/waitlist/1`; waitlist form shows name/party/phone; both URLs HTTP 200 |

**Overall:** **PASS**

**Product owner feedback:** The user guide now matches shipped waiting-list behaviour (#282). Staff and support have a single doc for timed reservations and the walk-in queue, with correct local and production URL examples. No code changes were required; documentation is ready for support use.

**URLs tested:**

1. http://127.0.0.1:4202/book/1
2. http://127.0.0.1:4202/waitlist/1

**Relevant log excerpts:**

```
Application bundle generation complete. [3.077 seconds] - 2026-07-12T16:27:13.053Z
```

(pos-front — no build errors in window; only pre-existing NG8107 warnings unrelated to this task)
