# Reports UI: adjust staff clock-in/out (work session)

## GitHub Issues
- [github.com/satisfecho/pos/issues](https://github.com/satisfecho/pos/issues)
- `gh issue list --repo satisfecho/pos --state open --limit 40`
- Optional: `--json number,title,labels,updatedAt,url`
- **Issue:** https://github.com/satisfecho/pos/issues/159

## Problem / goal
Staff with **report:read** need an **Adjust** action on **Reports** to correct a work session’s clock-in/out times and add a note. The flow should open a modal (**datetime-local** for start and end, plus note), call **`postReportWorkSessionAdjust(sessionId, { note, started_at, ended_at })`** with **ISO UTC** derived from the local inputs, reload attendance tables on success, and surface API errors via **`ApiErrorMessageService`**. Remove the duplicate **“Who is on shift now”** block from **`reports.component.html`**. Add **`REPORTS.*`** i18n keys in **all** **`front/public/i18n/*.json`** files.

## High-level instructions for coder
- Add an **Adjust** entry point in the Reports UI gated by **`report:read`** (and any existing permission patterns for report actions).
- Implement a modal: **start**, **end** (**datetime-local**), **note**; map local values to **UTC ISO** strings for the API payload.
- Wire **`postReportWorkSessionAdjust`** (or the existing reports API client) and on success refresh the attendance / work-session tables the page already uses.
- Use **`ApiErrorMessageService`** for failed requests (consistent with other report screens).
- Deduplicate **“Who is on shift now”** in **`reports.component.html`** so it appears once (or as intended by design).
- Add **`REPORTS.*`** translation keys across **every** locale file under **`front/public/i18n/`**; follow **`.cursor/rules/angular-ngx-translate.mdc`** if applicable.
- Smoke: exercise Reports with a user that has **report:read**, open Adjust, submit valid and invalid ranges, confirm reload and error display.
