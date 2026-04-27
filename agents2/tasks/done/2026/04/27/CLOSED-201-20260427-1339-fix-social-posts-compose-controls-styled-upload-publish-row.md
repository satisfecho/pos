---
## Closing summary (TOP)

- **What happened:** GitHub issue #201 requested restyling the Settings → Marketing → Social posts composer: hidden native file picker, styled image upload with preview, and a normal inline “Publish immediately” row instead of an oversized checkbox and highlighted strip.
- **What was done:** Implementation aligned the compose UI with other settings forms (hidden `#social-posts-file`, button + filename + dashed preview, Remove/Change flow) and flattened publish-immediately into `.publish-now-inline` with standard checkbox sizing and no decorative border strip; Connected networks (Meta) section left intact.
- **What was tested:** Tester ran the full Testing instructions on Docker dev (port 4202): navigation, DE locale upload flow, DOM/computed styles for publish row, Meta card sanity, and `pos-front` bundle logs — **overall PASS**.
- **Why closed:** Test report **PASS**; criteria in the task satisfied; no further rework requested.
- **Closed at (UTC):** 2026-04-27 13:46
---

# Fix Social posts compose controls: styled file upload + “Publish immediately” row

## GitHub Issues

- **Issue:** https://github.com/satisfecho/pos/issues/201
- **201**

## Problem / goal

On **Settings → Marketing → Social posts**, replace the native **Choose File** control with a styled upload (button, filename, image preview after selection), consistent with other forms in the app. Fix **Publish immediately**: use a normal-size checkbox with the label inline and left-aligned on one row; remove the oversized centered checkbox and the distracting bordered/highlight strip. Match existing Settings spacing, typography, and form patterns. **No API changes** unless strictly required.

## High-level instructions for coder

- Locate the Social posts compose UI (settings/marketing) and align file upload with patterns used elsewhere (e.g. button + filename text + preview).
- Restructure the **Publish immediately** row: single row, label left, standard checkbox size; remove extra framing/highlight that draws attention away from content.
- Cross-check responsive layout and i18n keys if labels change.
- Smoke: open Settings → Marketing → Social posts, select an image, confirm preview and publish-immediate row look correct; ensure no regressions to OAuth/connect flows.

## Testing instructions

1. Run stack locally (HAProxy dev port, default **4202**). Log in as a user who can open **Settings**.
2. Go to **Settings → Marketing → Social posts** (`/settings` → **Social posts** tab).
3. **Image:** Confirm there is no native **Choose File** control. Click **Choose image**, pick a JPEG/PNG/WebP/GIF; verify **filename** appears next to the button, **preview** shows below with dashed frame, **Remove image** clears selection; button label becomes **Change image** when a file is selected.
4. **Publish immediately:** Checkbox is normal size, label **Publish immediately** on the same row, left-aligned; no oversized control or odd bordered strip around this row (compare with toggling **Publish immediately** off — schedule fields use normal `.form-group` styling only for the datetime inputs).
5. Optionally confirm **Connect Meta** / disconnect UI still renders as before (no layout regression in **Connected networks** card).
6. Frontend build: **`docker logs --since 10m pos-front`** should show successful bundle generation after edits (no TS/template errors).

---

## Test report

1. **Date/time (UTC) and log window:** 2026-04-27 13:43–13:46 UTC approximately; **`docker logs --since 45m pos-front`** reviewed for errors after verification (none matching error/failed/bundle generation failed).

2. **Environment:** Docker Compose **`docker-compose.yml`** + **`docker-compose.dev.yml`**; **`BASE_URL`** `http://127.0.0.1:4202`; branch **`development`** @ **`043e5ab6`** (repo root).

3. **What was tested:** Steps 1–6 from **Testing instructions** above (Settings → Marketing → Social posts compose: styled image upload + publish-immediately row + optional Meta card + frontend build health).

4. **Results:**
   - **Login + navigation to Social posts:** **PASS** — Owner session via local `.env` demo credentials; opened **`/settings?section=social-posts`** (Social Posts tab active).
   - **No native visible file input / styled upload:** **PASS** — `#social-posts-file` has **`display: none`**; no page-visible **`input[type=file]`**; primary control is button **“Bild wählen”** (DE locale).
   - **Select image → filename, preview, Change image, Remove:** **PASS** — After programmatic file selection (PNG), button became **“Bild ändern”**, **`.pending-file-name`** showed **`test-social-upload.png`**, **`[data-testid="social-posts-image-preview"]`** contained `<img>` and **Remove** control; clear restored **“Bild wählen”** and removed preview.
   - **Publish immediately row:** **PASS** — DOM structure **`.publish-now-inline`**: checkbox + label **“Sofort veröffentlichen”** on one row; checkbox **~13px** wide; computed style **no border**, **transparent background**, **0 padding** on the row (no highlighted strip). Unchecking showed **`.schedule-datetime-field`** with normal datetime **`.form-group`** pattern.
   - **Connected networks (Meta):** **PASS** — **“Verbundene Netzwerke”** card shows Meta heading, **“Nicht verbunden.”**, **“Meta verbinden”** button; no layout anomalies observed.
   - **Frontend build / logs:** **PASS** — Recent **`pos-front`** logs show **`Application bundle generation complete`**; grep for **error / failed / Application bundle generation failed** in the window returned no matches.

5. **Overall:** **PASS**

6. **Product owner feedback:** Social compose now uses the same hidden-file + button pattern as other settings forms, with clear filename and preview feedback. The publish-now control reads as a standard inline setting instead of a dominant framed block, which keeps focus on the post content and channels.

7. **URLs tested:**
   1. `http://127.0.0.1:4202/login`
   2. `http://127.0.0.1:4202/dashboard`
   3. `http://127.0.0.1:4202/settings?section=social-posts`

8. **Relevant log excerpts:** `pos-front` (sample): `Application bundle generation complete. [0.012 seconds] - 2026-04-27T13:41:48.151Z` — **Page reload sent to client(s).** No TS/template errors observed in the reviewed window.
