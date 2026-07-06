# tefiaenteatro.com

Sitio web del musical [Tefía en Teatro](https://tefiaenteatro.com). Repositorio open source del código (licencia MIT). El contenido artístico (fotos, audio, vídeos) no se distribuye aquí; ver `README.md`.

## Stack

- **Framework:** Astro 5 (sitio estático)
- **Hosting:** AWS S3 + CloudFront
- **Correo:** Zoho (MX) + Amazon SES (transaccional)
- **Backend:** AWS Lambda + SES
- **CDN / DNS:** Cloudflare (proxy orange cloud → CloudFront)
- **Build:** `node src/develop-scripts/gen-version.js && astro build`

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Typecheck + build producción |
| `npm run deploy` | Ejecuta `deploy.ps1` |
| `npm run thumbs:elenco` | Genera thumbnails de elenco |
| `.\scripts\enable-s3-versioning.ps1 -Profile <perfil>` | Activa versioning + lifecycle S3 (idempotente) |
| `.\scripts\setup-s3-oac.ps1 -Profile <perfil>` | Migra OAI → OAC en CloudFront + bucket policy (idempotente) |
| `npm run setup-access-logs` | S3 server access logging (perfil `iam-auditor`) |
| `npm run deploy-lambda-photo-report` | Despliega Lambda `photo-report` (Function URL + env) |
| `.\scripts\retire-submit-revision.ps1 -Profile <perfil>` | Retira Lambda legacy `submit-revision` tras verificar producción |
| `.\scripts\verify-aws-encryption.ps1 -Profile <perfil>` | Verifica y aplica SSE-S3 (AES256) en buckets; opcional SNS KMS (#16/#18) |

## Deploy

`deploy.ps1` sincroniza `dist/` con S3 e invalida CloudFront. Configura `$bucket` y `$distributionId` con tus recursos AWS.

Flags: `--build` / `--nobuild`, `--media-all` / `--media-new` / `--media-none`, `-Yes`, `-DryRun`, `-Profile <nombre>`.

## S3 (versioning, lifecycle, cifrado y access logs)

| Bucket | Región | Versioning | Lifecycle | Access logs | Cifrado |
|--------|--------|------------|-----------|-------------|---------|
| `tefiaenteatro.com` | `eu-north-1` | Enabled | Expira versiones no-actuales a 30 días | `audit-logs-282662225889/s3-access-logs/tefiaenteatro.com/` | SSE-S3 (AES256) |

- **Único bucket S3 real del proyecto.** `tefia-revision-uploads` (referenciado en `.env.example`) no existe en AWS; la Lambda `photo-report` ya no sube a S3.
- **Versioning/lifecycle:** `scripts/enable-s3-versioning.ps1` requiere `-Profile` con permisos de configuración de bucket (p. ej. `iam-auditor`; el perfil `deploy-sites` solo sincroniza objetos).
- **Cifrado en reposo (TODO #16):** `scripts/verify-aws-encryption.ps1 -Profile <perfil>` verifica y aplica SSE-S3 (AES256) de forma idempotente (`-DryRun` disponible).
- **SNS (TODO #18):** mismo script con `-IncludeSns` verifica `KmsMasterKeyId`; `-EnforceSnsEncryption` aplica `alias/aws/sns` si falta.
- **S3 access logs (TODO #23):** `scripts/setup-access-logs.ps1` (o `enable-s3-versioning.ps1 -EnableAccessLogging`). Destino `audit-logs-282662225889`, prefijo `s3-access-logs/tefiaenteatro.com/`. La bucket policy del destino ya cubre `s3-access-logs/*` en la cuenta.
- **CloudFront standard access logs (TODO #12):** descartado — plan Free de CloudFront no lo permite (mismo criterio que COLECTIVORADIOPATIO #17). Métricas básicas en consola AWS; analytics de visitantes vía herramienta frontend si se necesita.

## CloudFront → S3 (OAC)

El bucket `tefiaenteatro.com` solo es accesible vía CloudFront usando **Origin Access Control (OAC)** — no OAI (deprecado).

| Recurso | Valor |
|---------|-------|
| Distribución CloudFront | `E29CMKJWGWAZ58` |
| OAC | `oac-tefia-prod` |
| Origen S3 | `tefiaenteatro.com.s3.eu-north-1.amazonaws.com` (REST, no website) |

- **Script idempotente:** `scripts/setup-s3-oac.ps1` requiere `-Profile` con permisos CloudFront + S3 bucket policy (p. ej. `iam-auditor`; `deploy-sites` solo sincroniza objetos).
- **Qué hace:** crea OAC si falta, asigna `OriginAccessControlId` al origen S3, actualiza bucket policy (`cloudfront.amazonaws.com` + `AWS:SourceArn`), elimina OAI legacy si quedara huérfano.
- **Verificar sin cambios:** `.\scripts\setup-s3-oac.ps1 -Profile iam-auditor -DryRun`

**Verificación access logs:**

```powershell
aws s3api get-bucket-logging --bucket tefiaenteatro.com --profile iam-auditor
aws s3 ls s3://audit-logs-282662225889/s3-access-logs/tefiaenteatro.com/ --profile iam-auditor
```

Los objetos de log pueden tardar 15–60 min en aparecer tras el primer tráfico.

## Lambda `photo-report` (reportes galería VIP)

Reemplazo de la legacy `submit-revision`. La galería VIP envía peticiones de modificar/borrar metadatos de fotos; la Lambda manda email vía SES a `contacto@tefiaenteatro.com`.

| Recurso | Valor |
|---------|-------|
| Función | `photo-report` (`us-east-1`) |
| Auth | Header `X-Report-Auth` = `PHOTO_REPORT_SECRET` (build-time en `.env`) |
| Rate limit | 5 req/h por IP (en memoria) |

**Despliegue:**

```powershell
npm run deploy-lambda-photo-report
# actualiza .env con PUBLIC_REVISION_API_URL + PHOTO_REPORT_SECRET
npm run build && npm run deploy
```

**Retirar legacy** (solo tras verificar la galería en producción):

```powershell
.\scripts\retire-submit-revision.ps1 -Profile iam-auditor -DryRun:$false
```

**Prueba manual:**

```powershell
node serverless/api/photo-report/test.js <PHOTO_REPORT_SECRET> <FUNCTION_URL>
```

## Variables de entorno

Copia `.env.example` → `.env`. Nunca commitees `.env`.

| Variable | Uso |
|----------|-----|
| `PUBLIC_REVISION_API_URL` | Function URL de `photo-report` |
| `PHOTO_REPORT_SECRET` | Secreto en Lambda (`X-Report-Auth`) |
| `PUBLIC_PHOTO_REPORT_AUTH` | Mismo valor; embebido en build de galería VIP |
| `SES_SENDER_EMAIL` / `SES_REGION` | Email transaccional (Lambda) |
| `VIP_PASSWORD_HASH` | Hash bcrypt de la zona VIP |
| `CLOUDFLARE_API_TOKEN` | Token de zona (solo deploy) |

## Zona VIP

- Login: Lambda `serverless/api/vip-login` → CloudFront Signed Cookies
- Logout: `serverless/api/vip-logout`
- Galería: `public/zona-vip/galeria/` + `src/data/gallery.manifest.json`
- Scripts VIP en `public/zona-vip/scripts/` (no pasan por el bundle de Astro)

Ver `serverless/README.md` y `public/zona-vip/_README.md`.

## Notas para agentes

- Detalles de infraestructura de producción (DNS, IDs AWS, etc.): ver `AGENTS.local.md` en entorno local (gitignored).
- Media pesado excluido del repo: `gallery-archive/`, galería VIP, audios, vídeos de timeline. Ver `docs/MEDIA.md`.
