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

## Implementation summary (coder)

- **Backend:** Migration **`20260427143000_social_posts.sql`** — tables `social_oauth_state`, `social_connection`, `social_post`, `social_post_target`. **`app/social_routes.py`** (`/tenant/social/*`): Meta OAuth **POST `/social/oauth/meta/authorize-url`** (returns Facebook dialog URL), **GET `/social/oauth/meta/callback`**, catalog/connections CRUD-style reads, **POST `/social/posts`** (multipart image + caption + channels JSON). Tokens encrypted with **`app/social_credentials.py`** (Fernet, separate salt from delivery). **`app/social_adapters/`** — **`MetaSocialAdapter`** (Facebook Page photo upload; Instagram via public **`image_url`** using **`PUBLIC_APP_BASE_URL`**). **`app/social_publish_worker.py`** — asyncio loop (~45s) processes **`queued`/`scheduled`** posts when **`schedule_at`** is due; registered in **`main.py`** lifespan.
- **Frontend:** Settings tab **Social posts** (`settings.component.ts`) + **`social-posts-settings.component.ts`**; **`api.service.ts`** methods; i18n keys in **`front/public/i18n/*.json`**.
- **Config:** **`config.env.example`** — **`META_APP_ID`**, **`META_APP_SECRET`**, **`META_GRAPH_VERSION`**, **`META_OAUTH_REDIRECT_URI`** (optional; else derived from **`PUBLIC_APP_BASE_URL`** + **`ROOT_PATH`**).

## Testing instructions

1. **Migrate:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python -m app.migrate` — expect schema version **20260427143000** (already applied if up to date).
2. **API auth:** `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4202/api/tenant/social/catalog` — expect **401** without Bearer/cookie.
3. **UI (owner/admin):** Open **`/settings?section=social-posts`**, confirm **Social posts** tab loads; without **`META_APP_ID`**, **Connect Meta** should surface the “not configured” feedback (503 from authorize-url).
4. **Meta E2E (optional):** Set **`META_APP_ID`**, **`META_APP_SECRET`**, **`PUBLIC_APP_BASE_URL`** (and matching OAuth redirect in Meta app). Connect Meta, compose image + caption, select Page and/or Instagram (IG requires linked Business account + public **`PUBLIC_APP_BASE_URL`** for image URL). **Publish now** → history shows **`sent`** / **`failed`** with per-channel rows.
5. **Smoke:** `cd front && BASE_URL=http://127.0.0.1:4202 npm run test:landing-version` (if landing semver asset lags package version, refresh **`front/scripts/get-commit-hash.js`** / rebuild per script hint — unrelated to this feature).
6. **Frontend build:** Check **`docker logs --since 10m pos-front`** for TS/Angular errors after edits.
