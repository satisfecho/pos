---
## Closing summary (TOP)

- **What happened:** The landing route triggered Angular **NG0200** because **`authInterceptor`** synchronously injected **`ApiService`** while **`HttpClient`** was still wiring interceptors, creating a DI cycle often attributed to **`Standalone[_LandingComponent]`**.
- **What was done:** The interceptor now injects only **`Injector`** at setup and resolves **`ApiService`** inside the **401** handling path via **`injector.get(ApiService)`**, matching the deferred pattern used elsewhere (e.g. accept-language flow). Change is in **`front/src/app/auth/auth.interceptor.ts`** (coder notes retained below).
- **What was tested:** Landing **`/`** and **`/login`** consoles showed **no NG0200**; **`npm run test:landing-version`** (Puppeteer: landing, demo login, sidebar/inventory nav) exited **0** — **overall PASS** per test report.
- **Why closed:** All pass/fail criteria met; tester signed off **PASS** with documented evidence.
- **Closed at (UTC):** 2026-03-26 09:07
---

# Circular dependency (NG0200 / ApiService)

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/100

## Problem / goal

The browser console shows **`RuntimeError: NG0200: Circular dependency detected for _ApiService`**, with the source reported as **`Standalone[_LandingComponent]`** (Angular v21 NG0200). The app should load the landing (and the rest of the SPA) without this DI cycle. Reproduce in local Chrome DevTools console, then eliminate the circular provider graph around **`ApiService`** and anything **`LandingComponent`** pulls in.

## High-level instructions for coder

- Reproduce on **`/`** (landing): confirm **NG0200** and note the full **`ngTokenPath`** in DevTools.
- Trace **`ApiService`** constructor / `providedIn` / imports and **`LandingComponent`** (and its standalone imports) to find the injection loop (often interceptors ↔ services ↔ **`HttpClient`** patterns; compare the fixed **`LanguageService`** / `accept-language.interceptor` pattern in **`docs/`** or closed feedback tasks).
- Refactor so **`ApiService`** (or the dependent that closes the loop) is not part of a cycle—e.g. lazy injection (`Injector`), `forwardRef`, splitting a thin HTTP layer from higher-level services, or moving side effects out of construction.
- Verify landing and a staff route (e.g. login) load without console **NG0200**; run a relevant Puppeteer smoke test if one covers landing or login.

## Coder notes

- **Root cause:** `authInterceptor` called `inject(ApiService)` synchronously when the interceptor ran. `ApiService` injects `HttpClient`; building the client runs interceptors before `ApiService` construction finishes → **NG0200** (often surfaced when `LandingComponent` first pulls in `ApiService`).
- **Fix:** Inject `Injector` only at interceptor setup; call `injector.get(ApiService)` inside the `catchError` path when a 401 is handled (same deferral idea as `accept-language.interceptor` + `LanguageService`).
- **Code:** `front/src/app/auth/auth.interceptor.ts`

---

## Testing instructions

### What to verify

- Open **`/`** (landing) in Chrome: DevTools console must **not** show **`NG0200`** / circular dependency for **`ApiService`**.
- Staff flow: **`/login`** loads and login still works (401 refresh / logout paths in the interceptor unchanged logically).

### How to test

1. Local stack: `docker compose -f docker-compose.yml -f docker-compose.dev.yml` (app on **`http://127.0.0.1:4202`**).
2. Manual: load **`http://127.0.0.1:4202/`**, open console, confirm no **NG0200**; optionally log in and hit a protected route.
3. Puppeteer (landing + login + sidebar): from repo root or `front/`:
   ```bash
   BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front
   ```
   (Uses env credentials when present for demo login.)

### Pass / fail criteria

- **Pass:** No **NG0200** on landing; `test:landing-version` exits **0**.
- **Fail:** Any **NG0200** in console on `/`, or smoke test failure / regression on auth refresh behavior.

---

## Test report

1. **Date/time (UTC) and log window:** Started ~**2026-03-26 09:04 UTC**; verification completed ~**2026-03-26 09:06 UTC**. Docker `front` / `back` logs reviewed for the same window.

2. **Environment:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml` (stack up: `pos-haproxy` **0.0.0.0:4202→4202**). **`BASE_URL`:** `http://127.0.0.1:4202`. **Branch:** `development` @ **`27a8575`**.

3. **What was tested:** Landing `/` console free of **NG0200** / **ApiService** circular dependency; staff path **`/login`** loads; **`npm run test:landing-version`** (Puppeteer: landing → demo login → sidebar + inventory nav).

4. **Results:**
   - **Landing console (no NG0200):** **PASS** — Chrome DevTools session: navigated to `/`; **error**/**warn** console filters: **no messages**; full console: only a minor **issue** (form field id/name), **no NG0200** / **ApiService**.
   - **`/login` console:** **PASS** — No **NG0200**; no blocking errors observed.
   - **`test:landing-version`:** **PASS** — Exit code **0**; script reported demo login (tenant=1) OK and all top-level + inventory sublinks navigated.
   - **Auth / interceptor regression (smoke-level):** **PASS** — Same script completes full login and protected-route navigation without failure (WS token noise noted in script output only; not a test failure).

5. **Overall:** **PASS**

6. **Product owner feedback:** The landing and post-login staff shell load cleanly without the previous Angular **NG0200** injection cycle. The automated landing + navigation smoke test gives good regression coverage for the interceptor-related change; no action needed beyond normal release cadence.

7. **URLs tested:**
   1. `http://127.0.0.1:4202/`
   2. `http://127.0.0.1:4202/login?tenant=1`
   3. (via Puppeteer, among others) `http://127.0.0.1:4202/dashboard`, `/my-shift`, `/staff/orders`, `/reservations`, `/guest-feedback`, `/tables`, `/kitchen`, `/bar`, `/customers`, `/products`, `/catalog`, `/reports`, `/working-plan`, `/users`, `/contracts`, `/settings`, `/inventory/items`, `/inventory/suppliers`, `/inventory/purchase-orders`, `/inventory/stock`, `/inventory/reports`

8. **Relevant log excerpts:**
   - **Front (build healthy after reload):** `Application bundle generation complete. [0.253 seconds] - 2026-03-26T09:02:18.785Z` / `Page reload sent to client(s).` (`docker compose … logs --tail=40 front`).
   - **Puppeteer stdout:** `>>> RESULT: Landing version OK; demo login (tenant=1) OK; sidebar nav OK.`

**GitHub:** Comment posted on **#100** (verification started). **`gh issue edit … --add-label agent:testing`** failed: label **`agent:testing`** is not defined on the repo; add the label in GitHub settings if automation should set it.

