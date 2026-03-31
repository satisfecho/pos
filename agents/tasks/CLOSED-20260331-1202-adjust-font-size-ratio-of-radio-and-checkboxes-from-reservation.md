# Adjust font size ratio of radio and checkboxes from reservation

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/128

## Problem / goal
In the **Reservations** UI, improve visual balance: **radio buttons and checkboxes** should use a **font size ratio** that matches the rest of the form (readable and consistent with labels). The reporter also asks to **remove a redundant “allergic” textarea**—keep a **single** allergies/allergic free-text field (avoid duplicating the same textarea).

## High-level instructions for coder
- Locate reservation forms (staff/internal and public booking if both show the same controls) and audit styles for **radio** and **checkbox** inputs vs surrounding typography.
- Adjust sizing (and spacing if needed) via existing theme / component SCSS so controls align with design tokens or nearby inputs—no one-off hacks unless the codebase already uses that pattern.
- Remove the **duplicate** allergies textarea; ensure one clear field remains and translations/i18n keys stay consistent.
- Verify in browser (reservation flow) at a typical viewport; check `docker compose` front logs for a clean Angular build after changes.

## Implementation notes (coder)
- **Public `/book`:** One field (`formDietaryNotes`) labeled `RESERVATIONS.CUSTOMER_NOTES` (existing i18n: allergies / special requirements). Submit sets `allergies_has`, `allergies_detail`, and `customer_notes` to the same trimmed value when non-empty.
- **Staff modal:** Same single field; **PUT** clears `customer_notes` / `allergies_detail` with explicit `null` when empty. **Prefill / edit** merge legacy split values via `reservationDietaryNotesFormValue`.
- **Display:** `reservationDietaryNotesDisplay` avoids duplicate lines on cards and reservation-by-token view when DB fields matched.
- **Styles:** `book.component.scss` excludes radio/checkbox from full-width input rule; `reservations.component.ts` inline styles for modal radios.

## Testing instructions
1. **Angular build:** `cd front && npx ng build --configuration=development` (expect success).
2. **Smoke (app on HAProxy, e.g. port 4202):**  
   `cd front && BASE_URL=http://127.0.0.1:4202 npm run test:landing-version`  
   `cd front && BASE_URL=http://127.0.0.1:4202 node scripts/debug-reservations-public.mjs`
3. **Manual:** Open `/book/1` — confirm **one** dietary textarea (no allergy checkbox, no second duplicate field), seating radios readable vs labels. Staff **Reservations** → **New** — same single dietary field; save and confirm card shows a single **Customer notes** / dietary line. Optional: edit a reservation that had only `customer_notes` or split allergies/customer_notes and confirm merge display.
4. **Docker:** If using the front container, `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front` — no Angular compile errors after changes.

---

## Test report

1. **Date/time (UTC):** 2026-03-31 12:07–12:10 (verification window). Log window: same (front container tail captured ~12:07 UTC).
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202` (HAProxy); branch `development` (synced via `./scripts/git-sync-development.sh` before edits).
3. **What was tested:** Items 1–4 under **Testing instructions**; manual `/book/1` and staff **New** modal checks via Puppeteer DOM probes; optional legacy merge display not exercised.
4. **Results:**
   - **Angular build (`ng build --configuration=development`):** **PASS** — completed in ~5.4s, “Application bundle generation complete”, exit 0.
   - **Smoke `npm run test:landing-version`:** **PASS** — “RESULT: Landing version OK; demo login (tenant=1) OK; sidebar nav OK”, exit 0 (~46s).
   - **Smoke `debug-reservations-public.mjs`:** **PASS** — public book flow booked successfully, exit 0.
   - **Manual /book/1 (programmatic DOM):** **PASS** — `#book-dietary` present; `allergyCheckboxCount: 0`; seating radios `3`; computed `font-size` radio `15px` and label `15px` (first seating row). Two form textareas: dietary (`CUSTOMER_NOTES`) + separate `RESERVATION_NOTES` (`#book-notes`); no duplicate allergy field.
   - **Staff Reservations → New modal (logged-in Puppeteer):** **PASS** — modal open; exactly one `#res-modal-dietary`; `allergyCheckboxes: 0`; three seating radios; radio `15px`, label `16px`; three textareas total (dietary + reservation notes + owner notes), consistent with design (no second allergy textarea).
   - **Docker front logs (`logs --tail=80 front`):** **PASS** — rebuild lines show “Application bundle generation complete”; no TypeScript/Angular error lines in the captured window.
   - **Optional (edit + merged display for split legacy fields):** **N/A** — not run; not required for closure per task wording.
5. **Overall:** **PASS**
6. **Product owner feedback:** Reservation forms keep a single customer-facing dietary/allergies text area alongside distinct reservation and owner note fields where applicable. Radio controls align with label text size in both public book and staff modal, improving scanability without layout regressions. Public booking and staff navigation smoke paths still succeed end-to-end.
7. **URLs tested:**
   1. `http://127.0.0.1:4202/`
   2. `http://127.0.0.1:4202/login?tenant=1`
   3. `http://127.0.0.1:4202/dashboard` (and other sidebar targets from landing test)
   4. `http://127.0.0.1:4202/book/1`
   5. `http://127.0.0.1:4202/reservations`
8. **Relevant log excerpts (last section):**

```
pos-front | Application bundle generation complete. [0.565 seconds] - 2026-03-31T12:06:41.136Z
pos-front | Component update sent to client(s).
```

**GitHub:** Comment posted on issue #128; label `agent:testing` is **not** defined in the repo (`gh issue edit` failed: label not found). Maintainer may add labels per `docs/agent-loop.md` if desired.
