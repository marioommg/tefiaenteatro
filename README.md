# Tefía en Teatro

Sitio web del musical [Tefía en Teatro](https://tefiaenteatro.com) — de la idea en el aula a los escenarios de Madrid.

Repositorio **open source** con el código fuente (licencia MIT). Las fotografías, audios y vídeos del espectáculo no se incluyen aquí; consulta [docs/MEDIA.md](docs/MEDIA.md).

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | [Astro v5](https://astro.build/) (SSG) |
| Hosting | AWS S3 + CloudFront |
| DNS / CDN edge | Cloudflare |
| Zona VIP | CloudFront Signed Cookies + AWS Lambda |
| Email | Zoho (corporativo) + Amazon SES (transaccional) |
| Imágenes | Sharp, scripts de galería propios |

## Páginas principales

| Ruta | Descripción |
|------|-------------|
| `/` | Inicio con vídeo making-of y elenco |
| `/sobre-el-proyecto` | Historia del proyecto (timeline con vídeos) |
| `/elenco`, `/elenco/[slug]` | Fichas del elenco |
| `/direccion/[slug]` | Equipo de dirección |
| `/contacto` | Formulario de contacto |
| `/faq` | Preguntas frecuentes |
| `/zona-vip` | Área privada (contraseña + cookies firmadas) |
| `/zona-vip/galeria` | Galería fotográfica con filtros |
| `/zona-vip/banda-sonora` | Reproductor de la banda sonora |
| `/aviso-legal`, `/privacy-policy`, `/cookies-policy` | Páginas legales |

## Requisitos

- Node.js 18+
- Archivo `.env` local (ver `.env.example`)
- Para deploy: AWS CLI configurado

## Instalación

```bash
git clone https://github.com/marioommg/tefiaenteatro.git
cd tefiaenteatro
npm install
cp .env.example .env   # rellenar con tus valores
```

## Comandos

| Comando | Acción |
|---------|--------|
| `npm run dev` | Servidor de desarrollo en `localhost:4321` |
| `npm run build` | Typecheck + build de producción |
| `npm run preview` | Vista previa del build |
| `npm run deploy` | Sincroniza `dist/` con S3 e invalida CloudFront |
| `npm run thumbs:elenco` | Genera thumbnails del elenco |

## Variables de entorno

Copia `.env.example` a `.env`:

| Variable | Uso |
|----------|-----|
| `PUBLIC_REVISION_API_URL` | URL de la Lambda de revisiones de fotos |
| `SNS_TOPIC_ARN` | ARN del topic SNS de notificaciones |
| `S3_UPLOADS_BUCKET` / `S3_UPLOADS_REGION` | Bucket de subidas |
| `SES_SENDER_EMAIL` / `SES_REGION` | Email transaccional (SES) |
| `VIP_PASSWORD_HASH` | Hash bcrypt de la contraseña VIP |
| `CLOUDFLARE_API_TOKEN` | Token de API de Cloudflare (deploy) |
| `CLOUDFLARE_ZONE_IDS` | Zone ID de Cloudflare para purga de caché |
| `PUBLIC_VIP_VIDEO_6_JULIO_ID` | ID de YouTube del vídeo exclusivo VIP (opcional) |

> **Nunca** commitees `.env` ni credenciales en el código.

## Estructura del proyecto

```
├── public/
│   ├── zona-vip/scripts/    # JS de la galería VIP (servido estático)
│   ├── zona-vip/galeria/    # Fotos VIP (no incluidas en el repo)
│   └── audios/              # Banda sonora (no incluida en el repo)
├── serverless/
│   ├── api/vip-login/       # Lambda: login → Signed Cookies
│   ├── api/vip-logout/      # Lambda: logout
│   ├── api/photo-report/    # Lambda: reportes de fotos
│   └── edge/                # CloudFront Functions
├── src/
│   ├── assets/images/       # Fotos del elenco y dirección
│   ├── components/          # Componentes Astro
│   ├── data/                # Elenco, galería, FAQ, canciones…
│   ├── develop-scripts/     # Scripts de mantenimiento (galería, deploy)
│   ├── layouts/             # Layout principal
│   ├── pages/               # Rutas del sitio
│   └── styles/              # CSS por sección
├── deploy.ps1               # Deploy a S3 + invalidación CloudFront
└── astro.config.mjs
```

## Zona VIP

El acceso a `/zona-vip/*` en producción está protegido con **CloudFront Signed Cookies**:

1. El usuario envía la contraseña a `/api/vip-login` (Lambda)
2. Si es válida, se emiten cookies firmadas
3. CloudFront valida las cookies antes de servir contenido protegido

Detalles de configuración en [serverless/README.md](serverless/README.md).

## Media y contenido artístico

El código es MIT, pero las fotos, músicas y vídeos del musical **no** están licenciados para reutilización libre. Los datos de la zona VIP (manifiesto de galería, letras de canciones, IDs de vídeos exclusivos) tampoco se incluyen — ver [docs/MEDIA.md](docs/MEDIA.md).

## Despliegue

Configura `deploy.ps1` con tu bucket S3 y distribución CloudFront, luego:

```powershell
npm run deploy
# o con opciones:
.\deploy.ps1 --build --media-all -Yes
```

## Licencia

Código fuente: [MIT](LICENSE).

Contenido artístico (fotos, audio, vídeo): todos los derechos reservados por sus autores.
