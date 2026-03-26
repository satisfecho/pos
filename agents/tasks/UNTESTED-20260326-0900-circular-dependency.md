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
