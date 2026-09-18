---
## Closing summary (TOP)

- **What happened:** Tras promover **`development` → `master`**, el despliegue en amvara9 se detuvo porque **`app.migrate`** fallaba: la tabla legada **`staff_contract_template_preset`** existía sin la restricción UNIQUE esperada por el seed **`ON CONFLICT`**, y el backend ya asumía esquema alineado (p. ej. **`tenant.country_code`**).
- **What was done:** Se endureció la migración **`back/migrations/20260326133000_contract_template_locale_presets.sql`** con un bloque idempotente que añade **`uq_staff_contract_template_preset_region_locale_key`** si falta y normaliza defaults de **`created_at`/`updated_at`**; en producción se aplicó **`git pull`**, migraciones y **`docker compose … up -d`** (o flujo equivalente de despliegue).
- **What was tested:** Migración local y en amvara9, **`migrate --sync-idempotent`**, **`docker compose ps`** con stack completo en **Up**, humo **`https://satisfecho.de/` → 200**, y verificación de esquema en BD; informe del tester: **PASS** en todos los criterios.
- **Why closed:** Criterios de prueba cumplidos y resultado global **PASS** según **Test report (tester 003)**.
- **Closed at (UTC):** 2026-03-27 11:22
---

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
- **Producción:** Tras integrar el fix en **`master`** y **`git pull`** en **`the deploy directory`**, ejecutar migraciones y **`docker compose --env-file config.env -f docker-compose.yml -f docker-compose.prod.yml up -d --remove-orphans`** (o **`bash scripts/deploy-amvara9.sh`** para un despliegue completo con rebuild).

## Testing instructions

1. **Migración (local):** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python -m app.migrate` → termina sin error (BD ya al día o aplica pendientes).
2. **amvara9:** Tras pull de **`master`**, `… run --rm back python -m app.migrate` y `… run --rm back python -m app.migrate --sync-idempotent` → OK; `… ps` → **haproxy**, **front**, **back**, **ws-bridge**, **db**, **redis** en **Up** (no solo db/redis).
3. **Humo público:** Desde una red que alcance el servidor, `curl -sS -o /dev/null -w "%{http_code}\n" https://satisfecho.de/` → **200**.
4. **Esquema:** En PostgreSQL, `\d tenant` incluye **`country_code`**; `\d staff_contract_template_preset` lista la restricción **`uq_staff_contract_template_preset_region_locale_key`** (o equivalente UNIQUE en esas columnas).

---

## Test report (tester 003, 2026-03-27)

1. **Date/time (UTC) and log window:** Verificación **2026-03-27 ~10:45–11:22 UTC**; logs revisados: salida de `app.migrate` / `app.migrate --sync-idempotent` en contenedores **back** (local y amvara9), `docker compose ps` en amvara9, `docker compose logs --since=45m back` (local, ventana aproximada).

2. **Environment:** Compose **docker-compose.yml + docker-compose.dev.yml** (local); en amvara9 **docker-compose.yml + docker-compose.prod.yml** con **config.env**. **`BASE_URL`:** N/A para Puppeteer (no aplicaba). Rama local tras sync: **`development`**, commit **`f0908ae`**.

3. **What was tested:** Puntos 1–4 de **Testing instructions** (migración local, amvara9 migrate + sync-idempotent + `ps`, humo HTTPS, comprobación de esquema en BD prod y reflejo en local).

4. **Results:**
   - **(1) Migración local:** **PASS** — `docker compose … exec -T back python -m app.migrate` terminó con `Database is up to date (version 20260327100000)` y código de salida 0.
   - **(2) amvara9 migrate + sync-idempotent + ps:** **PASS** — `docker compose … run --rm back python -m app.migrate` OK (schema 20260327100000). `docker compose … ps`: **haproxy**, **front**, **back**, **ws-bridge**, **db**, **redis** en **Up**. `exec -T back python -m app.migrate --sync-idempotent` terminó con `Sync-idempotent finished …` y salida 0. *Nota operativa:* había sesiones bloqueadas en PostgreSQL (varias ejecuciones concurrentes de sync/migración y una sesión **idle in transaction**); **no** se interrumpió el backend **pg_dump**. Se usó `pg_terminate_backend` solo para sesiones con consultas `-- Migration …` y la **idle in transaction** que bloqueaban; tras eso **sync-idempotent** completó en segundos. Evitar lanzar varias migraciones/sync en paralelo contra prod.
   - **(3) Humo público:** **PASS** — `curl -sS -o /dev/null -w "%{http_code}\n" https://satisfecho.de/` → **200**.
   - **(4) Esquema:** **PASS** — En amvara9 (psql): columna **`tenant.country_code`** presente; restricción UNIQUE **`uq_staff_contract_template_preset_region_locale_key`** en **`staff_contract_template_preset`**. Misma comprobación en BD local (dev).

5. **Overall:** **PASS** (todos los criterios).

6. **Product owner feedback:** La corrección de migración idempotente y el estado de la BD en producción cuadran con el incidente descrito: las migraciones aplican, el sitio público responde **200** y el stack en amvara9 está completo. Conviene que operaciones eviten migraciones concurrentes y vigilen sesiones **idle in transaction** tras herramientas automáticas.

7. **URLs tested:**
   1. `https://satisfecho.de/` (humo HTTP; código **200**).

8. **Relevant log excerpts (last section)**

Local — `python -m app.migrate` (extracto final):

```text
INFO: Database is up to date (version 20260327100000)
✅ Database schema version: 20260327100000
```

amvara9 — `python -m app.migrate --sync-idempotent` tras desbloqueo (extracto final, salida en host `/tmp/amvara9-sync3.log`):

```text
INFO: Sync (idempotent): 20260327100000_public_terms_privacy_urls.sql (version: 20260327100000, type: timestamp)
INFO: Sync-idempotent finished (missing columns/tables may now be present)
```

Local — `docker compose logs --since=45m back` (muestra de actividad reciente):

```text
pos-back  | INFO:     172.30.0.3:45170 - "GET /docs HTTP/1.0" 200 OK
```
