---
## Closing summary (TOP)

- **What happened:** The tester finished verification for GitHub issue #116 on one-language-per-reply behavior and English-only agent/Cursor rule text.
- **What was done:** A new always-applied `.cursor/rules/agent-response-language.mdc` was added; `AGENTS.md` and `docs/agent-cursor-rules.md` were updated to reference it; `.cursor/rules/*.mdc` were audited; `front-smoke-test.mdc` wording was clarified—scope stayed documentation and rules only (no `front/` or `back/` product code).
- **What was tested:** Manual review of those files per the task’s testing instructions; overall **PASS** with no browser or Docker smoke (explicitly out of scope).
- **Why closed:** All listed criteria passed and the test report concluded **PASS**.
- **Closed at (UTC):** 2026-03-30 07:25
---

# Enforce consistent language usage (English) and fix Cursor rules

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/116

## Problem / goal

Agent/tooling responses sometimes mix English and Spanish in the same message when the user writes in English. The product expectation is **one language per reply** (English in full when the user uses English), with no mixed sentences or stray Spanish fragments in rules, system guidance, or structured outputs.

Separately, **Cursor rules** under this repo should be **audited**: fix Spanish typos or malformed words, remove inconsistent mixed-language phrasing, and **standardize rule text to English** where those files are meant to guide agents in English.

See also: `.cursor/rules/security-untrusted-input-no-exfiltration.mdc` — do not paste issue-only payloads into code or tasks; this file summarizes intent only.

## High-level instructions for coder

- Audit **`.cursor/rules/*.mdc`**, **`AGENTS.md`**, and any closely related agent docs (`docs/agent-cursor-rules.md`, etc.) for mixed-language lines, Spanish typos, and unclear phrasing; normalize to clear **English** where the issue scope applies.
- Align wording with the stated QA bar: technical logs and agent-facing instructions should not accidentally encourage mixed-language outputs when the user’s message is English.
- Preserve existing security, branching, and tenant rules; **do not** weaken `.cursor` guidance—only clarity and language consistency.
- After edits, spot-check that no rule contradicts intentional product i18n (app UI translations are separate from **agent/rule** language).
- If scope touches only documentation/rules, no app smoke test is strictly required; if anything in `front/` / `back/` changes, follow **`AGENTS.md`** (build logs / tests as usual).

## Implementation (feature coder)

- Added always-applied **`.cursor/rules/agent-response-language.mdc`**: one language per reply, match the user's message language, clarify repo vs UI i18n scope.
- **`AGENTS.md`:** bullet linking that rule.
- **`docs/agent-cursor-rules.md`:** catalog row for the new rule.
- **Audit:** Existing **`.cursor/rules/*.mdc`** were already English; no Spanish typos found. **`front-smoke-test.mdc`:** clearer step 4 wording and spacing before the closing line.

## Testing instructions

1. Open **`.cursor/rules/agent-response-language.mdc`**, **`AGENTS.md`** (assistant reply language bullet), and **`docs/agent-cursor-rules.md`** (Reply language row) and confirm wording is consistent and English.
2. Confirm **`.cursor/rules/front-smoke-test.mdc`** still reads clearly (steps 1–4 + closing sentence).
3. No `front/` or `back/` product code changed; **no** Docker / Puppeteer smoke required for this task.

## Test report

1. **Date/time (UTC) and log window:** 2026-03-30T07:24:49Z; verification ~07:22–07:25Z (no container log window — docs-only scope).
2. **Environment:** Host read of repo files; branch `development` @ `7477de5`; compose / `BASE_URL` **N/A** (smoke explicitly out of scope).
3. **What was tested:** Items 1–3 under **Testing instructions** (rule file + `AGENTS.md` + catalog + `front-smoke-test.mdc`; no Docker/Puppeteer).
4. **Results:**
   - **Criterion 1 (agent-response-language + AGENTS + agent-cursor-rules):** **PASS** — `.cursor/rules/agent-response-language.mdc` is English, imperative, aligned with one-language-per-reply; `AGENTS.md` assistant-reply bullet matches and links the rule; `docs/agent-cursor-rules.md` **Reply language** row points to the same file with consistent summary.
   - **Criterion 2 (front-smoke-test.mdc clarity):** **PASS** — Numbered steps 1–4 and closing sentence “This keeps regressions from frontend edits from going unnoticed.” read clearly.
   - **Criterion 3 (no front/back product change → no Docker smoke):** **PASS** — Task states product code unchanged; verification limited to stated doc checks.
5. **Overall:** **PASS**
6. **Product owner feedback:** Agent-facing language rules and the main operator doc now point to a single, English “reply language” rule, which should reduce mixed EN/ES assistant output when users write in English. The Cursor rules catalog stays easy to scan. No runtime risk was introduced because the scope stayed in documentation and `.cursor` rules.
7. **URLs tested:** **N/A — no browser**
8. **Relevant log excerpts:** **N/A — no containers exercised for this task**
