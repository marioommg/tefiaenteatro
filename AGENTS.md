# tefiaenteatro.com

Sitio web del musical [Tefía en Teatro](https://tefiaenteatro.com). Repositorio open source del código (licencia MIT). El contenido artístico (fotos, audio, vídeos) no se distribuye aquí; ver `README.md`.

## Stack

- **Framework:** Astro 5 (sitio estático)
- **Hosting:** AWS S3 + CloudFront
- **Correo:** Zoho (MX) + Amazon SES (transaccional)
- **Backend:** AWS Lambda + SNS + SES
- **CDN / DNS:** Cloudflare (proxy orange cloud → CloudFront)
- **Build:** `node src/develop-scripts/gen-version.js && astro build`

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Typecheck + build producción |
| `npm run deploy` | Ejecuta `deploy.ps1` |
| `npm run thumbs:elenco` | Genera thumbnails de elenco |

## Deploy

`deploy.ps1` sincroniza `dist/` con S3 e invalida CloudFront. Configura `$bucket` y `$distributionId` con tus recursos AWS.

Flags: `--build` / `--nobuild`, `--media-all` / `--media-new` / `--media-none`, `-Yes`, `-DryRun`, `-Profile <nombre>`.

## Variables de entorno

Copia `.env.example` → `.env`. Nunca commitees `.env`.

| Variable | Uso |
|----------|-----|
| `PUBLIC_REVISION_API_URL` | Lambda de revisiones de fotos |
| `SNS_TOPIC_ARN` | Notificaciones SNS |
| `S3_UPLOADS_BUCKET` / `S3_UPLOADS_REGION` | Subidas de revisiones |
| `SES_SENDER_EMAIL` / `SES_REGION` | Email transaccional |
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
