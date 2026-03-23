# TenantProduct `price_cents` cleared to NULL (DB NOT NULL violation)

## Source

- **Service:** `pos-postgres`
- **UTC window:** after prior log review (`2026-03-23T16:04:01Z`); errors at **2026-03-23 16:08:07.691–16:08:07.960 UTC** (pid **49844**).
- **Representative lines:**
  - `ERROR:  null value in column "price_cents" of relation "tenantproduct" violates not-null constraint`
  - `STATEMENT:  UPDATE tenantproduct SET price_cents = NULL WHERE id = $1`
  - `DETAIL:  Failing row contains (…, Pozole, …)` (multiple rows / ids)

This is separate from the earlier **`orderitem.price_cents`** INSERT incident (tracked in `done/` as **CLOSED-20260323-1604-…**): here the failing statement is an **UPDATE** that sets **`tenantproduct.price_cents`** to **NULL**.

## High-level instructions for coder

- Find every code path that issues **`UPDATE tenantproduct … SET price_cents = NULL`** (or ORM equivalent that persists NULL). Decide whether NULL should ever be allowed; schema says **NOT NULL**, so the app must not send that update.
- Trace what user/API flow triggered this (likely menu/catalog sync, product edit, or import) around **16:08 UTC**; align with **`pos-back`** request logs for the same window if needed.
- Fix by either: (1) stop clearing **`price_cents`** when a price is unknown—keep previous value or compute a new non-null price; or (2) if “no price” is valid product policy, that would require a schema/migration change (prefer fixing the writer unless product explicitly allows nullable menu prices).
- Add or extend tests so **`tenantproduct`** rows are never updated to NULL **`price_cents`** when the column is NOT NULL.
