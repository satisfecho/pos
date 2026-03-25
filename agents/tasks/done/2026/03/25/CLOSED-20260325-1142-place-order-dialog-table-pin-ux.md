---
## Closing summary (TOP)

- **What happened:** GitHub [#86](https://github.com/satisfecho/pos/issues/86): staff opening the menu from **Tables** hit the public PIN gate when placing orders, which was poor UX for waiters.
- **What was done:** Staff **Open menu** now uses `GET /tables/{id}/staff-menu-token` and `/menu/{token}?staff_access=…` (aligned with Staff orders); guests still use public URLs. When a PIN is still required, the sheet shows **Table: {name}** via i18n (`MENU.PIN_TABLE_CONTEXT`).
- **What was tested:** Tester reported **PASS** — staff path skips PIN modal, public copy/QR still require PIN with table context, `test:landing-version` and `test-staff-menu-link-puppeteer.mjs` pass, front logs clean.
- **Why closed:** Verification complete; all testing criteria met.
- **Closed at (UTC):** 2026-03-25 12:18
---

# Place an order: table PIN dialog UX

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/86

## Problem / goal
When placing an order, a dialog asks for the **table PIN**. Waiters find it hard to leave that flow to check the tables view and return to continue the order. Reporter suggests showing the **table PIN in the dialog** (e.g. upper area) so the waiter does not need to navigate away.

## High-level instructions for coder
- Find the order-placement dialog that collects the table PIN; trace how table context (table id, name, PIN or hint) is available when the dialog opens.
- Design minimal UX: surface the PIN (or safe hint if PIN must not be shown in full per policy) **inside the dialog** so waiters can complete entry without round-tripping to `/tables`.
- Preserve security expectations: if full PIN must not be displayed, show table name/number and link or secondary affordance that matches product rules.
- Test happy path and cancel/back; ensure keyboard focus and mobile layouts still work.

## Implementation summary (coder)
- **Root cause:** Staff **Tables** “Open menu” used the **public** `/menu/{token}` URL (same as QR / copy link), so `table_requires_pin` was true and the PIN modal appeared when placing an order.
- **Fix:** Staff open-menu actions now call `GET /tables/{id}/staff-menu-token` and open `/menu/{token}?staff_access=…` (same pattern as **Staff orders → Open menu**). Waiters skip the PIN flow without leaking the PIN in the public menu API.
- **QR code and Copy link** still use the public URL only (customers must enter PIN).
- **PIN modal:** When a PIN is still required (e.g. public URL, wrong PIN), the sheet shows **Table: {name}** above the title (`MENU.PIN_TABLE_CONTEXT` + i18n).

## Testing instructions (for tester)
1. **Staff tables → menu (main path):** Log in as staff, open **Tables**, activate a table with a PIN. Click **Open menu** (↗ in table view or **Open menu** in tile view). Confirm the new tab URL contains `staff_access=`. Add a product, **Place order** — **no** PIN modal (same expectation as `front/scripts/test-staff-menu-link-puppeteer.mjs` for orders).
2. **Customer URL unchanged:** From the same table, use **Copy** or scan the **QR** URL — it must **not** contain `staff_access`. Open that URL, place order — PIN modal should appear; it should show the **Table: …** line when the table name is loaded.
3. **Smoke:** With stack up, `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` passes.
4. **Front build:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front` shows no Angular/TS errors after the change.

---

## Test report

1. **Date/time (UTC):** 2026-03-25T12:14:00Z – 2026-03-25T12:20:00Z (approx.). **Log window:** same window for `pos-front` tail below.

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; **BASE_URL** `http://127.0.0.1:4202`; **branch** `development` @ `517d2aa`. Puppeteer: host Chrome, `HEADLESS=1`; credentials from repo `.env` (`LOGIN_EMAIL` / `LOGIN_PASSWORD` or demo vars).

3. **What was tested:** Items 1–4 from **Testing instructions** above.

4. **Results**
   - **Staff Tables → Open menu → Place order (no PIN):** **PASS** — One-off Puppeteer flow: table view, activate first row if needed, ↗ opens tab with `staff_access=`; after add-to-cart + place order, no visible `.pin-input` PIN modal.
   - **Customer Copy URL (no staff_access) → PIN + Table context:** **PASS** — Clipboard after Copy: `/menu/{uuid}` only; new tab place order shows PIN UI; `.pin-table-context` text `Table: Table 1`.
   - **Smoke `test:landing-version`:** **PASS** — `exit_code: 0`, “Landing version OK”.
   - **`test-staff-menu-link-puppeteer.mjs`:** **PASS** — “No PIN modal shown; staff link correctly skips PIN.”
   - **Front build / logs:** **PASS** — `docker compose … logs --tail=80 front`: lines show `Application bundle generation complete` with no `error TS` / `NG800` / bundle failed.

5. **Overall:** **PASS** (all criteria above).

6. **Product owner feedback:** Staff can open the menu from **Tables** without hitting the PIN gate, matching **Staff orders → Open menu**. Guests still use the public link and see the PIN step, with a clear **Table: …** line so staff know which table they are on. No regression observed in landing navigation smoke or Angular rebuild logs in the sampled window.

7. **URLs tested**
   1. `http://127.0.0.1:4202/login?tenant=1`
   2. `http://127.0.0.1:4202/tables`
   3. `http://127.0.0.1:4202/menu/<token>?staff_access=<token>` (staff tab; full URL captured in run output)
   4. `http://127.0.0.1:4202/menu/0a57107e-0927-45bc-bf70-cfc06669caa0` (public copy link from same session; token is environment-specific)

8. **Relevant log excerpts**
   - **Front (pos-front, tail):** `Application bundle generation complete. [0.802 seconds] - 2026-03-25T11:51:35.378Z` / `Component update sent to client(s).` — no compilation errors in block.
   - **Puppeteer (staff orders script):** `Menu tab URL has staff_access: true` / `PASS: No PIN modal shown; staff link correctly skips PIN.`
   - **Puppeteer (Tables + public):** `Staff menu URL has staff_access: true` / `PASS C: No PIN after staff Tables → Open menu` / `PASS E: PIN modal with context: Table: Table 1` / `ALL PASS`.
   - **Landing test:** `>>> RESULT: Landing version OK; demo login (tenant=1) OK; sidebar nav OK.` / `exit_code: 0`.

**GitHub:** Comments posted on issue #86 (verification + PASS summary).
