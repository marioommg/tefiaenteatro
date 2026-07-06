# Media y contenido artístico

Este repositorio incluye el **código fuente** del sitio bajo licencia MIT. Las fotografías, grabaciones de audio, vídeos del musical y material de la zona VIP **no se distribuyen** en GitHub por tamaño y derechos de autor.

## Qué está excluido del repo

| Contenido | Ubicación local | Motivo |
|-----------|-----------------|--------|
| Manifiesto de galería VIP | `src/data/gallery.manifest.json` | Metadatos de ~850 fotos (personas, eventos, fechas) |
| Letras y pistas de banda sonora | `src/data/canciones.local.ts` | Letras completas y rutas de audio |
| ID de vídeo exclusivo VIP | `.env` → `PUBLIC_VIP_VIDEO_6_JULIO_ID` | Vídeo no listado de YouTube |
| Originales de galería | `gallery-archive/` | ~7 GB de RAW/JPG originales |
| Fotos VIP publicadas | `public/zona-vip/galeria/` | ~850 imágenes WebP |
| Banda sonora | `public/audios/` | Archivos `.wav` |
| Vídeos de timeline | `public/sobre-el-proyecto/` | Servidos en producción (copiar desde `src/assets/sobre-el-proyecto/` si migras) |
| Vídeos de timeline (fuente local) | `src/assets/sobre-el-proyecto/*.mp4`, `*.webm` | Fuente de edición; gitignored |

## Qué sí está incluido

- Código Astro, Lambdas, scripts de galería y deploy
- Imágenes del elenco y dirección en `src/assets/images/` (~500 MB)
- Logo, thumbnail del making-of y vídeo trailer (~6 MB)
- Manifiesto de galería (`src/data/gallery.manifest.json`) — las entradas sin archivo local se omiten en build

## Montar el sitio completo en local

1. Clona el repo e instala dependencias: `npm install`
2. Copia `.env.example` → `.env` y rellena las variables
3. Añade el media de producción en las rutas indicadas arriba
4. Copia los datos VIP locales si los tienes:
   - `src/data/gallery.manifest.json` (o parte del manifiesto de ejemplo)
   - `src/data/canciones.local.ts` (exporta `CANCIONES`; ver `canciones.demo.ts`)
   - `PUBLIC_VIP_VIDEO_6_JULIO_ID` en `.env` para el vídeo exclusivo
5. Para la galería VIP, sigue `src/develop-scripts/WORKFLOW_GALERIA.md`
6. `npm run build` y `npm run dev`

Sin el media opcional, el sitio compila y funciona: la galería VIP quedará vacía, la banda sonora sin pistas y los vídeos de «Sobre el proyecto» no se reproducirán hasta añadir los archivos.

## Derechos de autor del contenido

El código es MIT. Las fotografías, partituras, grabaciones y vídeos del espectáculo **Tefía en Teatro** son propiedad de sus autores respectivos y no están licenciados para reutilización con la misma libertad que el software.
