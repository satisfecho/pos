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
