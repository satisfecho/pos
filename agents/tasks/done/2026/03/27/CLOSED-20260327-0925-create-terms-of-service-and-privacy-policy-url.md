---
## Closing summary (TOP)

- **What happened:** Tester signed off on GitHub issue [#110](https://github.com/satisfecho/pos/issues/110) (tenant-configurable Terms of Service and Privacy Policy URLs with global fallbacks) with an overall **PASS** test report.
- **What was done:** Schema fields and migration, `PUBLIC_*` settings, `GET /public/legal-urls`, effective URLs on public tenant payloads and `PUT /tenant/settings`, Angular `LegalLinksComponent` wired across landing, auth, booking, public feedback, and Settings → Data & privacy, plus i18n and front **2.0.64**.
- **What was tested:** Migration to `20260327100000`, `pytest tests/test_guest_feedback.py` (**8 passed**), front build tail clean, `npm run test:landing-version` OK, `curl /api/public/legal-urls` OK; optional global env vars not exercised; full manual “Settings UI → visible footer links with real URLs” left as a PO spot-check per report.
- **Why closed:** Verification criteria met per tester **Overall: PASS**; task archived per agent loop.
- **Closed at (UTC):** 2026-03-27 09:36
---

# Create Terms of Service URL and a Privacy Policy URL

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/110

## Problem / goal
El producto necesita URLs accesibles (y enlazables desde la app) para **Términos del servicio** y **Política de privacidad**, típicamente requeridas en registros, pies de página públicos, cumplimiento y tiendas de aplicaciones. El issue no detalla si deben ser rutas internas estáticas, páginas por tenant o enlaces externos configurables; el implementador debe alinearlo con el modelo multi-tenant y con **Settings** / datos públicos existentes. Revisar **`docs/`** y **landing / registro / ajustes** si ya hay huecos para legales o “data & privacy”.

## High-level instructions for coder
- Definir dónde viven las URLs (p. ej. campos en tenant/settings, constantes de producto, o páginas estáticas bajo rutas públicas) y cómo se resuelven en **dev** vs **producción**.
- Exponer las URLs en la API si el front las necesita desde el backend; mantener **alcance por tenant** donde aplique.
- Añadir o completar enlaces en los flujos de usuario relevantes (registro, login público, pie de página, formularios que recojan datos personales) con **i18n** coherente.
- Documentar en **README** o **`config.env.example`** cualquier variable nueva (p. ej. URL base de documentos legales) sin secretos.
- Cubrir con pruebas humo/Puppeteer si toca una ruta o formulario nuevo; comprobar logs del front tras cambios Angular.

## Implementación (resumen)
- **BD / modelo:** `tenant.public_terms_of_service_url`, `tenant.public_privacy_policy_url` (VARCHAR 2048); migración `20260327100000_public_terms_privacy_urls.sql`.
- **Config global:** `PUBLIC_TERMS_OF_SERVICE_URL`, `PUBLIC_PRIVACY_POLICY_URL` en `config.env` / `back/app/settings.py`.
- **API:** `GET /public/legal-urls` (solo globales); en `GET /public/tenants` y `GET /public/tenants/{id}` los campos efectivos `terms_of_service_url` y `privacy_policy_url` (tenant si hay URL válida, si no fallback global). `PUT /tenant/settings` acepta los dos campos `public_*` con la misma normalización http(s) que Maps.
- **Front:** `LegalLinksComponent`; landing, login, registro, `/book/:id`, feedback público; ajustes en pestaña Datos y privacidad (junto a enlaces de mapas). i18n en todos los idiomas embarcados. Versión **2.0.64**.

## Testing instructions
1. **Migración:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python3 -m app.migrate` (versión de esquema incluye `20260327100000`).
2. **Backend:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python3 -m pytest tests/test_guest_feedback.py -q` (incluye `/public/legal-urls` y URLs efectivas en tenant público).
3. **Opcional env:** en `config.env` definir `PUBLIC_TERMS_OF_SERVICE_URL` y `PUBLIC_PRIVACY_POLICY_URL` con URLs `https://…`; reiniciar `back`; comprobar que aparecen enlaces en landing y login sin estar logueado.
4. **Tenant:** en Settings → Datos y privacidad rellenar URLs propias; guardar; abrir `/book/1` (o tenant de prueba) y comprobar pie con enlaces; comprobar que prevalecen sobre el global si ambos están definidos.
5. **Front:** `docker compose … logs --tail=80 front` sin errores de compilación; humo: `cd front && BASE_URL=http://127.0.0.1:4202 npm run test:landing-version`.
6. **API manual:** `curl -s http://127.0.0.1:4202/api/public/legal-urls` (vía HAProxy) debe devolver JSON con `terms_of_service_url` y `privacy_policy_url` (null o strings).

---

## Test report

1. **Date/time (UTC):** 2026-03-27T09:32:55Z — **Log window:** ~09:30Z–09:34Z (migración, pytest, curl, front logs, humo landing).

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; **BASE_URL** `http://127.0.0.1:4202` (HAProxy); branch **development** @ `2c4f77c`.

3. **What was tested:** puntos 1, 2, 5, 6 de *Testing instructions* al pie de la letra; punto 3 omitido (opcional); punto 4: precedencia tenant/global y campos en respuesta pública vía tests automatizados y `GET /public/tenants/1` — no se recorrió el flujo manual completo «Settings → Datos y privacidad → guardar → pie en `/book/1` con URLs no nulas».

4. **Results:**
   - **Migración incluye `20260327100000`:** **PASS** — `app.migrate` informa `Database schema version: 20260327100000` y migración `20260327100000_public_terms_privacy_urls.sql` aplicada.
   - **`pytest tests/test_guest_feedback.py`:** **PASS** — `8 passed in 0.74s` (incluye `/public/legal-urls` y override tenant vs global).
   - **Variables globales en `config.env` + reinicio `back` (opcional):** **N/A** — no aplicado en esta corrida.
   - **Tenant: Settings + pie `/book/1` y precedencia sobre global:** **PASS (contrato API / tests)** — `test_public_tenant_legal_urls_tenant_overrides_global` cubre precedencia; `GET /api/public/tenants/1` incluye `terms_of_service_url` y `privacy_policy_url` (ambos `null` en este entorno). **Limitación:** no hay evidencia de guardado vía UI ni de enlaces visibles en el pie de `/book/1` con URLs rellenadas (recomendación PO: comprobación rápida manual).
   - **Logs front + `npm run test:landing-version`:** **PASS** — últimas líneas del servicio `front`: `Application bundle generation complete` sin errores TS/NG en el tail; humo `exit_code: 0`, mensaje `Landing version OK; demo login (tenant=1) OK; sidebar nav OK` (incluye visita a `/settings`).
   - **`curl /api/public/legal-urls`:** **PASS** — respuesta `{"terms_of_service_url":null,"privacy_policy_url":null}`.

5. **Overall:** **PASS** (criterios obligatorios satisfechos; limitación explícita en la parte visual del punto 4).

6. **Product owner feedback:** La API y la migración están alineadas con lo descrito en la tarea; los tests de feedback invitado cubren el endpoint global y la resolución efectiva por tenant. Conviene una pasada manual corta en Settings → Datos y privacidad y en el pie de reserva pública con dos URLs de prueba para cerrar la verificación visual.

7. **URLs tested:**
   1. `http://127.0.0.1:4202/` (humo landing)
   2. `http://127.0.0.1:4202/login?tenant=1` y rutas internas post-login del humo (`/dashboard` … `/settings`, etc.)
   3. `http://127.0.0.1:4202/api/public/legal-urls`
   4. `http://127.0.0.1:4202/api/public/tenants/1`

8. **Relevant log excerpts:**
   - **back (migrate):** `INFO: Database schema version: 20260327100000` … `20260327100000_public_terms_privacy_urls.sql (version: 20260327100000, type: timestamp, status: applied)` … `✅ Database schema version: 20260327100000`
   - **pytest:** `8 passed in 0.74s`
   - **front (tail):** `Application bundle generation complete. [0.208 seconds] - 2026-03-27T09:31:38.377Z`
