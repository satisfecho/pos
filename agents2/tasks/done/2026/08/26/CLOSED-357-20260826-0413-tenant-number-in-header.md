---
## Closing summary (TOP)

- **What happened:** Issue #357 asked staff to see the tenant id in the top-left header next to version and commit hash.
- **What was done:** The staff sidebar `.version` line now shows the logged-in user's `tenant_id` after the commit hash, with a compact "Tenant ID" tooltip; public pages are unchanged.
- **What was tested:** Tester verified staff login on tenant 1, sidebar shows version/hash/tenant id, tooltip, no tenant id on public routes, no Angular build errors, landing smoke PASS.
- **Why closed:** All pass–fail criteria met per tester report.
- **Closed at (UTC):** 2026-08-26 04:19
---

# Show tenant number in staff header

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/357
- **357**

## Problem / goal

Staff and support need to see which tenant they are logged into without opening settings. Show the **tenant id** (tenant number) in the top-left header next to the app version and git commit hash.

Issue text: *"Add tenant number behind version in top left header where github version is shown."*

## High-level instructions for coder

- **Where:** Staff sidebar header in `front/src/app/shared/sidebar.component.ts` — the `.version` line already shows `{{ version }}` and `{{ commitHash }}` (from `environment`). Add the tenant number there (e.g. after the commit hash).
- **Data:** Use the logged-in user's `tenant_id` from `ApiService` / current user (same source as `tenantOrgName()` and nav scoping). Show only when `tenant_id` is set (staff tenant context).
- **UX:** Keep it compact and unobtrusive (small text, same style family as `.commit-hash`). Optional `title` tooltip e.g. "Tenant ID" if helpful. No i18n required for a numeric id unless product prefers a short label.
- **Scope:** Staff layout sidebar (desktop + mobile header if the version line is mirrored elsewhere). Do not expose tenant id on public/marketing pages unless the issue is extended.
- **Verify:** Log in as a staff user on a known tenant → header shows version, commit hash, and tenant number. `docker logs pos-front` — no Angular build errors. Quick smoke: `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front`.

## Testing instructions

1. Log in as a staff user on a known tenant (e.g. tenant 1 demo user).
2. Open any staff page with the sidebar visible (desktop width).
3. In the top-left sidebar header, confirm the version line shows: app version, commit hash, and tenant id (e.g. `1`) after the hash.
4. Hover the tenant id — tooltip should read "Tenant ID".
5. Confirm the tenant id does **not** appear on public pages (landing, `/book/1`, etc.).
6. `docker logs --since 5m pos-front` — no Angular build errors.
7. Smoke: `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` (passes as of 2026-08-26).

## Test report

**Date/time (UTC):** 2026-08-26 04:16–04:18 UTC (log window: last 10m on `pos-front`)

**Environment:** `docker-compose.yml` + `docker-compose.dev.yml`, `BASE_URL=http://127.0.0.1:4202`, branch `development` @ `4349db7f`

**What was tested:** Tenant id in staff sidebar header (version line); tooltip; absence on public pages; Angular build health; landing smoke with staff login.

**Results:**

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | Staff login on tenant 1 | **PASS** | Demo user logged in at `/login?tenant=1` → `/dashboard` |
| 2 | Sidebar version line shows version, commit hash, tenant id | **PASS** | `.version` text: `2.1.157 c2ab1c04` + `.tenant-id` text `1` |
| 3 | Tenant id tooltip "Tenant ID" | **PASS** | `title="Tenant ID"` on `.tenant-id` span |
| 4 | Tenant id absent on public pages | **PASS** | `/`, `/book/1`, `/features`: `.tenant-id` count 0, no sidebar |
| 5 | No Angular build errors (`pos-front` logs) | **PASS** | Only NG8107 warnings; no TS/NG errors or bundle failures |
| 6 | Landing smoke with login | **PASS** | `npm run test:landing-version` exit 0; sidebar nav OK |

**Overall:** **PASS**

**Product owner feedback:** The tenant id appears compactly after the commit hash in the staff sidebar, matching the issue ask. Support staff can see tenant context without opening settings. Public pages stay unchanged.

**URLs tested:**

1. http://127.0.0.1:4202/login?tenant=1
2. http://127.0.0.1:4202/dashboard
3. http://127.0.0.1:4202/
4. http://127.0.0.1:4202/book/1
5. http://127.0.0.1:4202/features

**Relevant log excerpts:**

```
# test:landing-version (exit 0)
>>> RESULT: Landing version OK; demo restaurant card OK; demo login (tenant=1) OK; sidebar nav OK.

# pos-front (last 10m) — no "Application bundle generation failed" or TS/NG errors
# NG8107 optional-chain warnings only (unrelated to this change)
```
