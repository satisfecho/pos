---
## Closing summary (TOP)

- **What happened:** GitHub #73 requested **`docker buildx prune`** in the amvara9 deploy path so BuildKit cache does not fill disk.
- **What was done:** `scripts/deploy-amvara9.sh` runs **`docker buildx prune -f`** after successful **back** and **front** image builds; failures log a warning and do not abort deploy; **`SKIP_BUILDX_PRUNE=1`** skips the step; **`docs/0001-ci-cd-amvara9.md`** documents behaviour.
- **What was tested:** Static review against pass/fail criteria plus **`bash -n scripts/deploy-amvara9.sh`** — **PASS**; optional full build+prune on a Docker host was not run.
- **Why closed:** Tester overall **PASS**; script ordering, `set -e` safety, skip flag, and doc alignment all verified.
- **Closed at (UTC):** 2026-03-24 22:39
---

# docker buildx prune

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/73

## Problem / goal
The amvara9 build pipeline should run **`docker buildx prune`** so temporary BuildKit/buildx layers do not accumulate in the Docker cache and fill disk.

## High-level instructions for coder
- Inspect **`scripts/deploy-amvara9.sh`** and any related deploy/CI docs (**`docs/`** e.g. amvara9 CD) to find the right place **after** image builds complete successfully.
- Add a non-interactive prune (e.g. **`docker buildx prune -f`**, with filters the team accepts) so SSH/deploy scripts never hang on prompts; document behaviour briefly if behaviour is non-obvious.
- Balance **disk recovery** vs **next-build cold-cache** cost; note in commit or doc if specific flags were chosen for retention.
- Ensure the step does not break concurrent builds on the same host if that is a realistic scenario.

## Coder notes (implementation)

- **`scripts/deploy-amvara9.sh`:** After successful **`docker compose build`** for **back** and **front**, runs **`docker buildx prune -f`** (unused BuildKit cache only; non-interactive). **`SKIP_BUILDX_PRUNE=1`** skips the step. Prune failure logs a warning and does not exit deploy (**`set -e`** avoided via `if`).
- **Retention:** No **`--filter until=`** — full unused-cache prune for maximum disk recovery on amvara9; production front build is already **`--no-cache`**, so deploy does not depend on warm BuildKit cache for the prior layer set.
- **Concurrency:** **`.github/workflows/deploy-amvara9.yml`** uses a **`deploy-amvara9`** concurrency group so CI deploys do not overlap on the server; prune only removes cache not referenced by active builds.
- **`docs/0001-ci-cd-amvara9.md`:** Deploy behaviour bullet documents prune, opt-out, and non-fatal failures.

## Testing instructions

### What to verify

- After both image builds, the script prints prune messages and **`docker buildx prune -f`** succeeds on a host with buildx, or emits a clear warning without aborting deploy if prune fails.
- **`SKIP_BUILDX_PRUNE=1`** skips pruning.

### How to test

- **Syntax:** From repo root: `bash -n scripts/deploy-amvara9.sh` (expect exit 0).
- **Dry behaviour (optional, on a machine with Docker):** Run only the build+prune segment by copying the two `docker compose … build` lines and the new prune block into a throwaway shell after **`cd`** to a checkout with **`config.env`**, or run a full deploy on a staging host if available.
- **Manual check:** Inspect **`scripts/deploy-amvara9.sh`** after the front build for the **`docker buildx prune -f`** block and header comment **`SKIP_BUILDX_PRUNE`**.

### Pass / fail criteria

- **Pass:** Script remains **`set -e`**-safe; prune runs after successful **back** + **front** builds; **`SKIP_BUILDX_PRUNE=1`** skips; doc in **`docs/0001-ci-cd-amvara9.md`** matches behaviour.
- **Fail:** Deploy aborts on prune failure without intentional design, or prune runs before builds complete.

---

## Test report

1. **Date/time (UTC) and log window:** 2026-03-24T22:36:15Z — verification window ~22:35–22:37Z; no app containers required for this task.

2. **Environment:** Repo `/Users/raro42/projects/pos2`, branch `development`, commit `61e8ebc`. Compose N/A for executed checks. **`BASE_URL`:** N/A — no browser.

3. **What was tested:** Pass/fail criteria from task: `set -e` safety and non-fatal prune; prune order after back + front builds; `SKIP_BUILDX_PRUNE=1`; doc alignment with `scripts/deploy-amvara9.sh`.

4. **Results:**
   - **`set -e` + prune failure non-aborting:** **PASS** — `docker buildx prune -f` is only in `if …; then … else … fi` (lines 91–95 of `scripts/deploy-amvara9.sh`), so a failing prune does not exit the script under `set -e`.
   - **Prune after back + front builds:** **PASS** — `docker compose … build back` (line 75), then `build --no-cache front` (line 82), then prune block (lines 84–96).
   - **`SKIP_BUILDX_PRUNE=1` skips prune:** **PASS** — lines 87–88 echo skip message and skip the prune branch.
   - **`docs/0001-ci-cd-amvara9.md` matches behaviour:** **PASS** — bullet documents post-build prune, `-f`, `SKIP_BUILDX_PRUNE=1`, non-fatal warnings (line 56).
   - **`bash -n scripts/deploy-amvara9.sh`:** **PASS** — exit code 0.

5. **Overall:** **PASS**

6. **Product owner feedback:** Deploy now trims unused BuildKit cache after each successful image rebuild on amvara9, which should slow disk fill-up from CI layers. Operators can set `SKIP_BUILDX_PRUNE=1` if they need to preserve cache; a failed prune only logs a warning so production rollout is not blocked by a flaky buildx command.

7. **URLs tested:** N/A — no browser.

8. **Relevant log excerpts:** N/A — verification was static analysis + `bash -n`. Optional full deploy/build+prune on a host with Docker was not run (marked optional in task).

**GitHub:** Comment posted on #73 at verification start. `gh issue edit` to add label `agent:testing` failed (label not defined in repo); closer can add labels or close issue per `docs/agent-loop.md`.
