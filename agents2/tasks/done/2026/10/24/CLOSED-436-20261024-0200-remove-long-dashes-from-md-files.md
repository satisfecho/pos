---
## Closing summary (TOP)

- **What happened:** Live Markdown and Cursor rules still used typographic long dashes; issue #436 required ASCII hyphens and a durable ban.
- **What was done:** Replaced U+2014/U+2013/U+2012/U+2212 with ASCII `-` across live `.md`/`.mdc`, left `agents2/tasks/done/` archives alone, and added always-on `.cursor/rules/markdown-no-long-dashes.mdc` plus docs index notes.
- **What was tested:** `rg` found no typographic dashes in live Markdown; README/docs spot-checks and rule index PASS; optional HTTP smoke on mapped port returned 200. Overall PASS.
- **Why closed:** All testing criteria passed.
- **Closed at (UTC):** 2026-10-24 02:13
---

# Remove long dashes from Markdown files (#436)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/436
- **436**

## Status
- **Implemented** (010 feature coder) - 2026-10-24
- Live `.md` / `.mdc` cleaned (not archived `agents2/tasks/done/`)
- Durable rule added: `.cursor/rules/markdown-no-long-dashes.mdc`

## Problem / goal
Root **README.md** (and other docs) use long dashes (em/en dashes). Project rule: **no long dashes** anywhere in Markdown. Treat this as a standing documentation requirement and clean affected `.md` files.

## High-level instructions for coder
- Inventory Markdown under the repo that uses em dash (U+2014), en dash (U+2013), or similar typographic dashes - start with root **README.md**, then **`docs/`**, **`AGENTS.md`**, **`.cursor/rules/*.mdc`**, and other contributor-facing `.md` as needed.
- Replace long dashes with plain ASCII hyphen `-` (or rephrase) so meaning stays clear; do not change code identifiers, URLs, or intentional ASCII `--` in shell examples.
- Keep the ban as a durable docs convention (brief note in contributor docs / rules if missing) so new Markdown does not reintroduce long dashes.
- Scope is documentation/copy only - no `back/` or `front/` app behavior changes unless a `.md` lives there.
- Smoke: spot-check README and a few `docs/` pages render; optional `rg` for Unicode dash characters should be clean in intended paths.

## What was done
- Replaced U+2014 / U+2013 / U+2012 / U+2212 with ASCII `-` across live contributor docs: root **README.md**, **CHANGELOG.md**, **ROADMAP.md**, **AGENTS.md**, **`docs/**`**, **`agents2/*.md`**, **`.cursor/rules/*.mdc`**, plus a few package READMEs (`haproxy/`, `certbot/`, `back/fixtures/migration/`).
- Left **`agents2/tasks/done/`** archives unchanged (historical).
- Added **`.cursor/rules/markdown-no-long-dashes.mdc`** (`alwaysApply`) and indexed it in **`docs/agent-cursor-rules.md`**; short style note in **`docs/README.md`**.
- Changelog **[Unreleased]** note for #436.

## Testing instructions
1. From repo root, confirm no typographic dashes remain in live Markdown (exclude archives and `tmp`):
   ```bash
   rg $'\u2014|\u2013|\u2012|\u2212' --glob '*.md' --glob '*.mdc' . \
     --glob '!**/node_modules/**' \
     --glob '!**/agents2/tasks/done/**' \
     --glob '!**/agents/tasks/done/**' \
     --glob '!**/tmp/**'
   ```
   Expect **no matches**.
2. Spot-check **README.md** (banner alt, bullet list under product pitch) and **docs/README.md** style note: hyphens are ASCII `-`, shell examples still use `--env-file` / `--no-cache` as before.
3. Confirm rule exists: **`.cursor/rules/markdown-no-long-dashes.mdc`** and a row in **`docs/agent-cursor-rules.md`**.
4. Optional: `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4202/` (docs-only change; 200 if stack is up).

## Test report

1. **Date/time (UTC):** start 2026-10-24T02:12:09Z, end 2026-10-24T02:12:40Z. Log window: ~02:12Z (haproxy access for optional curl).
2. **Environment:** branch `development` (synced). Compose `docker-compose.yml` + `docker-compose.dev.yml`. HAProxy published at `127.0.0.1:14202` (not 4202). Docs-only task; primary checks are `rg` + file spot-checks.
3. **What was tested:** No typographic dashes in live `.md`/`.mdc`; README + docs/README ASCII hyphens and shell `--`; durable rule + agent-cursor-rules index; optional HTTP smoke.
4. **Results:**
   - **PASS** - `rg` for U+2014/U+2013/U+2012/U+2212 on live `*.md`/`*.mdc` (excluding `node_modules`, `agents2/tasks/done`, `agents/tasks/done`, `tmp`): no matches (rg exit 1 / empty).
   - **PASS** - README.md banner alt uses ASCII (`POS2 - Restaurant…`); no long dashes; intentional `--` still present in shell-oriented docs.
   - **PASS** - docs/README.md style note present (ASCII hyphens / points at rule); clean of long dashes.
   - **PASS** - `.cursor/rules/markdown-no-long-dashes.mdc` exists (`alwaysApply`); `docs/agent-cursor-rules.md` row **Markdown dashes**.
   - **PASS** - Optional smoke: `curl http://127.0.0.1:14202/` → **200** (port 4202 not bound on this host; mapped port used).
5. **Overall:** **PASS**
6. **Product owner feedback:** Live Markdown is free of typographic dashes and the always-on Cursor rule plus docs index should stop reintroduction. Archives under `agents2/tasks/done/` were correctly left alone. No app behavior risk from this change.
7. **URLs tested:**
   1. `http://127.0.0.1:14202/` (HTTP 200)
8. **Relevant log excerpts:**
   ```
   pos-haproxy: "GET / HTTP/1.1" 200 (frontend_backend/front1)
   ```
