# Add Urdu (ur) as a fully supported language across POS

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/205
- **205**

## Problem / goal
Users must be able to select Urdu (“اردو”) from the language switcher and see the full product—frontend, public flows, staff areas, backend messages, emails, exports—in Urdu with correct RTL layout. No missing keys vs English; no English leakage when Urdu is active.

## High-level instructions for coder
- **Frontend:** Register `ur` in `language.service.ts` (`SUPPORTED_LANGUAGES`, normalization, browser/`Accept-Language` handling). Add `front/public/i18n/ur.json` with **1:1 key parity** vs `en.json` (same structure and placeholders). Extend language-picker and any hardcoded admin lists if present.
- **RTL:** In `LanguageService.applyLanguage()`, set `document.documentElement.dir` to `rtl` for RTL codes (start with `ur` in a small extensible list) and `ltr` otherwise, alongside `lang`. Prefer logical CSS (`margin-inline-*`, `text-align: start/end`) for obvious fixes; spot-check major routes (landing, auth, dashboard, floor, orders, reservations, public book/menu, feedback, settings, reports). Avoid full global refactor; note intentional arrow/icon exceptions in PR if needed.
- **Backend:** Add `ur` to `back/app/language_service.py` and mirror every message key in `messages.py`, `report_export_i18n.py`, `schedule_export_i18n.py`, and any other `*_i18n` modules (search for existing language blocks like `_HI` / `"hi":` to find all).
- **Docs/tests:** Update README supported-language list if present; `docs/0012-translation-implementation.md` if it lists languages; `CHANGELOG.md` `[Unreleased]`. Frontend build clean; `pytest` for language-related modules; `test:landing-version` smoke.
- **Out of scope:** Translating restaurant-owned menu or custom content—platform strings only.

## Testing instructions

### What was changed
- **Frontend:**
  - `front/src/app/services/language.service.ts`: registered `ur` (label `اردو`, locale `ur-PK`); new `RTL_LANGUAGES = ['ur']`; `applyLanguage()` now sets `document.documentElement.dir = 'rtl' | 'ltr'` alongside `lang`; new `isRtl(): boolean`.
  - `front/src/app/shared/intl-locale.ts`: added `ur → ur-PK` mapping for Intl number/date formatting.
  - `front/public/i18n/ur.json`: new file, **1:1 key parity** with `en.json` (1873 keys), all `{{placeholders}}` preserved.
- **Backend:**
  - `back/app/language_service.py`: added `"ur"` to `SUPPORTED_LANGUAGES`; `normalize_language_code` already handles `ur`, `ur-PK`, `UR`, `ur_PK`.
  - `back/app/messages.py`: full `"ur": { … }` block; 85/85 keys vs `en` (parity verified).
  - `back/app/report_export_i18n.py`: full `_UR` block + `"ur": _UR` in `_LABELS` (parity verified).
  - `back/app/schedule_export_i18n.py`: full `_UR` block + `_PVA_UR` block + `"ur"` registered in `_LABELS` and `_PVA_LABELS` (parity verified).
- **Docs:** `docs/0012-translation-implementation.md` adds Urdu and an RTL section; `README.md` lists `ur` (RTL); `CHANGELOG.md` `[Unreleased]` entry.

### Frontend smoke (manual, browser)
1. Open `http://127.0.0.1:4202/` (front container must be **restarted once** after `ur.json` is first added, so the Angular dev-server registers the new asset: `docker compose -f docker-compose.yml -f docker-compose.dev.yml restart front`).
2. Confirm `/i18n/ur.json` returns **200**: `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4202/i18n/ur.json`.
3. In the language picker (top of landing, login, settings) pick **اردو**.
4. Confirm:
   - `document.documentElement.lang === 'ur'`
   - `document.documentElement.dir === 'rtl'` (page is mirrored RTL)
   - Landing hero title shows **آپ کا ریستوران، جڑا ہوا**, subtitle in Urdu.
   - `/login` shows **خوش آمدید**, **اپنے اکاؤنٹ میں سائن ان کریں**, password / email / Sign In labels in Urdu.
   - No raw `KEY.PATH` strings appear.

### Frontend smoke (automated)
```bash
# from repo root
cd front
BASE_URL=http://127.0.0.1:4202 HEADLESS=1 npm run test:landing-version   # baseline: landing renders OK
```
Ad-hoc Urdu RTL test (drop-in script that sets `pos_language=ur` and verifies `dir=rtl` + Urdu glyphs on landing & login). The exact recipe used during this task:
```bash
node -e '
const puppeteer = require("puppeteer-core");
const path = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
(async () => {
  const b = await puppeteer.launch({ headless: true, executablePath: path, args: ["--no-sandbox"] });
  const p = await b.newPage();
  await p.goto("http://127.0.0.1:4202/", { waitUntil: "networkidle2" });
  await p.evaluate(() => localStorage.setItem("pos_language", "ur"));
  await p.goto("http://127.0.0.1:4202/", { waitUntil: "networkidle2" });
  await new Promise(r => setTimeout(r, 1500));
  const info = await p.evaluate(() => ({
    lang: document.documentElement.lang,
    dir:  document.documentElement.dir,
    title: document.querySelector(".landing-hero__title")?.textContent?.trim()
  }));
  console.log(info);
  await b.close();
})();
' # run from `front/` so puppeteer-core resolves; expect lang=ur, dir=rtl, Urdu title.
```

### Backend smoke
```bash
# Inside back container:
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python3 -c "
from app.language_service import SUPPORTED_LANGUAGES, normalize_language_code
from app.messages import MESSAGES
from app.report_export_i18n import report_export_labels
from app.schedule_export_i18n import schedule_export_labels, planned_vs_export_labels

assert 'ur' in SUPPORTED_LANGUAGES
assert normalize_language_code('ur-PK') == 'ur'
assert set(MESSAGES['en'].keys()) == set(MESSAGES['ur'].keys())
assert set(report_export_labels('en').keys()) == set(report_export_labels('ur').keys())
assert set(schedule_export_labels('en').keys()) == set(schedule_export_labels('ur').keys())
assert set(planned_vs_export_labels('en').keys()) == set(planned_vs_export_labels('ur').keys())
print('Urdu backend parity OK')
"
```
Expect: **`Urdu backend parity OK`**.

API behaviour check (`?lang=ur` and `Accept-Language: ur-PK`):
```bash
curl -s -X POST "http://127.0.0.1:4202/api/token?lang=ur" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data 'username=nobody@amvara.de&password=wrong'
# => {"detail":{"code":"incorrect_username_or_password","message":"غلط صارف نام یا پاس ورڈ"}}

curl -s -X POST "http://127.0.0.1:4202/api/token" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H 'Accept-Language: ur-PK' \
  --data 'username=nobody@amvara.de&password=wrong'
# => same Urdu message
```

### Backend pytest
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back \
  python3 -m pytest -q --no-header tests/test_report_export_i18n.py tests/test_schedule_export.py \
  tests/test_registro_horario_excel.py tests/test_reservation_email_template.py
# Result: 24 passed.
```
Full pytest run shows **198 passed / 7 failed** — all 7 failures are a pre-existing `sqlalchemy.exc.CompileError: Compiler … can't render element of type JSONB` (SQLite test DB can’t map Postgres `JSONB`); the same 7 tests fail on a clean tree without these changes. Not caused by this task.

### Parity / leakage notes
- `ur.json` ↔ `en.json`: missing 0, extra 0 (1873 keys, all `{{placeholders}}` preserved).
- `messages['ur']` ↔ `messages['en']`: missing 0, extra 0 (85 keys, including all five `reservation_*` keys for full parity).
- Report/schedule/planned-vs-actual labels: missing 0, extra 0 each.
- Some technical terms / proper nouns (URL, PIN, OTP, Google, …) remain in Latin script, as is standard in Urdu UIs.

### Dev-only gotcha
When `ur.json` is **first** added, restart the front container once so the Angular dev-server registers the new asset (returns 200 on `/i18n/ur.json`). Production builds via the regular Docker image do not need this.

