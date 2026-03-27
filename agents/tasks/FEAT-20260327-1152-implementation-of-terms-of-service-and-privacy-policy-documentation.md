# feat: implementation of Terms of Service and Privacy Policy documentation

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/113

## Problem / goal
Formalizar documentación legal para cumplir requisitos de APIs externas (p. ej. TikTok Login Kit): redactar **Términos de servicio (ToS)** y **Política de privacidad** para `satisfecho.de`, publicarlas en rutas públicas accesibles y usables como URLs oficiales en configuración OAuth (“Global Config”). El contenido debe ser coherente con GDPR/transparencia y con el branding actual; responsive en móvil.

## High-level instructions for coder
- Revisar si ya existen rutas o contenido legal en el front (p. ej. `/terms`, `/privacy`, componentes legales, `legal-urls`) y alinear con el issue sin duplicar trabajo cerrado en #110 si aplica.
- Implementar o completar páginas públicas que respondan en producción como `https://satisfecho.de/terms` y `https://satisfecho.de/privacy` (sin 404); ver despliegue/nginx/HAProxy según `docs/` si hace falta.
- Asegurar que el texto y la estructura cubran recogida, uso y almacenamiento de datos de usuario de forma razonable para GDPR; coordinar redacción legal con el propietario del producto si el repo no debe contener texto legal definitivo.
- Verificar enlaces desde flujos que requieran ToS/privacidad (registro, reservas, OAuth) y que las URLs configurables apunten a estas páginas tras el despliegue.
