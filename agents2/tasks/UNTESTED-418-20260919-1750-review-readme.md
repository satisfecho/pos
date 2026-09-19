# Review README.md

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/418
- **418**

## Problem / goal
`README.md` repeats the same topics in many sections. A new reader sees the same facts more than once. Payments are the clear example: Stripe, Revolut, and [docs/REVOLUT.md](docs/REVOLUT.md) appear in the intro, About, Start with one feature, Features, Built With, Configuration, and the Documentation table. Reservations, i18n, deploy env vars, and URLs also appear twice (Features plus a later section, or Quick Start plus Access Points). Make the file shorter and easier to read. Keep one place for each fact. Link to `docs/` for detail. Do not change product behavior.

## High-level instructions for coder
- Edit `README.md` only. Do not change `back/` or `front/`.
- Keep the first-read path: what the product is, how to start (`config.env`, Docker Compose, register), and where the app URL is.
- Say each topic once. Payments (Stripe, Revolut, cash, card terminal) belong in one short place, with one link to [docs/REVOLUT.md](docs/REVOLUT.md). Do not repeat that link in Built With, Configuration, and the Documentation table.
- Merge or cut later sections that repeat Features: Table Reservations, Internationalization, Deployment env vars, and the short Roadmap list. Point to the existing docs (`docs/0011`, `docs/0012`, `docs/0004`, `ROADMAP.md`) instead of copying the same sentences.
- Keep Access Points as the URL list. Quick Start should not list the same URLs again. Keep one link to [docs/README.md](docs/README.md) as the doc index. Do not keep a long Documentation table that repeats links already in Features.
- Do not drop a fact that appears only once. Do not invent new features. Do not paste secrets or sample credentials.
- Update `CHANGELOG.md` under `[Unreleased]` if the README change is user-visible. Skip a version bump for a docs-only edit unless the changelog rule says otherwise.
- Smoke is not a UI change. Confirm `http://127.0.0.1:4202/` still returns 200 after the edit.

## Testing instructions

**What to verify**
- `README.md` states each topic once. The payment-method list and the `docs/REVOLUT.md` link appear only in the Features **Payments** row.
- These sections are gone: Table Reservations, Internationalization, Deployment, Roadmap, and the long Documentation table.
- Access Points is still the URL list. Quick Start does not list app, API docs, or health URLs again.
- Unique facts stay: language list (including French, Bulgarian, Urdu), `docs/0008` session rules, end-user accounts/MFA not shipped, live Stripe keys in Security Notes, and the env var table.
- `CHANGELOG.md` `[Unreleased]` notes the README edit. No version bump. No `back/` or `front/` edits.
- The app still answers. This change does not touch product code.

**How to test**
1. From the repo root, on branch `development`:
   - `rg -n "REVOLUT\\.md" README.md` shows one hit, in the Payments row.
   - `rg -n "^## (Table Reservations|Internationalization|Deployment|Roadmap)$" README.md` prints nothing.
   - `rg -n "docs/README.md" README.md` shows one hit.
   - `rg -n "http://localhost:4202/api/docs" README.md` shows one hit, in Access Points.
2. Confirm `CHANGELOG.md` has a `#418` README line under `[Unreleased]` and that `front/package.json` version did not change for this edit.
3. With the dev stack up (`docker-compose.yml` + `docker-compose.dev.yml`):
   - `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4202/` returns `200`.

**Pass/fail criteria**
- **Pass:** one Revolut doc link, the repeated sections are gone, Access Points still lists the URLs, the changelog notes the edit, and curl returns 200.
- **Fail:** `docs/REVOLUT.md` appears outside Payments, a cut section is back, Access Points lost its URL table, or curl is not 200.
