# Extend screenshots capture for Jul product surfaces

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

**`front/scripts/capture-screenshots.mjs`** and **`docs/screenshots/README.md`** still cover only classic staff pages (dashboard, orders, kitchen, reports, reservations, tables, menu, provider). Shipped Jul surfaces — public Satisfecho Delivery, courier portal, waiting list, platform operator — have no PNGs and no README entries, so root/feature docs cannot link visuals and marketers/operators keep using stale collage.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T18:42Z: docs-vs-code follow-on after SIGNAL docs/changelog owned; not a bulk `docs/*.md` rewrite
- `capture-screenshots.mjs` paths: `/dashboard`, `/staff/orders`, `/kitchen`, `/reports`, `/reservations`, `/tables`, `/menu/{token}`, optional `/provider` — no `/delivery`, `/courier`, `/waitlist`, `/platform`
- `docs/screenshots/` on disk: dashboard/orders/kitchen/reports/reservations/tables/menu/provider (+ `reports-review.png`); README file reference matches that set
- Sibling **`NEW-0-20260723-1833-retire-or-document-one-off-puppeteer-scripts`** owns orphan one-offs only — do **not** merge; this task extends the durable capture script + index

## High-level instructions for coder

- Extend **`capture-screenshots.mjs`** to capture at least: public `/delivery/{tenantId}` (default tenant 1), public `/waitlist/{tenantId}`, and one courier surface if `COURIER_TEST_EMAIL`/`COURIER_TEST_PASSWORD` (or existing courier env) is set; optional platform operator page if platform env already documented
- Add PNG filenames under **`docs/screenshots/`** and short sections + file-reference rows in **`docs/screenshots/README.md`** (link `docs/0053`, `docs/0011` waiting-list, `docs/0015-platform-operator-portal.md` as applicable)
- Keep captures optional/skippable when credentials or routes are unavailable (same style as provider skip)
- Do not invent new product flows; do not replace existing classic screenshots unless regenerating them in the same run
- Pass/fail: script documents new env vars in header; README lists new files; a dry run with staff login produces or clearly skips each new target without crashing
