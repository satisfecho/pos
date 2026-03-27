# Push develop to master

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/112

## Problem / goal
Tras promover **`development` → `master`**, el autor del issue indica que hubo un problema y pide revisarlo y resolverlo. El texto del issue es breve; hace falta **aclarar qué falló** (despliegue, CI, app en producción, migraciones, SSL, etc.) y corregirlo o documentar el siguiente paso.

Contexto de política de ramas: **`.cursor/rules/git-development-branch-workflow.mdc`**, **`docs/agent-loop.md`**, **`docs/0001-ci-cd-amvara9.md`** (si aplica amvara9). La tarea anterior relacionada (**#111**) quedó archivada en **`agents/tasks/done/2026/03/27/CLOSED-20260327-1001-push-from-develop-to-master.md`** — úsala como referencia de lo que ya se hizo en git, sin asumir que el problema actual sea el mismo.

## High-level instructions for coder
- Reproducir o localizar el fallo concreto (preguntar en el issue si hace falta más detalle: URL, error en pantalla, hora aproximada, entorno).
- Si es **producción / amvara9**: seguir **`AGENTS.md`** / **`docs/error-investigation-workflow.mdc`** — logs Docker en servidor, HAProxy, migraciones, `config.env`.
- Si es **CI o build**: revisar el pipeline y el último merge a **`master`**; alinear con el estado de **`development`**.
- Corregir en código o configuración según corresponda; añadir pruebas o smoke acordes al cambio (**`docs/testing.md`**).
- Dejar comentario en **#112** con causa raíz y verificación; actualizar etiquetas del issue según el flujo del equipo.

## Implementation (feature coder 006, 2026-03-27 UTC)

- **Causa raíz (amvara9):** Un despliegue alrededor de **10:05 UTC** detuvo **front / back / haproxy / ws-bridge** (`deploy-amvara9.sh` fase *Stopping app-tier*). El script no llegó a **`up -d`** porque **`python -m app.migrate` falló**: en la BD ya existía **`staff_contract_template_preset`** (vacía) **sin** la restricción **`uq_staff_contract_template_preset_region_locale_key`**. Con **`CREATE TABLE IF NOT EXISTS`** PostgreSQL no recrea la tabla, así que el **`INSERT … ON CONFLICT (region_code, locale, template_key)`** fallaba. El código en imagen ya esperaba **`tenant.country_code`**, lo que generaba errores en arranque si el backend hubiera estado arriba sin migrar.
- **Código:** En **`back/migrations/20260326133000_contract_template_locale_presets.sql`**: (1) bloque **`DO $preset_uq$ … END`** idempotente que añade **`uq_staff_contract_template_preset_region_locale_key`** si falta; (2) **`ALTER COLUMN created_at/updated_at SET DEFAULT NOW()`** si la tabla legada tenía esas columnas NOT NULL sin default (evita fallo del seed con NULL en timestamps).
- **Producción:** Tras integrar el fix en **`master`** y **`git pull`** en **`/development/pos`**, ejecutar migraciones y **`docker compose --env-file config.env -f docker-compose.yml -f docker-compose.prod.yml up -d --remove-orphans`** (o **`bash scripts/deploy-amvara9.sh`** para un despliegue completo con rebuild).

## Testing instructions

1. **Migración (local):** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python -m app.migrate` → termina sin error (BD ya al día o aplica pendientes).
2. **amvara9:** Tras pull de **`master`**, `… run --rm back python -m app.migrate` y `… run --rm back python -m app.migrate --sync-idempotent` → OK; `… ps` → **haproxy**, **front**, **back**, **ws-bridge**, **db**, **redis** en **Up** (no solo db/redis).
3. **Humo público:** Desde una red que alcance el servidor, `curl -sS -o /dev/null -w "%{http_code}\n" https://satisfecho.de/` → **200**.
4. **Esquema:** En PostgreSQL, `\d tenant` incluye **`country_code`**; `\d staff_contract_template_preset` lista la restricción **`uq_staff_contract_template_preset_region_locale_key`** (o equivalente UNIQUE en esas columnas).

---

## Test report

1. **Date/time (UTC):** 2026-03-27 11:20–11:32 UTC (inicio verificación tras renombrar a TESTING; fin al cerrar informe). Ventana de logs revisada: salida estándar de `app.migrate` / `migrate --sync-idempotent` en contenedores **back** (local y amvara9) en esa ventana; sin errores.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml` (local); amvara9: `docker-compose.yml` + `docker-compose.prod.yml` vía SSH **`amvara9`**. **`BASE_URL`:** N/A (no flujo Puppeteer). Rama repo: **`development`**, HEAD **`683185d`**.
3. **What was tested:** Puntos 1–4 de *Testing instructions* (migración local, migración + sync idempotente y `ps` en amvara9, humo HTTPS producción, esquema PostgreSQL en amvara9).
4. **Results:**
   - Criterio 1 (migrate local): **PASS** — `exec -T back python -m app.migrate` exit 0; `Database is up to date (version 20260327100000)`.
   - Criterio 2 (amvara9 migrate + sync + ps): **PASS** — `run --rm back python -m app.migrate` y `… --sync-idempotent` exit 0; `docker compose … ps` muestra **haproxy**, **front**, **back**, **ws-bridge**, **db**, **redis** en **Up**.
   - Criterio 3 (curl producción): **PASS** — `curl -sS -o /dev/null -w "%{http_code}\n" https://satisfecho.de/` → **200**.
   - Criterio 4 (esquema): **PASS** — En amvara9, `\d tenant` incluye columna **`country_code`**; `\d staff_contract_template_preset` incluye **`uq_staff_contract_template_preset_region_locale_key` UNIQUE (region_code, locale, template_key)**.
5. **Overall:** **PASS** (ningún criterio en FAIL).
6. **Product owner feedback:** La migración idempotente para el UNIQUE de plantillas y el estado de la BD en producción quedan alineados con el código desplegado; el sitio público responde 200 y la pila en amvara9 está completa (no solo db/redis). El incidente descrito en la implementación (migrate bloqueando el `up` tras el deploy) queda cubierto por las comprobaciones ejecutadas hoy.
7. **URLs tested:**
   1. `https://satisfecho.de/` (humo HTTP; solo código de estado).
8. **Relevant log excerpts:**
   - Local migrate (tail): `INFO: Database is up to date (version 20260327100000)` / `✅ Database schema version: 20260327100000`
   - amvara9 migrate (tail): mismas líneas `20260327100000` y ✅.
   - amvara9 sync-idempotent (tail): `INFO: Sync-idempotent finished (missing columns/tables may now be present)`
   - amvara9 `ps` (servicios): **pos-back**, **pos-front**, **pos-haproxy**, **pos-ws-bridge**, **pos-postgres**, **pos-redis** — Status **Up**.
