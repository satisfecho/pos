# Full screen for Kitchen and Beverage displays

## GitHub Issues

- **Issue:** https://github.com/satisfecho/pos/issues/202
- **202**

## Problem / goal

Staff Kitchen and Beverage display views should enter **browser fullscreen** when the user activates them (e.g. explicit click or tap on the display entry point), so wall-mounted or dedicated screens can use the whole monitor without manual browser chrome manipulation.

Use the **Fullscreen API** with the usual vendor fallbacks where needed (Safari / legacy Edge). Fullscreen must be tied to a **user gesture** where the browser requires it; avoid assuming `DOMContentLoaded` alone will succeed everywhere.

Optional ops note (out of scope for pure web fix): dedicated kiosks can use **`--start-fullscreen`** / **`--kiosk`** from the OS launcher—document briefly in README or staff docs only if the implementation team finds it helpful; do not treat that as a substitute for in-app fullscreen where the product expects it.

## High-level instructions for coder

- Locate Angular routes or components for **Kitchen** and **Beverage** displays (staff-facing).
- Add a clear control (or reuse the display open action) that calls `requestFullscreen` on the appropriate root element (container or `document.documentElement` per UX), with prefixed variants where required.
- Handle **exit** fullscreen (e.g. `document.exitFullscreen` + prefixes, Escape behavior, navigation away).
- Verify behavior on at least one Chromium-based browser and Safari if available; note limitations in **Testing instructions** when handing off.
- Add or extend **i18n** strings if any new UI label is introduced for “full screen” / “exit full screen”.
- Run smoke relevant to those routes (manual or existing Puppeteer if applicable).

## Implementation summary

- **`KitchenDisplayComponent`** (`/kitchen`, `/bar`): template ref on root `.kitchen-view`, header button **`data-testid="kitchen-fullscreen-toggle"`** calls `requestFullscreen` on that element (fallback `document.documentElement` if ref missing). Vendor fallbacks: `webkit*`, `moz*`, `ms*`. `fullscreenchange` + prefixed listeners update `isFullscreen`; `ngOnDestroy` removes listeners and calls `exitFullscreen` when a fullscreen element is present.
- **i18n:** `COMMON.ENTER_FULLSCREEN`, `COMMON.EXIT_FULLSCREEN` in all `front/public/i18n/*.json`.
- **Tests:** `kitchen-display.component.spec.ts` — extended API mocks (`getKitchenStations`, `getKitchenDisplaySettings`), `PermissionService` stub, category-aware order filter fixture, fullscreen toggle test.

## Testing instructions

1. Log in as staff with **kitchen/bar** access (module `kitchen_bar` enabled).
2. Open **`/kitchen`**. In the header, click **Full screen** (icon + label). The display root should fill the monitor; the control should show **Exit full screen**.
3. Leave fullscreen via the button, **Escape**, or **Back to orders** (route leave should tear down fullscreen).
4. Repeat on **`/bar`** (beverage display) — same control and behavior.
5. **Browsers:** **Chromium** — expected full support. **Safari (desktop)** — uses WebKit-prefixed APIs (implemented). **iOS Safari** — element fullscreen is often unavailable; the API may no-op without error; use OS kiosk / PWA if required.
6. **Automated (from `front/`):**  
   `npx ng test --no-watch --browsers=ChromeHeadless --include=src/app/kitchen-display/kitchen-display.component.spec.ts`
7. Confirm **Angular build** clean: `docker logs --since 10m pos-front` (no `TS`/`NG` errors) after edits.
