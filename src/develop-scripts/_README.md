# Scripts de desarrollo

Este directorio agrupa scripts utilitarios usados durante el mantenimiento del proyecto y NO forman parte del código que se ejecuta en la página en producción. Se invocan manualmente (PowerShell / Node) para generar assets, sincronizar datos o desplegar.

## Uso general

Ejecuta siempre desde la raíz del proyecto (`c:\tefiaenteatro`).

Formato estándar:

```powershell
node src/develop-scripts/<script>.js [opciones]
node src/develop-scripts/<script>.mjs [opciones]
```

Para PowerShell (`deploy.ps1`):

```powershell
pwsh src/develop-scripts/deploy.ps1 [--s|--n]
```

Si prefieres seguir usando scripts de `package.json`, algunos ya están adaptados (ver sección Integración con npm).

## Scripts incluidos

### `gen-version.js`
Genera `src/data/version.ts` con un sello de tiempo `YYYY.MM.DD-HHMM` antes del build.

Uso manual:
```powershell
node src/develop-scripts/gen-version.js
```

### `generate-elenco-thumbnails.js`
Genera versiones reducidas (`-sm`) de imágenes del elenco para mejorar rendimiento en grids.

```powershell
node src/develop-scripts/generate-elenco-thumbnails.js
```

### `generate-thumbnails.js`
Crea miniaturas (400px) de la galería VIP en `public/zona-vip/galeria/thumbnails`.

```powershell
node src/develop-scripts/generate-thumbnails.js
```

### `convert-with-sharp.js`
Convierte imágenes `.jpg/.jpeg/.png` a `.webp` (recursivo opcional) con control de calidad.

```powershell
node src/develop-scripts/convert-with-sharp.js <inputDir> [--output <dir>] [--quality 82] [--recursive] [--overwrite] [--lossless]
```

### `convert-webp-to-jpg.js`
Convierte imágenes WebP de la galería VIP a JPG (alta calidad) para descargas.

```powershell
node src/develop-scripts/convert-webp-to-jpg.js
```

### `rotate-webp-list.js`
Rota un conjunto concreto de archivos WebP (modifica in-place). Edita el array `filesToRotate` antes de ejecutar.

```powershell
node src/develop-scripts/rotate-webp-list.js
```

### `import-gallery-keywords.mjs`
Lee metadatos EXIF (Keywords/Subject/PersonInImage) de originales y rellena `gallery.manifest.json` (people, theme, event).

```powershell
node src/develop-scripts/import-gallery-keywords.mjs --originals "RUTA" [--map map.json] [--overwrite] [--dry-run] [--theme TEMA] [--event EVENTO] [--no-prompts]
```

### `sync-gallery-data.mjs`
Sincroniza `gallery.manifest.json` con los archivos presentes en `public/zona-vip/galeria` (añade nuevos, opcional prune de ausentes).

```powershell
node src/develop-scripts/sync-gallery-data.mjs [--dry-run] [--no-recursive] [--prune]
```

### Script de despliegue (`deploy.ps1` en la raíz)
Se mantiene en la raíz para poder ejecutarlo directamente:

```powershell
pwsh ./deploy.ps1              # modo interactivo (pregunta por media)
pwsh ./deploy.ps1 --s          # subir también imágenes y vídeos
pwsh ./deploy.ps1 --n          # no subir imágenes ni vídeos
```

## Integración con npm

`package.json` contiene scripts que usan algunos de estos utilitarios:

```jsonc
"build": "node src/develop-scripts/gen-version.js && astro build",
"thumbs:elenco": "node src/develop-scripts/generate-elenco-thumbnails.js"
```

Puedes añadir más alias si lo deseas.

## Requisitos

- Node.js y dependencias instaladas (`npm install`).
- Para scripts de imagen: paquete `sharp` ya en `dependencies`.
- Para EXIF: `exiftool-vendored` instalado.
- Para despliegue: AWS CLI configurado (`aws configure`).

## Buenas prácticas

1. Ejecuta conversiones en copia, revisa antes de borrar originales.
2. Usa `--dry-run` donde esté disponible para evitar escrituras accidentales.
3. Control de versiones: tras modificar manifiestos o generar miniaturas, haz commit separado con mensaje claro.
4. Mantén este README actualizado si cambias rutas o opciones.

---
Actualizado: Última reorganización de scripts en `src/develop-scripts`.
