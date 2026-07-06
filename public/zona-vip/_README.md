# Tefía en Teatro

Proyecto Astro del sitio web del musical Tefía en Teatro.

## Tecnologías principales
- Astro (renderizado estático + islands)
- Serverless (AWS Lambda / CloudFront Functions) para acceso VIP
- CloudFront Signed Cookies para proteger `/zona-vip/*`

## Zona VIP – Scripts
Los scripts específicos de la zona VIP se sirven directamente desde `public/zona-vip/scripts/`.

### ¿Por qué están en `public/`?
- CloudFront aplica las Signed Cookies a rutas protegidas tal cual se solicitan; mantener los archivos sin transformación evita discrepancias de path.
- Garantiza que el contenido JS y sus rutas permanezcan estables (sin hash de build) para reglas y políticas en CDN.
- Permite inspección y depuración directa de ficheros estáticos en producción.
- Evita incluir código sensible o innecesario en el bundle global de la parte pública.

### Limpieza realizada
Se han eliminado duplicados que antes existían en `src/scripts/`:
```
src/scripts/gallery-loader.js
src/scripts/gallery-photo-detail.js
src/scripts/vip-photo-detail.js
src/scripts/gallery/* (cards.js, download.js, filters.js, loader.js, state.js, storage.js)
```
La versión canónica ahora es la que vive en:
```
public/zona-vip/scripts/
```
Incluye:
- `gallery-loader.js`
- `gallery-photo-detail.js`
- `vip-photo-detail.js`
- Módulos en `gallery/`: `cards.js`, `download.js`, `filters.js`, `loader.js`, `state.js`, `storage.js`

### Añadir nuevo código VIP
1. Crear el archivo dentro de `public/zona-vip/scripts/`.
2. Importarlo desde las páginas Astro mediante `<script type="module" src="/zona-vip/scripts/tu-script.js"></script>`.
3. Evitar volver a colocar lógica VIP en `src/scripts/` para no reintroducir duplicados.
4. Si un script requiere transformación (TypeScript, etc.), considerar un pequeño build específico que emita el resultado final dentro de `public/zona-vip/scripts/`.

### Desarrollo local
Los ficheros en `public/` no pasan por el pipeline de Astro: cualquier cambio se refleja al recargar porque se sirven como estáticos. Asegúrate de limpiar caches del navegador si modificas nombres o rutas.

### Nota sobre seguridad
El JS en `public/` no debe contener secretos; la protección real la aplica CloudFront mediante Signed Cookies. El client-side sólo asume que si el usuario alcanzó la página es porque sus cookies son válidas.

## Serverless / Infra
Ver `serverless/README.md` para detalles de funciones de login/logout y configuración CloudFront.

## Versión
El script `scripts/gen-version.js` puede actualizar metadatos de versión si se integra en el pipeline (pendiente de documentación específica).

---
Última actualización: 2025-11-22
