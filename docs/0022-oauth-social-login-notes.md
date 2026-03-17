# OAuth / Social Login (Google, Microsoft, Facebook, GitHub) – Notes and Recommendation

This document captures thoughts on adding “Sign in with Google / Microsoft / Facebook / GitHub” so users can use those accounts to log in to the POS app.

---

## 1. Current auth

- **Login**: `POST /token` with email + password (OAuth2 password flow); backend verifies `bcrypt` hash and returns JWT in cookie + body.
- **User model**: `email` (unique), `hashed_password` (required), `full_name`, `role`, `tenant_id` or `provider_id`. No OAuth fields.
- **Register**: `POST /register` creates tenant + owner user with hashed password. Provider register is separate.

---

## 2. Why add social login

- **Convenience**: One click for users who prefer not to manage another password.
- **Trust**: Some users trust Google/GitHub more than typing a password into a small site.
- **Reduced friction**: Especially for staff (waiters, kitchen) who are invited and may never set a password if they can “Sign in with Google”.

---

## 3. Recommendation: add OAuth, keep email/password

- **Support both**: Keep existing email/password; add “Sign in with Google / Microsoft / Facebook / GitHub” as alternatives.
- **Same JWT**: After OAuth, backend still issues the same JWT (same cookie, same `sub`/tenant_id/provider_id). No change to existing protected routes or frontend auth state.
- **Account linking**: If a user already has an account (email + password), allow them to “link” Google/Microsoft/Facebook/GitHub so they can sign in with any linked method. Same user record, multiple sign-in methods.
- **New users**: When someone signs in with a provider and we have no account for that email, decide policy: (a) **Create tenant + owner** (like current register), or (b) **Reject** (“No account for this email. Register first or get an invite.”). (a) is friendlier for “sign up with Google”; (b) is stricter (invite-only). Recommend (a) for main app, (b) optional per-tenant later.

---

## 4. Design choices

| Topic | Recommendation |
|--------|----------------|
| **Password for OAuth-only users** | Make `hashed_password` nullable, or store a random unguessable value so no one can log in with a password. Prefer **nullable** and “password not set” in UI (e.g. “Set password” in profile). |
| **Storing OAuth identity** | New table e.g. `user_oauth_account` (or `user_external_account`): `user_id`, `provider` (e.g. `google`, `microsoft`, `facebook`, `github`), `provider_user_id` (provider’s sub), `email` (snapshot), optional `name`, `created_at`. Unique on `(provider, provider_user_id)`. Lets one user link multiple providers. |
| **Tenant for new OAuth sign-ups** | For “Sign in with …” with no existing user: create new tenant (e.g. name from email or “My restaurant”) and create user as owner, same as current register. Optional: ask for restaurant name on first login (wizard step). |
| **Provider portal** | Same mechanism: allow “Sign in with Google/Microsoft/GitHub” for provider login; link to existing provider user or create provider + user. |
| **Which providers** | **Google**: High value, very common. **Microsoft**: Important for businesses (Outlook/Office 365, work/school accounts). **GitHub**: Good for devs and some teams. **Facebook**: Still common; add if target audience uses it. Start with **Google** and **Microsoft** for broad coverage; add GitHub and Facebook as needed. |

---

## 5. High-level flow

1. **Frontend**: Login page shows “Sign in with Google” (and optionally GitHub/Facebook). Button links to backend URL that redirects to provider (e.g. `GET /auth/google/authorize` → 302 to Google).
2. **Provider**: User signs in at Google, authorizes the app, Google redirects to our callback (e.g. `GET /auth/google/callback?code=...&state=...`).
3. **Backend callback**: Exchange `code` for tokens; get user info (email, name). Look up user by email (and tenant_id if we pass it in `state`). If found: optionally link this OAuth account if not already; issue our JWT and set cookie, redirect to `/` or `/dashboard`. If not found: create tenant + user (or return error if invite-only), link OAuth, issue JWT, redirect.
4. **Linking**: In “Account” or “Profile”, “Link Google account” → same OAuth flow; backend attaches `user_oauth_account` to current user instead of creating new user.

---

## 6. Backend work (outline)

- **Config**: Add settings per provider (Google, Microsoft, GitHub, Facebook): client id, client secret, redirect URI. Redirect URI must be exact (e.g. `https://yourdomain.com/auth/google/callback`, `https://yourdomain.com/auth/microsoft/callback`).
- **Tables**: (1) Make `User.hashed_password` nullable; migration. (2) Add `user_oauth_account` (user_id, provider, provider_user_id, email, name?, created_at); unique (provider, provider_user_id).
- **Endpoints** (per provider):  
  - `GET /auth/google/authorize`, `GET /auth/microsoft/authorize`, etc.: build provider URL with client_id, redirect_uri, scope (email, profile / openid), state (csrf + optional tenant_id); redirect.  
  - `GET /auth/google/callback`, `GET /auth/microsoft/callback`, etc.: verify state, exchange code for tokens, get user info; find or create user; link OAuth; set JWT cookie; redirect to frontend.
  - Optional: link endpoints (authenticated): same flow with state indicating “link only”; attach to current user.
- **Login logic**: In callback, “find user” by email (and tenant_id from state if present). If not found and policy is create: create tenant + user (owner), no password. If not found and policy is invite-only: redirect to login with error “No account for this email.”
- **Password check**: Where we currently require `hashed_password`, allow login if user has at least one linked OAuth account (or allow null password and OAuth-only users to never use password).

---

## 7. Frontend work (outline)

- **Login page**: Add “Sign in with Google”, “Sign in with Microsoft”, and optionally GitHub/Facebook buttons; each links to the corresponding `GET /auth/{provider}/authorize` (with optional `?tenant_id=…`). Keep email/password form.
- **Post-login**: Callback redirects to `/` or `/dashboard`; app already reads JWT from cookie, so no change.
- **Account/Profile**: “Linked accounts” section: show “Google: linked”, “Microsoft: linked”, etc., or “Link … account”; “Set password” if `hashed_password` is null.

---

## 8. Security and privacy

- **State**: Use cryptographically random `state` in OAuth flow and verify in callback to prevent CSRF.
- **Tokens**: Do not store provider access/refresh tokens unless you need to call provider APIs later (e.g. calendar). For login-only, get email/name and discard. If you store them, encrypt and keep short-lived.
- **Email**: Trust provider’s email only after verification; providers mark verified emails. Prefer verified email for account matching.
- **Scopes**: Request only `email` and `profile` (name, picture) for login. Avoid broad scopes.

---

## 9. Summary

- **Recommendation**: Add OAuth (Google, Microsoft, then GitHub/Facebook as needed); keep email/password; same JWT and app behavior after login.
- **Model**: Nullable `hashed_password`; new `user_oauth_account` table for linking providers.
- **New users**: Allow “Sign in with …” to create tenant + owner when email is unknown; optional invite-only mode later.
- **Effort**: Backend: config, migration, 2 endpoints per provider (authorize + callback), find-or-create + link logic. Frontend: login buttons, optional “Linked accounts” in profile. Test with real provider apps (dev credentials).

This can be implemented incrementally: e.g. Google and Microsoft first (broad coverage), then GitHub and Facebook; optional “link account” and “set password” in profile.

---

## 10. Microsoft Accounts – specifics

Microsoft uses **Azure AD / Microsoft Entra ID** (OAuth 2.0 and OpenID Connect). Same pattern as Google; a few details:

- **App registration**: In [Azure Portal](https://portal.azure.com) → Azure Active Directory (or “Microsoft Entra ID”) → App registrations → New registration. Application (client) ID and client secret; under “Authentication” add a Web redirect URI, e.g. `https://yourdomain.com/auth/microsoft/callback`.
- **Endpoints** (common cloud):  
  - Authorize: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize`  
  - Token: `https://login.microsoftonline.com/common/oauth2/v2.0/token`  
  - UserInfo (OpenID): use the `id_token` (JWT) or call `https://graph.microsoft.com/oidc/userinfo` with the access token.
- **Scopes**: Request `openid`, `email`, `profile` (or `User.Read` for Graph). For login-only, `openid email profile` is enough; you get email and name from the id_token or userinfo.
- **Tenant**: Using `common` in the authority allows both personal Microsoft accounts and work/school (Azure AD) accounts. For “work/school only” you’d use a specific tenant id.
- **Config**: Add `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, and redirect URI in app registration. Backend uses these in `/auth/microsoft/authorize` and `/auth/microsoft/callback` the same way as for Google.
