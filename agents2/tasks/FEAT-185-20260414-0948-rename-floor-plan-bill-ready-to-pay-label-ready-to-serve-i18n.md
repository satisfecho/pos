# Rename floor-plan “Bill / ready to pay” label to “Ready to serve” (i18n only)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/185
- **185**

## Problem / goal
On the table floor plan, the purple operational state uses API `operational_status` `bill_issued` when there is an active order with `Order.status == ready`. That reflects kitchen/order ready, not payment due. Staff confusion comes from user-visible copy.

Update translations so the legend and any UI using the same i18n key clearly mean food/order ready for service. Primary English wording: **Ready to serve** (replace “Bill / ready to pay”). Align other locales with natural equivalents (e.g. Spanish “Listo para servir”, German “Servierbereit”, etc.)—same meaning, not literal “bill.”

Do **not** rename backend/API enum values unless product asks later; keep `bill_issued` as-is; **translation strings only** (key `TABLES.OP_BILL_ISSUED` per issue).

## High-level instructions for coder
- Update **`front/public/i18n/en.json`**: set `TABLES.OP_BILL_ISSUED` to **Ready to serve** (or the agreed primary string).
- Update **all other locale files** that define this key (`es.json`, `ca.json`, `de.json`, `fr.json`, `bg.json`, `zh-CN.json`, `hi.json`, and any others in the repo that include `TABLES.OP_BILL_ISSUED`) with consistent natural translations.
- Verify the **floor plan legend** and **table properties / badges** that resolve `operationalStatusLabelKey` → `TABLES.OP_BILL_ISSUED` show the new copy everywhere.
- No backend or TypeScript enum/API renames required for this UX fix unless explicitly expanded later.
- After changes, run the usual frontend build check / smoke as per project conventions.
