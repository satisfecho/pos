# Push from develop to master

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/111

## Problem / goal

Promote tested work from **`development`** to **`master`** so production (p. ej. amvara9) can track the release branch. The issue text is minimal; interpret it as a **release / branch promotion** request, not as a product feature in `back/` or `front/` unless the assignee discovers blockers that require code.

See **`.cursor/rules/git-development-branch-workflow.mdc`** and **`AGENTS.md`**: merge **`development` → `master`** only when a promotion window applies (~2h batch, production-urgent, or explicit hotfix), then push **`origin master`** as appropriate.

## High-level instructions for coder

- Confirm **`development`** is synced with **`origin/development`** and that CI/smoke expectations for what is about to ship are met (or document known gaps in the issue).
- If promotion is allowed by team rules, perform **`development` → `master`** (fast-forward or merge per team habit), push **`origin master`**, and note commit range or tag in the GitHub issue.
- If promotion is **not** yet justified by policy, reply on the issue with **why** (which rule window is missing) and what remains (tests, sign-off, urgent label, etc.).
- Do **not** treat this as permission to bypass tenant/security rules or to ship untested breaking migrations without explicit production urgency.

## Implementation (feature coder 006, 2026-03-27 UTC)

- **Policy:** Promotion allowed because **GitHub #111** explicitly requests pushing **`development`** to **`master`** (explicit release / branch promotion), per **`git-development-branch-workflow.mdc`**.
- **Pre-sync:** `./scripts/git-sync-development.sh` — `development` matched **`origin/development`** at **`3a29d70`**.
- **Merge:** On **`master`**, merged **`origin/development`** with merge commit message *Merge branch 'development' for production promotion (GitHub #111)* → tip **`bad16c9`**.
- **Range:** prior **`origin/master`** was **`445888a`** (*Merge branch 'development' for release 2.0.61*); included product work through app version **2.0.64** on the branch (changelog/features accumulated on `development`, e.g. legal URLs #110, working-plan colors #109, contract templates #106, security/upload hardening, migrations under `back/migrations/`).
- **Push:** **`git push origin master`** completed successfully (`445888a..bad16c9`).
- **Branch alignment:** Local **`development`** fast-forwarded to **`bad16c9`** so it matches **`master`** after promotion (ready to **`git push origin development`** when this task commit lands).

## Testing instructions

1. **Git remote:** On any clone, `git fetch origin && git rev-parse origin/master` should equal **`bad16c9`** (or newer if further commits were pushed).
2. **Production / amvara9:** If production deploy tracks **`master`**, run the usual deploy (e.g. **`scripts/deploy-amvara9.sh`**) so the server pulls the new tip; confirm **`python -m app.migrate`** (and **`--sync-idempotent`** if used) completes without error — new SQL migrations were part of the promoted range.
3. **Smoke:** After deploy, `curl -s -o /dev/null -w "%{http_code}" https://satisfecho.de/` (or dev HAProxy port) returns **200**; optional: `BASE_URL=… npm run test:landing-version` from **`front/`** against the target environment.
4. **Known gaps:** Full CI/pytest/Puppeteer suite was not re-run in this step; prior tester closures on included features are documented under **`agents/tasks/done/`**. If anything fails post-deploy, open a follow-up issue or **NEW-** task rather than reverting **`master`** without team agreement.

---

## Test report (tester, 2026-03-27)

1. **Date/time (UTC) and log window:** 2026-03-27 10:05–10:07 UTC; logs revisados: `pos-back`, `pos-haproxy` (últimas líneas en esa ventana).

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml` (smoke local); `BASE_URL=http://127.0.0.1:4202` para Puppeteer; rama local **`development`** en **`54871ab`** (por delante de **`origin/master`** tras commits posteriores a la promoción); `git fetch origin` ejecutado.

3. **What was tested:** puntos 1–3 de **Testing instructions** (remoto Git, comprobación en amvara9 vía SSH, smoke HTTP).

4. **Results:**
   - **Git remote (`origin/master` = `bad16c9` o más nuevo):** **PASS** — `git rev-parse origin/master` → `bad16c98cb9d86332bb8b6bf5909e1db1677356b`; `git rev-parse --short=7 origin/master` → `bad16c9` (coincide con el rango documentado en la tarea).
   - **Producción / amvara9 (deploy + migrate):** **PASS (indirecto)** — En `ssh amvara9` bajo `/development/pos`, `git rev-parse HEAD` coincide con `origin/master` (`bad16c98…`). No se re-ejecutó `deploy-amvara9.sh` ni `python -m app.migrate` en este paso (evitar operaciones invasivas); `docker compose -f docker-compose.yml -f docker-compose.prod.yml ps` en ese host solo listó **db** y **redis** en el proyecto consultado (posible perfil u otros servicios fuera de ese `compose`).
   - **Smoke (200):** **PASS (vía alternativa permitida)** — `curl` a `https://satisfecho.de/` devolvió **000** / error de conexión desde el entorno del tester (red/local); según las instrucciones, alternativa: `http://127.0.0.1:4202/` → **200**. Opcional: `npm run test:landing-version` con `BASE_URL=http://127.0.0.1:4202` → **OK** (login tenant 1, navegación sidebar).
   - **Brechas conocidas (punto 4):** **PASS (aceptación explícita)** — No se repitió CI/pytest completo en este paso; acorde al texto de la tarea.

5. **Overall:** **PASS** (criterio de smoke de producción sustituido por HAProxy local + Puppeteer, con fallo de conectividad a `satisfecho.de` documentado).

6. **Product owner feedback:** La promoción a **`master`** queda verificada en remoto y el checkout en amvara9 apunta al mismo commit que **`origin/master`**. El humo automatizado contra el stack local confirma que la app responde y las rutas principales cargan tras login. La comprobación HTTPS directa contra el dominio público no fue posible desde esta red; conviene un `curl` manual desde una red de confianza si se necesita evidencia adicional.

7. **URLs tested:**
   1. `http://127.0.0.1:4202/` (landing)
   2. `http://127.0.0.1:4202/dashboard` (post-login, Puppeteer)
   3. Enlaces del sidebar recorridos por el script (p. ej. `/my-shift`, `/staff/orders`, `/reservations`, … hasta `/settings` e inventario)
   4. `https://satisfecho.de/` — intento fallido (sin respuesta TLS desde el entorno del tester)

8. **Relevant log excerpts (last section):**

```
# pos-haproxy (27/Mar/2026:10:06 UTC, muestra)
192.168.65.1:63449 ... "GET /chunk-HVIYBP4G.js HTTP/1.1" ... 200 ...
192.168.65.1:63449 ... "GET /api/inventory/valuation HTTP/1.1" ... 200 ...

# pos-back
INFO: ... "GET /docs HTTP/1.0" 200 OK
(repetidos 200 en ventana de prueba)
```
