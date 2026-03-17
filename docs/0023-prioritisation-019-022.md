# Prioritisation: Docs 0019–0022 (What to Do First)

Short reference for the development plans in docs 0019–0022 and suggested order.

---

## Status of each doc

| Doc | Topic | Status | Action |
|-----|--------|--------|--------|
| **0019** | No-show (reservations) | **Done** | None. Doc describes what was implemented (status `no_show`, reminder email, UI). |
| **0020** | Rate limiting | **Mostly done** | Core is in place (global, login, register, payment). Optional: public menu limits, file upload limits (see ROADMAP checklist). |
| **0021** | Working plan (kitchen, bar, waiters) | **Done** | Implemented: shift table, CRUD API, `/working-plan` page, permissions, opening-hours alignment, personnel-per-shift in Settings, owner notification, time step (30 min / 1 h), “use any hour” (e.g. cleaning). See **0021-working-plan.md**. |
| **0022** | OAuth / social login (Google, Microsoft, etc.) | **To do** | Design done; implementation: nullable password, `user_oauth_account` table, provider endpoints, login buttons. |

So the real “what do we do first?” is between **0021** and **0022**.

---

## Recommendation: do **0021 (Working plan) first**, then **0022 (OAuth)**

### Why Working plan first

1. **Contained scope** – One new table, one new page, owner/admin only. No change to existing auth or password flow. Lower risk and easier to test.
2. **Clear value** – Direct ops impact: “who works when” in one place. Delivers quickly.
3. **No auth risk** – OAuth touches login, passwords, and new identity linking; doing it second lets you focus on it without mixing in another big feature.
4. **Foundation for later** – Once working plan exists, you can later add “filter waiters by on-shift” or report by scheduled staff; OAuth doesn’t block that.

### Why OAuth second

1. **Security-sensitive** – Nullable password, new table, multiple providers; deserves a dedicated pass and review.
2. **Incremental** – You can roll out Google first, then Microsoft, then the rest; no need to do it before working plan.
3. **Wider impact** – Affects every user at login; better to ship after a smaller, stable feature (working plan).

### If you prefer OAuth first

- Choose OAuth first if “easier sign-in” or “onboard staff with Google/Microsoft” is the top priority.
- Then do Working plan as the next feature.

---

## Optional: 0020 follow-ups

After 0021 (and optionally 0022), you can add from the 0020 checklist:

- Public menu rate limits (e.g. 30/min per IP).
- File upload rate limits (e.g. 10/hour per user).

These are incremental hardening, not required for working plan or OAuth.

---

## Suggested order (summary)

1. **0021 – Working plan** (kitchen, bar, waiters rota).  
2. **0022 – OAuth** (Google, then Microsoft, then GitHub/Facebook as needed).  
3. **0020 –** Optional extra rate limits (public menu, uploads).  
4. **0019 –** No work; already implemented.
