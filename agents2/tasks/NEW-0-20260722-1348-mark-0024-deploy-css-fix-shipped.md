# Mark 0024 deploy CSS fix as shipped

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

`docs/0024-deploy-css-fix-amvara9.md` still reads like an open incident (“what to change for your confirmation”) while both recommended fixes are already in the repo. Operators and agents may re-open a solved deploy CSS stale-build issue.

## Evidence (008 preflight / review)

- Doc age >90d; not in the 14 SIGNAL basename list but still stale alongside other `docs/*.md`
- `scripts/deploy-amvara9.sh` already runs `docker compose … build --no-cache front`
- `front/nginx.conf` already sets `Cache-Control: no-cache, no-store, must-revalidate` on the SPA `index.html` location
- No existing `agents2/tasks/*` covers **0024-deploy** (WhatsApp notes use a different `0024-whatsapp-*` file)

## High-level instructions for coder

- Add a short **Status (shipped)** banner at the top of `docs/0024-deploy-css-fix-amvara9.md`: front `--no-cache` deploy build + `index.html` no-cache headers are in place; keep the root-cause narrative as historical context.
- Point to current paths (`scripts/deploy-amvara9.sh`, `front/nginx.conf`) instead of “proposed” diff language.
- Do **not** rewrite the whole doc or change deploy behaviour unless a real regression is found.
- Pass criteria: doc opens with shipped status; no contradictory “please confirm these changes” framing; `docs/README.md` index blurb optional one-line update if it still implies an open fix.
