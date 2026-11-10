# Expired marketing artifacts (005)

Updated: 2026-09-17T13:53:58Z

## Done this cycle

1. Deployed **kebab-express** (menu prices push): run 35228955935 - live OK.
2. Refreshed expired artifacts on 9 sites via empty commit on `main` (Build has no `workflow_dispatch`).
3. Follow-up Deploy: run 35229686914. Sample check: wimpi HTTP=200 placeholder=no.

## Fix for refresh script later

Add `workflow_dispatch:` to marketing Build workflows so `scripts/refresh-expired-marketing-artifacts.sh` works without empty commits.
