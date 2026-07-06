
## Worklow: Añadir nuevas fotos a la Galería

Para evitar errores de rutas y pérdida de metadatos, sigue estos pasos estrictamente:

1. **Preparar archivos**:
   - Exporta desde Adobe Bridge/Lightroom en **JPG** con metadatos (palabras clave) incluidos.
   - Nombra la carpeta de exportación como quieras, pero **NO** la dejes dentro de `public/zona-vip/galeria` permanentemente.

2. **Subir y organizar**:
   - Crea una subcarpeta dentro de `gallery-archive/` (en la raíz del proyecto) con el nombre del evento (ej: `Ensayo 2 de Abril`).
   - Sube allí tus JPGs originales. Al estar fuera de `public` y `src`, no se subirán a la web pero se guardarán en tu ordenador/proyecto.

3. **Convertir y Mover**:
   - Ejecuta la conversión apuntando a esa carpeta:
     ```powershell
     node src/develop-scripts/convert-with-sharp.js "gallery-archive/Ensayo 2 de Abril"
     ```

     ALTERNATIVA para convertir todas las carpetas de golpe:
     ```powershell
     Get-ChildItem -Path "gallery-archive" -Directory | ForEach-Object { node src/develop-scripts/convert-with-sharp.js $_.FullName }
     ```

   - Al terminar, **mueve solo los archivos .webp** generados a la raíz de `public/zona-vip/galeria/`.

     ALTERNATIVA para mover SOLO los .webp de todas las carpetas de golpe (y sobreescribir si ya existen):
     ```powershell
     Get-ChildItem -Path "gallery-archive" -Recurse -Filter "*.webp" | Move-Item -Destination "public/zona-vip/galeria/" -Force -Verbose
     ```

   - Deja los JPGs en `gallery-archive` como copia de seguridad.

4. **Sincronizar Datos**:
   - Primero, registra los archivos nuevos en el sistema:
     ```powershell
     node src/develop-scripts/sync-gallery-data.mjs
     ```
   - Segundo, importa los metadatos de los JPGs originales (**ahora procesa automáticamente todas las carpetas a la vez**):
     ```powershell
     node src/develop-scripts/import-gallery-keywords.mjs --originals gallery-archive --no-prompts
     ```

5. **Finalizar**:
   - Genera las miniaturas para que cargue rápido:
     ```powershell
     node src/develop-scripts/generate-thumbnails.js
     ```
   - Verifica en `http://localhost:4321/zona-vip/galeria/`.
