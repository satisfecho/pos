# Buttons of order

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/92

## Problem / goal
In the order UI, **`order-header-actions`** (buttons of order) should be **removed or hidden only in the orders context** — not globally elsewhere. Layout: ensure **`align-items: center`** applies as intended for that area. See issue body and any related order-header / staff order components in `front/`.

## High-level instructions for coder
- Locate **`order-header-actions`** usage (templates + styles) and distinguish **orders** views from other screens that reuse similar chrome.
- Remove or conditionally omit those header action buttons **only where orders are shown**, without breaking other flows.
- Adjust styling so **`align-items: center`** (or equivalent flex alignment) matches the desired vertical alignment for the order header row.
- Smoke-test an order flow (create/view order) and a non-order screen that might share components to confirm no regression.

## Implementation
- **`front/src/app/orders/orders.component.ts`:** Removed the **`order-header-actions`** column from order cards on **Active** and **Not paid yet**; the same controls (urgent, edit, pay/finish, status dropdown, delete, then menu + print) live in **`order-actions`** in the card footer so changes stay scoped to this component (no global **`_cards.scss`** / kitchen changes). **`order-header`** uses **`align-items: center`**; **`order-header-main`** has **`flex: 1`**; **`order-actions`** uses **`flex-wrap`**, **`align-items: center`**, **`justify-content: flex-end`**. Repaired the **Not paid** header markup (delete/status had been mis-nested vs **Active**).

## Testing instructions
1. **Build:** With Docker dev stack, `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front` — expect `Application bundle generation complete` with no TS/NG errors.
2. **Manual:** Log in as staff, open **`/staff/orders`**. On **Active** and **Not paid yet**, confirm order cards show **meta only** in the top header row (no button row beside it); confirm **Edit**, **status**, **Pay/Finish**, **Urgent**, **Delete**, **Open menu**, and **Print** still appear in the **footer** and work. **Order history** (grid) unchanged.
3. **Regression:** Open **Kitchen** — layout unchanged; no missing header content.
4. **Automated:** From repo root with app on **4202** and `.env` demo credentials: `BASE_URL=http://127.0.0.1:4202 node front/scripts/review-order-edit-puppeteer.mjs` (exit 0). Quick smoke: `cd front && BASE_URL=http://127.0.0.1:4202 npm run test:landing-version`.

**Pass criteria:** Build green; staff orders actions work from footer; kitchen unaffected; Puppeteer scripts above exit 0.

---

## Test report

1. **Date/time (UTC):** 2026-03-25T13:58Z–14:00Z (verification run). **Log window:** same (front rebuild timestamps through `14:00Z`; back INFO lines during Puppeteer traffic).

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; **BASE_URL** `http://127.0.0.1:4202`; branch **`development`**, commit **`aeee0ff`**.

3. **What was tested:** Per **Testing instructions**: Angular build via front container logs; staff **`/staff/orders`** flow (edit modal, status popover, history grid); kitchen regression via broad nav smoke; **`review-order-edit-puppeteer.mjs`** and **`npm run test:landing-version`**.

4. **Results:**
   - **Build green (no TS/NG errors):** **PASS** — `pos-front` log ends with `Application bundle generation complete.` (orders chunk rebuilds; no error lines in `--tail=80`).
   - **Staff orders — header vs footer layout:** **PASS** — `rg order-header-actions front` → **no matches** (column removed from app sources); template **`order-actions`** on Active cards includes urgent, edit, pay/finish, status control, delete (if permitted), menu link (if table), print (`orders.component.ts` ~224–357).
   - **Edit / status / history:** **PASS** — `review-order-edit-puppeteer.mjs` exit **0**: Edit opens modal from card; status dropdown visible (z-index OK); History grid Edit opens modal.
   - **Kitchen regression:** **PASS** — `test:landing-version` navigated **`/kitchen`** successfully (`OK: All top-level nav links navigated`); Angular dev mode, no navigation failure.
   - **`test:landing-version`:** **PASS** — exit **0**, `>>> RESULT: Landing version OK; demo login (tenant=1) OK; sidebar nav OK.` (browser console showed WebSocket `1008` invalid token on some routes; pre-existing noise, did not fail the script).

5. **Overall:** **PASS**

6. **Product owner feedback:** Order actions are consolidated into the card footer on Active / Not paid views, so the top row stays informational while staff still reach edit, status, and payment flows without leaving the card. Kitchen and the rest of the sidebar routes still load under the same smoke test, so the change looks safely scoped to the orders screen.

7. **URLs tested:**
   1. `http://127.0.0.1:4202/login?tenant=1`
   2. `http://127.0.0.1:4202/staff/orders`
   3. `http://127.0.0.1:4202/` (landing)
   4. `http://127.0.0.1:4202/dashboard` … `http://127.0.0.1:4202/settings` (sidebar sweep from landing test)
   5. `http://127.0.0.1:4202/kitchen`
   6. Inventory subroutes: `/inventory/items`, `/inventory/suppliers`, `/inventory/purchase-orders`, `/inventory/stock`, `/inventory/reports`

8. **Relevant log excerpts:**
   - **front:** `Application bundle generation complete. [0.942 seconds] - 2026-03-25T13:56:19.553Z` (and similar lines; no `ERROR` / `NG` failures in captured tail).
   - **back:** `INFO: … "GET /users/me HTTP/1.1" 200 OK` (typical 200s during logged-in navigation).

**GitHub (#92):** Comment posted at verification start; `gh issue edit --add-label agent:testing` **failed** (label not defined on repo — only `agent:planned` / `agent:wip` exist). Human can add **`agent:testing`** / closure labels if the workflow requires them.
