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
