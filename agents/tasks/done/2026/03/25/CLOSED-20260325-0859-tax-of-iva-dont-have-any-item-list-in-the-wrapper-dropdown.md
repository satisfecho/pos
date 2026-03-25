---
## Closing summary (TOP)
- **What happened:** Settings -> Contact information `Tax of iva` dropdown rendered as an empty wrapper with no IVA options.
- **What was done:** Ensured the backend provides default IVA/tax options for the tenant and the settings UI maps them into `default_tax_id` correctly.
- **What was tested:** Puppeteer confirmed the settings tax dropdown is populated and includes `IVA 10%` (PASS).
- **Why closed:** Pass/fail criteria met (dropdown non-empty and IVA present) with no relevant UI errors.
- **Closed at (UTC):** 2026-03-25 09:26
---

# Tax of IVA dropdown has no items in Settings > Contact information

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/79

## Problem / goal
In `Settings > Contact information`, the **“Tax of iva”** field shows the dropdown wrapper, but the dropdown option list is empty. The UI should normally offer IVA options (e.g. **10%**).

## High-level instructions for coder
- Reproduce the issue locally and confirm whether the dropdown is empty because:
  - the backend/API returns no IVA options, or
  - the frontend fails to load or render the options, or
  - the frontend maps the received data into the dropdown incorrectly.
- Trace the data flow for the “Tax of iva” field:
  - frontend component → API/store action → backend endpoint/serializer → database/config/seed.
- Verify that the expected IVA option(s) exist in data for the tenant(s) used in dev/demo.
- Ensure the dropdown handles loading/empty states correctly and still shows the available options when data exists.
- Add/adjust automated coverage for the settings form (API-level test if available; otherwise at least a UI smoke test) so this regression is caught.

## Testing instructions
### What to verify
- In `Settings → Contact information`, the `default_tax_id` / “Tax of iva” dropdown is populated and not empty.
- The dropdown includes at least one IVA option, ideally `IVA 10%`.

### How to test
1. Make sure the POS stack is running (frontend reachable via HAProxy, typically `http://127.0.0.1:4202`).
2. Run the UI smoke test:
   - `BASE_URL=http://127.0.0.1:4202 HEADLESS=1 node front/scripts/test-settings-contact-tax-dropdown.mjs`
3. Manual repro (for the originally reported empty dropdown case):
   - Log in to a tenant that currently has no taxes rows (or create a new tenant and go directly to Settings).
   - Open `Settings → Contact information`.
   - The backend should auto-seed default Spanish IVA taxes on first `/taxes` load, and the dropdown should populate without needing a manual seed step.

### Pass/fail criteria
- PASS if `Settings → Contact information → Tax of iva` contains IVA options and matches at least one of:
  - `IVA 10%` (preferred), or
  - any `IVA <number>%` option.
- FAIL if the dropdown is empty (only the “No default tax” option is present) or if the page errors.

## Test report
Date/time (UTC) and log window:
- Start: `2026-03-25 09:22:08 UTC`
- End: `2026-03-25 09:23:04 UTC`

Environment:
- Branch: `development`
- Compose: `docker-compose.yml` + `docker-compose.dev.yml`
- `BASE_URL`: `http://127.0.0.1:4202`
- Puppeteer: `HEADLESS=1`
- Tenant: `1`

What was tested:
- `Settings → Contact information → Tax of iva` dropdown (`select#default_tax_id`) is populated (not an empty wrapper).
- Dropdown includes at least one IVA option, ideally `IVA 10%`.

Results:
- `default_tax_id` dropdown populated (non-empty): PASS
  - Evidence: test printed `>>> RESULT: Settings contact default tax dropdown populated.` and exited `0`.
- Includes `IVA 10%`: PASS
  - Evidence: test checks the option texts for `/IVA\s*10%/i` and exited `0`.

Overall: PASS

Product owner feedback:
The Settings > Contact information “Tax of iva” dropdown now correctly loads IVA options for the tenant and is not rendered as an empty wrapper. This should prevent users from being blocked when selecting a tax rate.

URLs tested:
1. `http://127.0.0.1:4202/login?tenant=1`
2. `http://127.0.0.1:4202/settings`

Relevant log excerpts (container logs; last window):
```text
pos-back  | INFO:     172.30.0.3:52224 - "GET /tenant/settings HTTP/1.1" 200 OK
pos-back  | INFO:     172.30.0.3:52242 - "GET /tenant/settings HTTP/1.1" 200 OK
pos-back  | INFO:     172.30.0.3:52242 - "GET /tenant/settings HTTP/1.1" 200 OK
pos-back  | INFO:     172.30.0.3:52224 - "GET /tenant/settings HTTP/1.1" 200 OK
pos-back  | INFO:     172.30.0.3:52224 - "GET /taxes?current_only=false HTTP/1.1" 200 OK
```

`pos-front`: no `error|exception|TS*|NG*`-matching lines observed in the sampled window during this test run.

