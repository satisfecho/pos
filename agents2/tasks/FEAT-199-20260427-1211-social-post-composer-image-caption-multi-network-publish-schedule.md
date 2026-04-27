# Social post composer: image + caption, multi-network publish/schedule

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/199
- **199**

## Problem / goal
Add **Settings → Marketing → Social posts** for owner/admin only (not in main staff POS navigation). Users compose **image + caption**, choose **connected networks**, and use **Publish now** or **Schedule**. Include **Connect accounts** via OAuth with tokens stored **server-side only**, and a **history** view (sent / scheduled / failed). Implement **one provider first** (e.g. Meta: Page / Instagram Business where the API allows), using a **pluggable adapter** pattern so more networks can be added later. **Scope:** social publishing only (not general POS checkout).

## High-level instructions for coder
- Add the Marketing → Social posts area under Settings with appropriate role gating (owner/admin).
- Design backend models and APIs for OAuth connection state, scheduled posts, publish jobs, and history; keep secrets on the server.
- Implement the first network adapter end-to-end (compose UI → API → provider), then abstract adapters for future networks.
- Follow existing Settings/Marketing patterns and **`docs/agent-loop.md`** / **`AGENTS.md`** for testing and smoke checks after implementation.
