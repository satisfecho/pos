---
## Closing summary (TOP)

- **What happened:** The tester completed verification for GitHub #137: restore a light/neutral header and floor tabs on the Tables canvas (staff flow) instead of the dark/black canvas palette bleeding into `.page-header` / `.floor-tabs`.
- **What was done:** Implementation removed scoped tablet overrides in `tables-canvas.component.ts` so the header uses base staff-flow light surfaces again; the drawing area keeps the dark grid styling.
- **What was tested:** Stack on HAProxy 4202, staff `/tables/canvas`, automated luminance on header/floor-tabs vs canvas, optional `test-tables-canvas-view-options.mjs`, and `test:landing-version` — all **PASS** per the test report.
- **Why closed:** Overall **PASS**; acceptance criteria met; no further action unless design requests token tweaks.
- **Closed at (UTC):** 2026-04-01 09:37
---

# Technical Instruction for UI Adjustment

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/137

## Problem / goal

On **Tables**, the canvas header area shows a **dark/black** background that should be reverted to the **original light/neutral** look. The issue points at the main header container for the tables canvas (staff flow), including floor tabs.

## High-level instructions for coder

- Find SCSS/CSS that sets a **dark background** on the tables management header / staff-flow header for this view.
- Relevant hooks from the issue: container with **`data-testid="tables-canvas-header"`**, class **`.page-header--staff-flow`**, and **`.floor-tabs`** (and related layout under the Tables / floor canvas).
- **Remove or replace** the dark background so the header matches the prior light/neutral staff-flow styling; avoid regressions on other routes that reuse shared classes—scope changes to the Tables canvas header as needed.

## Implementation notes

- **`front/src/app/tables/tables-canvas.component.ts`:** Removed `.canvas-container.tables-canvas--tablet` overrides that set `.page-header` and `.floor-tabs` to the dark canvas palette (`--tables-canvas-bg` / `#1a1f26`). Base component styles (`var(--color-bg)`, `var(--color-surface)`) apply again; dark grid/canvas remains on `.canvas-area` only.

## Testing instructions

1. Stack up (e.g. HAProxy on **4202**): `docker compose -f docker-compose.yml -f docker-compose.dev.yml ps`.
2. Log in as staff; open **Tables** → **floor plan** (`/tables/canvas` or equivalent).
3. Confirm **`[data-testid="tables-canvas-header"]`** and **`.floor-tabs`** use light/neutral backgrounds (match `/tables` tiles view header), while the **canvas** drawing area stays dark with grid.
4. Optional Puppeteer: from repo root, `BASE_URL=http://127.0.0.1:4202 LOGIN_EMAIL=… LOGIN_PASSWORD=… node front/scripts/test-tables-canvas-view-options.mjs` (requires credentials).
5. Quick smoke: `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front`.

---

## Test report

**Date/time (UTC):** 2026-04-01 09:31–09:36 (verification window; report finalized 09:35:59 UTC).

**Log window:** Same UTC window for `docker compose … logs front` (sample below).

**Environment:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml` (services up: front, back, haproxy `0.0.0.0:4202->4202`, db, redis, ws-bridge). **`BASE_URL`:** `http://127.0.0.1:4202`. **Branch:** `development` @ `2f3645e`.

**What was tested:** Instructions §1–5: stack reachability; staff login → `/tables/canvas`; visual/header vs canvas (automated luminance on computed `background-color`); optional Puppeteer `test-tables-canvas-view-options.mjs`; landing smoke.

**Results:**

| Criterion | Result | Evidence |
|-----------|--------|----------|
| Services up (HAProxy 4202) | **PASS** | `docker compose … ps` showed `pos-haproxy` publishing `4202`, front/back Up |
| Tables canvas route and header test id | **PASS** | `test-tables-canvas-view-options.mjs` reached `/tables/canvas`, found `[data-testid="tables-canvas-header"]` |
| Header + `.floor-tabs` light/neutral; canvas dark | **PASS** | Puppeteer evaluate: `headerBg` `rgb(250, 249, 247)`, `floorTabsBg` `rgb(255, 255, 255)`, `canvasAreaBg` `rgb(16, 19, 24)`; thresholds: header/floor luminance > 0.55, canvas < 0.45 |
| Optional canvas view-options script | **PASS** | Exit 0; full Floor plan → Tiles → Table → Floor plan → Table flow |
| Quick smoke `test:landing-version` | **PASS** | Exit 0; “Landing version OK; demo login (tenant=1) OK; sidebar nav OK” |

**Overall:** **PASS**

**Product owner feedback:** The tables floor-plan header and floor tabs again read as light surfaces consistent with the rest of staff UI, while the drawing area stays on the dark grid background. Automated checks and the existing canvas navigation script both completed without errors. No further action required for this UI regression unless design wants a different exact token for the header.

**URLs tested:**

1. `http://127.0.0.1:4202/login?tenant=1`
2. `http://127.0.0.1:4202/tables/canvas`
3. `http://127.0.0.1:4202/tables` (tiles / table list during view-options script)
4. `http://127.0.0.1:4202/` (landing smoke; multi-route sidebar navigation including `/tables`)

**Relevant log excerpts:**

```
pos-front | Application bundle generation complete. [1.032 seconds] - 2026-04-01T09:30:20.483Z
pos-front | Lazy chunk files | tables-canvas-component | …
pos-front | Component update sent to client(s).
```

**GitHub:** Comment posted on issue #137 (verification complete, PASS). `gh issue edit --add-label "agent:testing"` failed (label not defined in repo); adjust labels manually if needed.

**Issue:** https://github.com/satisfecho/pos/issues/137
