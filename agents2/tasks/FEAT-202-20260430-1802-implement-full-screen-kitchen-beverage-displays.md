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
