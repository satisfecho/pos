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
