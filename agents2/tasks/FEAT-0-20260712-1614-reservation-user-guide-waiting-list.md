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
