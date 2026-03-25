# Download all my data

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/96

## Problem / goal

Tenant owners need **Settings** controls for **data lifecycle and ownership**: export/download all tenant data; a clearly marked **danger zone** to delete all tenant data; and a way to **promote another user to co-owner** of the restaurant. Separately, the team wants to **purge demo tenants** (ids **2, 3, 4, 5, 6, 7**) so those restaurants can be cleaned up. Align export/delete semantics with privacy expectations, role permissions, and any existing tenant/user models; see `docs/` for auth, tenant, and GDPR-style data handling if present.

## High-level instructions for coder

- Design **export “download all my data”** (scope: one tenant; formats; async job vs direct download; what entities are included — orders, reservations, users, settings, files).
- Add **Settings UI** for **delete all tenant data** with strong **danger zone** styling, confirmation, and irreversibility warnings; ensure only appropriate roles can trigger it and audit/log if the product already supports it.
- Implement **additional owner** (or co-owner) assignment from Settings with clear rules (limits, self vs other users, email lookup).
- Plan **one-off or scripted cleanup** for demo tenants **2–7** (coordinate with DB/migrations/seeds); do not conflate with production safety — use explicit tenant ids and safeguards.
- Add or extend **tests/smoke** for the new flows where the repo pattern allows (API + critical UI paths).
