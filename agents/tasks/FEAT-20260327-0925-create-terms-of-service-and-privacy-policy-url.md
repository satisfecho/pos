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
