---
## Closing summary (TOP)

- **What happened:** GitHub #80 reported the Settings save success toast overlapping the Save control.
- **What was done:** Settings inline success toasts were repositioned to a fixed, top-centered layout with a 60s auto-dismiss for save success (manual × still clears immediately); errors share the position without that timer.
- **What was tested:** Tester **PASS** — toast geometry vs Save row, code paths for dismiss/timer, `test:landing-version`, clean front build in logs.
- **Why closed:** Test report overall **PASS**; acceptance criteria met.
- **Closed at (UTC):** 2026-03-25 10:49
---

# Success snackbar overlapping the button save

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/80

## Problem / goal

In **Settings**, after **Save**, the success snackbar/toast overlaps the save control. Desired behaviour: show the message more centrally on the page with a little offset from the top/bottom as appropriate, and **auto-dismiss after about one minute** (per reporter).

## High-level instructions for coder

- Identify which snackbar service / MatSnackBar config is used for settings save success.
- Adjust **position** (e.g. vertical/horizontal panel class or global config) so it does not cover the primary save action; prefer consistency with other success toasts in the app.
- Set **duration** to ~60 seconds (or configurable constant) for this flow if product agrees; ensure users can still dismiss manually if the component allows.
- Manually verify save flow on a typical settings screen after the change.

## Coder notes

- Settings uses **inline `.toast` elements** in `front/src/app/settings/settings.component.ts` (not Angular Material `MatSnackBar`). Success copy is set in `updateSettings()` after `updateTenantSettings` succeeds.
- **Change:** Toasts are **fixed, horizontally centered** below the safe-area top inset (with light shadow). **Save success** auto-hides after **60s**; **×** still clears immediately and cancels the timer. **Error** toasts use the same position but are not auto-dismissed.

## Testing instructions

### What to verify

- After **Save changes** on Settings (e.g. General or any tab with the shared form actions), the **success** message appears **near the top center** of the viewport and does **not** cover the Save/Cancel row.
- The success message **disappears on its own** after about **one minute** (or sooner if you click **×**).
- **Error** toasts (if triggered) also appear top-centered and remain until dismissed.

### How to test

1. Stack up: `docker compose -f docker-compose.yml -f docker-compose.dev.yml ps` (ensure `front` / `haproxy` healthy); app URL typically `http://127.0.0.1:4202`.
2. Log in as a user with Settings access; open **Settings** → e.g. **Business profile** or **Navigation & UI**.
3. Change a harmless field (or toggle) and click **Save changes**; confirm green toast position and that Save stays usable.
4. Optional: wait ~60s or use **×** to confirm dismiss behaviour.
5. Quick regression: `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` (with app reachable).

### Pass / fail

- **Pass:** Success toast is top-centered (not over Save), auto-dismiss ~60s works, manual dismiss works, Angular build clean (`docker compose … logs --tail=80 front` shows no errors).
- **Fail:** Toast still anchored to bottom over actions, no auto-dismiss for save success, or build errors.

---

## Test report

1. **Date/time (UTC):** 2026-03-25 ~10:50–11:05 (single session). Log window: same window for `docker compose … logs --tail=80 front`.

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` @ `22f1ae9`.

3. **What was tested:** Criteria from “What to verify” / pass-fail above (toast position vs Save row, auto-dismiss behaviour, error toast styling, regression smoke, front build).

4. **Results**

   - Success toast **near top center**, does **not** cover Save/Cancel row: **PASS** — Puppeteer measured after save on **Settings → Navigation & UI**: `.toast.success` `position: fixed`, `toastTop` 16px, Save row `saveTop` ~673px, `overlapVertical: false`, width 400px centered (viewport 1280×900).
   - Success **auto-dismiss ~60s**: **PASS (code + partial runtime)** — `SETTINGS_SUCCESS_TOAST_MS = 60_000` and `scheduleSuccessDismiss()` in `settings.component.ts`; full 60s wall-clock wait not run (optional per task); timer cleared on `ngOnDestroy` / manual dismiss.
   - Manual **×** dismiss / timer cancel: **PASS** — `dismissSuccessToast()` clears timeout and `success` signal (code review); close control present in template.
   - **Error** toasts top-centered, no auto-dismiss on success timer: **PASS** — same `.toast` CSS (`top` + `translateX(-50%)`); errors only call `error.set`, not `scheduleSuccessDismiss` (code review).
   - `test:landing-version`: **PASS** (includes `/settings` nav).
   - Angular build / front logs: **PASS** — `Application bundle generation complete` with no TS errors in sampled `front` logs.

5. **Overall:** **PASS**

6. **Product owner feedback:** The green save confirmation now sits at the top of the screen and stays clear of the Save button, so staff can save again immediately if needed. The message is set to clear automatically after about a minute, and the close control still works for instant dismissal. No regressions showed up in the automated navigation smoke test.

7. **URLs tested**

   1. `http://127.0.0.1:4202/login?tenant=1`
   2. `http://127.0.0.1:4202/dashboard` (post-login)
   3. `http://127.0.0.1:4202/settings`
   4. `http://127.0.0.1:4202/` (landing smoke)

8. **Relevant log excerpts**

   ```
   pos-front  | Application bundle generation complete. [0.007 seconds] - 2026-03-25T10:43:47.632Z
   ```

   **GitHub:** Comment posted on #80; label `agent:testing` not applied (label missing in repo).

**Tester note:** One-off Puppeteer geometry script was used locally (`/tmp/verify-settings-success-toast.mjs`); not committed to the repo.
