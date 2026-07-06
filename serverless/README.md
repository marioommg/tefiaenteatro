# Serverless Functions

## CloudFront Functions

### cf-rewrite-index.js
**Trigger**: Viewer Request  
**Purpose**: 
1. Verifica que el tráfico viene de Cloudflare (header `cf-ray`, añadido automáticamente por Cloudflare)
2. Reescribe URIs para añadir `index.html` automáticamente, excepto rutas del API

> **Requiere** que los DNS en Cloudflare tengan el proxy orange cloud activado.

**Lógica:**
- Ignora rutas que comiencen con `/api/`
- Normaliza `/` a `/index.html`
- Añade `index.html` a URIs que terminen en `/`
- Trata URIs sin extensión como directorios (añade `/index.html`)
- No modifica URIs con extensión de archivo

**Configuración:**
- Behavior `Default (*)` → Viewer Request → CloudFront Function

## API Functions

### vip-login
**Endpoint**: POST `/api/vip-login`  
**Purpose**: Genera CloudFront Signed Cookies tras validar contraseña.

**Body JSON:**
```json
{ "password": "tu-contraseña" }
```

**Respuesta exitosa (200):**
```json
{ "ok": true, "until": 1731167700 }
```

**Environment Variables:**
- `VIP_PASSWORD`: Contraseña del área VIP (requerida)
- `CF_PUBLIC_KEY_ID`: ID de la clave pública de CloudFront (requerida)
- `CF_RESOURCE`: Recurso a proteger (ej: `https://tudominio.com/zona-vip/*`) (requerida)
- `COOKIE_DOMAIN`: Dominio de las cookies (ej: `.tudominio.com`) (opcional)
- `COOKIE_MAX_AGE`: Duración en segundos (default: 86400 = 24h)
- `PRIVATE_KEY_SECRET_ARN`: ARN del secreto con la clave privada (requerida si no hay PRIVATE_KEY_PEM)
- `PRIVATE_KEY_PEM`: Clave privada directa (alternativa a SECRET_ARN)
- `PRIVATE_KEY_CACHE_TTL_SECONDS`: TTL de caché de la clave (default: 21600 = 6h, 0 = nunca expira)
- `VIP_RELEASE_EPOCH`: Unix timestamp para restringir acceso antes de fecha (default: 1731081300 = 2025-11-08 16:35 CET)

**Características:**
- Cache de clave privada con TTL configurable para reducir llamadas a Secrets Manager
- Normalización automática de formato PEM (maneja `\n` escapados)
- Policy JSON custom con fechas DateLessThan y DateGreaterThan (opcional)
- Firma RSA-SHA1 requerida por CloudFront Signed Cookies
- Validación de release date: devuelve 403 si se intenta acceder antes de `VIP_RELEASE_EPOCH`
- Cookies con atributos: Path=/, Secure, HttpOnly, SameSite=Lax, Max-Age

### vip-logout
**Endpoint**: POST `/api/vip-logout`  
**Purpose**: Invalida las cookies de CloudFront.

**Respuesta exitosa (200):**
```json
{ "ok": true }
```

**Environment Variables:**
- `COOKIE_DOMAIN`: Dominio de las cookies (ej: `.tudominio.com`) (opcional)

**Características:**
- Expira las 3 cookies de CloudFront: CloudFront-Policy, CloudFront-Signature, CloudFront-Key-Pair-Id
- Emite múltiples variantes de cookies expiradas para garantizar eliminación:
  - Con dominio configurado
  - Con dominio prefijado con punto (`.dominio.com`)
  - Sin atributo Domain (host-only) como fallback
- Compatible con HTTP API v2 (campo `cookies`) y REST API (campo `multiValueHeaders`)
- Atributos de expiración: Max-Age=0 + Expires=Thu, 01 Jan 1970 00:00:00 GMT

### photo-report
**Endpoint**: Function URL `photo-report` (POST)  
**Purpose**: Recibe reportes de la galería VIP (modificar metadatos o pedir borrado de foto) y envía email vía SES.

**Auth:** header `X-Report-Auth` = `PHOTO_REPORT_SECRET`

**Body JSON (`type: photo_report`):**
```json
{
  "type": "photo_report",
  "action": "modify",
  "photoSlug": "ejemplo",
  "file": "foto.jpg",
  "data": { "people": "...", "event": "..." }
}
```

**Despliegue:** `npm run deploy-lambda-photo-report` (ver `AGENTS.md`)

**Retirar legacy:** `submit-revision` sustituida por esta función (`scripts/retire-submit-revision.ps1`).

## Configuración CloudFront

### Behavior `/zona-vip/*`:
- Restrict viewer access: **Yes**
- Trusted key groups: **zona-vip-keygroup**
- Function associations: **None** (CloudFront maneja las Signed Cookies automáticamente)

### Behavior `Default (*)`:
- Viewer request: **CloudFront Function: cf-rewrite-index**

### Error Pages (Custom Error Responses):
Para convertir 403 en 404 globalmente:
1. CloudFront → Error Pages → Create custom error response
2. HTTP error code: **403**
3. Customize error response: **Yes**
4. Response page path: **/404.html**
5. HTTP response code: **404**
6. Error caching minimum TTL: **10**

## Archivos NO utilizados (legacy)

Los siguientes archivos están en el repositorio pero NO se usan en producción:
- `edge/cf-check-auth.js` - No necesario (CloudFront valida cookies automáticamente)
- `edge/cf-handle-403.js` - Usar Custom Error Pages en su lugar
- `edge/cf-rewrite-index-lambda.js` - Usar CloudFront Function en su lugar
