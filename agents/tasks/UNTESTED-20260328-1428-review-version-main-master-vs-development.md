# Review version of main/master vs development

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/115

## Problem / goal
Decidir si conviene integrar **`development` → `master`** y desplegar a producción (p. ej. amvara9) porque hay muchas novedades pendientes. Tras un despliegue, revisar el estado del workflow de despliegue en GitHub. Ejecutar smoke tests contra **https://satisfecho.de** para confirmar que el sitio responde bien y no hay errores **500** ni **503** por fallos del backend.

Contexto de ramas y cuándo promover a **`master`**: **`.cursor/rules/git-development-branch-workflow.mdc`**, **`docs/agent-loop.md`**, **`docs/0001-ci-cd-amvara9.md`**, **`AGENTS.md`** (smoke / Puppeteer).

## High-level instructions for coder
- Comparar el estado de **`master`** frente a **`development`** (commits, changelog, versión en `front/package.json` si aplica) y decidir si procede la promoción según las reglas del repo (ventana ~2 h, cambio grande a producción, o petición explícita en el issue).
- Si se despliega a amvara9: seguir el flujo documentado (`scripts/deploy-amvara9.sh`, migraciones antes de servir tráfico) y verificar la ejecución del action de despliegue en GitHub.
- Tras despliegue o si ya está al día: smoke en **satisfecho.de** (p. ej. landing, rutas críticas, sin 5xx); documentar resultado en el issue **#115**.
- No asumir merge a **`master`** sin alinearlo con la política de promoción; si solo aplica empujar **`development`**, dejarlo claro en el comentario del issue.

## Implementation (feature coder 006, 2026-03-28 UTC)

- **FEAT → WIP** al iniciar; cierre en **UNTESTED** con instrucciones de prueba.
- **Comparación previa al merge:** `origin/master` estaba en **`ac2471f`** (*Merge development: migration preset timestamp defaults #112*). `origin/development` en **`461a0b6`** — **69 commits** por delante (fast-forward). `front/package.json` **2.0.64** en ambas puntas; **`CHANGELOG.md`** tenía entradas sustanciales bajo **`[Unreleased]`** (legal SPA, working-plan colors, HAProxy probes, fixes #65 #67 #99 #112, agent loop, etc.).
- **Decisión:** Promoción acorde al issue **#115** (evaluación explícita de integración) + volumen de cambios listos en **`development`** → **`git merge --ff-only origin/development`** sobre **`master`** y **`git push origin master`** (ejecutado en esta sesión: **`ac2471f..461a0b6`**).
- **amvara9 / GitHub Actions:** No se ejecutó **`scripts/deploy-amvara9.sh`** desde este entorno (SSH/servidor operador). Tras el push a **`master`**, conviene desplegar con el flujo documentado en **`docs/0001-ci-cd-amvara9.md`** y comprobar el workflow en GitHub.
- **Smoke en producción (pre-despliegue del nuevo tip):** `GET https://satisfecho.de/` → **200**; `GET https://satisfecho.de/api/health` → **200**; `GET https://satisfecho.de/api/docs` → **200**. Puppeteer **`test:landing-version`** con **`LANDING_VERSION_ONLY=1`** (ver abajo) → **PASS**; el pie mostraba **`2.0.64 ac2471f`** (despliegue aún en commit anterior hasta el siguiente deploy).
- **Código:** Se añadió **`LANDING_VERSION_ONLY`** en **`front/scripts/test-landing-version.mjs`** para poder hacer smoke solo de landing/version cuando **`.env`** tiene credenciales de demo que no aplican al host remoto (evita **401** en login contra producción).

## Testing instructions

1. **Tras desplegar el tip actual de `master` en amvara9 (o el entorno que use satisfecho.de):** comprobar que el pie de la landing refleja un hash cercano al de **`master`** y que no hay **5xx** en rutas habituales.
2. **HTTP rápido:**  
   `curl -sS -o /dev/null -w '%{http_code}\n' https://satisfecho.de/`  
   `curl -sS -o /dev/null -w '%{http_code}\n' https://satisfecho.de/api/health`  
   Esperado: **200** en ambos (y sin **503** en ventanas de arranque HAProxy si aplica).
3. **Puppeteer (solo landing + versión en remoto, sin login):** desde **`front/`**:  
   `LANDING_VERSION_ONLY=1 BASE_URL=https://satisfecho.de npm run test:landing-version`  
   Esperado: mensaje **`>>> RESULT: Landing page shows version.`** y código de salida **0**.
4. **Opcional (staff en producción):** con **`LOGIN_EMAIL` / `LOGIN_PASSWORD`** válidos para el tenant de prueba, ejecutar el mismo script **sin** **`LANDING_VERSION_ONLY`** para recorrer sidebar (si la política de cuentas lo permite).
