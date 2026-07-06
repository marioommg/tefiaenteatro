//PARA ROTAR IMAGENES, EJECUTAR EN LA TERMINAL:
//node ./src/develop-scripts/rotate-webp-list.js
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta dinámica a la galería tras mover el script
const ROOT = path.resolve(__dirname, '..', '..');
const folderPath = path.join(ROOT, 'public', 'zona-vip', 'galeria');

// Lista de archivos a rotar
const filesToRotate = [
  // Rellena con nombres exactos .webp (ej. 'DSC_2070.webp', '_MG_1070.webp')
  'DSC_3239.webp',
  'thumbnails/DSC_3239.webp'
];

// Rotation degrees per file: thumbnails unchanged, original 180°
filesToRotate.forEach(file => {
  const inputPath = path.join(folderPath, file);
  console.log('-------------------------------------------------');
  console.log('Procesando archivo:', inputPath);
  if (!fs.existsSync(inputPath)) { console.warn(`❌ No se encontró el archivo: ${file}`); return; }
  else { console.log(`✅ Archivo encontrado: ${file}`); }
  const tempPath = path.join(path.dirname(inputPath), 'temp_' + path.basename(file));
  sharp(inputPath)
    .rotate(file.includes('thumbnails/') ? 0 : 180)
    .toFile(tempPath)
    .then(() => { fs.renameSync(tempPath, inputPath); console.log(`🎉 Rotada correctamente: ${file}`); })
    .catch(err => console.error(`❌ Error procesando ${file}:`, err));
});
