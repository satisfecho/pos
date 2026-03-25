# Reservation dialog should match public /book/ form inputs

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/84

## Problem / goal
The reservation dialog used on **satisfecho.de** should present the same input layout and form patterns as the public booking page (**https://satisfecho.de/book/** — date/time, party size, contact fields, etc.). Align UX so staff or embedded flows do not feel like a different product than the customer-facing book flow. See `docs/` for reservation/booking behaviour if relevant.

## High-level instructions for coder
- Locate the reservation dialog component(s) vs the public **book** route components and templates.
- Compare field order, labels, validation messaging, spacing, and control types; reuse shared form pieces or styles where the codebase already factors them.
- Ensure responsive behaviour matches or is intentionally documented if the dialog must differ (e.g. modal width).
- Smoke-test: open dialog and public `/book/{tenant}` for the same tenant and verify visual and functional parity for the same inputs.

## Implementation notes (coder)
- **File:** `front/src/app/reservations/reservations.component.ts` (inline template + styles).
- Reordered modal fields to mirror `/book`: date → time → party size → contact block (name, phone, email) → reservation notes → customer notes → staff owner notes.
- Wrapped fields in `<form (ngSubmit)="saveReservation()">`; submit uses `BOOK.INVALID_PHONE` / `BOOK.INVALID_EMAIL` and shared `contact-validators` like `book.component.ts`.
- Removed local overrides that duplicated global `_forms.scss` `.form-group` styling; modal width slightly increased; hint string `RESERVATIONS.MODAL_DATE_TIME_HINT` documents staff calendar/time vs. public week grid.
- List cards label `client_notes` with `RESERVATIONS.RESERVATION_NOTES` for terminology parity with the book page.
- New i18n keys: `RESERVATIONS.MODAL_DATE_TIME_HINT`, `RESERVATIONS.ERROR_DATE_TIME_REQUIRED`, `RESERVATIONS.ERROR_PARTY_SIZE_RANGE` in all `front/public/i18n/*.json` locales.

---

## Testing instructions

### What to verify
- Staff **Reservations** create/edit modal shows fields in the same **order** and with the same **translation keys** for guest-visible fields as `/book/{tenant}` (date/time/party, then name, phone, email, reservation notes, customer notes).
- Inputs use the **global form** look (focus ring, borders, spacing), not the old compact grey border style.
- **Validation:** invalid phone or non-empty invalid email shows the same messages as the book page (`BOOK.INVALID_PHONE`, `BOOK.INVALID_EMAIL`).
- **Staff-only:** Owner notes block remains; hint at top explains calendar/time vs. public week grid.
- **Regression:** Save still creates/updates reservations; prefill-from-phone still works on create.

### How to test
1. Stack up: `docker compose -f docker-compose.yml -f docker-compose.dev.yml` (or `./run.sh`); note HAProxy port (e.g. `4202`).
2. Log in as a user with `reservation:write`; open `/reservations`, click **New reservation**. Confirm field order and styling; try Save with empty phone → expect invalid phone message; with `not-an-email` in email → invalid email.
3. Open `/book/1` (or your tenant id) in another tab: compare labels and order for the overlapping fields (public page uses week grid for slot; staff uses date/time inputs — expected difference, documented by hint).
4. Quick automated smoke: `cd front && BASE_URL=http://127.0.0.1:4202 npm run test:landing-version`.
5. Optional: `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front` — no Angular build errors after changes.

### Pass / fail criteria
- **Pass:** Modal field order matches spec; guest-facing labels match book keys; phone/email validation matches book; build succeeds; landing smoke test passes.
- **Fail:** Wrong field order, missing translations, save broken, or front build errors in logs.

---

## Test report

1. **Date/time (UTC):** 2026-03-25 11:00–11:09 (verification window). Log window: `docker compose … logs --tail=80 front` immediately after runs (~11:00–11:08 UTC).

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` @ `bace3ad`. Demo login via repo `.env` (`DEMO_LOGIN_EMAIL` / `DEMO_LOGIN_PASSWORD`). **Note:** Tenant 1 had `ui_modules` with `reservations: false`, which redirects `/reservations` → `/dashboard`; for browser checks the `reservations` flag was temporarily removed from the stored JSON (other disabled modules unchanged), then **restored** to the original value after tests.

3. **What was tested (from “What to verify”):** Modal vs `/book/1` label order and parity; global form styling signal; client-side phone/email validation messages; staff-only hint and owner notes; landing smoke; front build logs; create-save regression with valid slot/phone.

4. **Results**
   - Field order vs `/book` (date/time → party → contact → notes): **PASS** — Puppeteer collected `.book-form > .form-group` labels (week grid block has no top-level `label` → empty first entry) then party/name/phone/email/reservation notes/customer notes; modal order date, time, party, name, phone, email, reservation notes, allergies/special requirements, staff notes. Evidence: modal JSON order in tester log (`res-modal-date` … `res-modal-owner-notes`).
   - Same translation keys for overlapping guest fields: **PASS** — Template review: book page uses `RESERVATIONS.DATE` / `RESERVATIONS.TIME` in hidden labels, `RESERVATIONS.PARTY_SIZE`, `CUSTOMER_*`, `RESERVATIONS.RESERVATION_NOTES`, `RESERVATIONS.CUSTOMER_NOTES`; modal uses the same keys for those fields (`reservations.component.ts` template). Evidence: `book.component.html` lines 207–248 vs modal template labels 140–229.
   - Global form look (not old compact grey): **PASS** (sample) — `getComputedStyle(#res-modal-phone)` border `1px solid rgb(231, 229, 228)` (stone-200-scale); uses shared `.form-group` path. Evidence: Puppeteer `phoneBorder` line in verification output.
   - Validation `BOOK.INVALID_PHONE` / `BOOK.INVALID_EMAIL`: **PASS** — Submitted invalid phone `x` then valid phone + invalid email `not-an-email`; `.form-error` text equals `en.json` `BOOK.INVALID_PHONE` and `BOOK.INVALID_EMAIL`. Evidence: `phoneMsgMatch true emailMsgMatch true`.
   - Staff-only: owner notes + top hint: **PASS** — Hint text present (`RESERVATIONS.MODAL_DATE_TIME_HINT` copy); owner notes field `res-modal-owner-notes`. Evidence: Puppeteer `modal.hint` and ninth `form-group` label “Staff notes”.
   - Regression save create: **PASS** — After fixing test data (local calendar date for `type="date"`, time `15:00` in opening window, phone `+34600111234` for `default_phone_country`), modal closed without error and list showed new card when filter date matched. Evidence: `afterSave { modalOpen: false, formError: null }`, `saveCardVisible true`.
   - Prefill from phone: **PASS** (UI presence) — Create modal still renders prefill button next to phone (`!editingReservation()` branch). Functional prefill against real prior guest **not** exercised in this run.

5. **Overall:** **PASS**

6. **Product owner feedback:** The staff modal now mirrors the public booking field sequence and shared `RESERVATIONS.*` / `BOOK` validation copy, with a clear hint that staff pick date/time while guests use the week grid. If your tenant has the reservations staff module turned off in Settings, `/reservations` will redirect to the dashboard until that module is enabled—this is unrelated to the modal change but blocked the first login attempt until the DB flag was adjusted for testing.

7. **URLs tested**
   1. `http://127.0.0.1:4202/login?tenant=1`
   2. `http://127.0.0.1:4202/dashboard` (post-login)
   3. `http://127.0.0.1:4202/book/1` (label/order reference)
   4. `http://127.0.0.1:4202/reservations` (modal, validation, create)

8. **Relevant log excerpts**
   - Front (compose): `Application bundle generation complete` for `reservations-component` chunks; no `Error` / `NG` build failures in tail—e.g. `Application bundle generation complete. [0.323 seconds] - 2026-03-25T11:00:17.110Z`.
   - Landing smoke: `>>> RESULT: Landing version OK; demo login (tenant=1) OK; sidebar nav OK.`
