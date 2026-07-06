// Genera miniaturas de la galería VIP (400px de ancho)
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inputDir = path.join(__dirname, '..', '..', 'public', 'zona-vip', 'galeria');
const outputDir = path.join(inputDir, 'thumbnails');
const thumbnailWidth = 400;

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const files = fs.readdirSync(inputDir);
console.log('Archivos encontrados en la carpeta de entrada:', files);
let procesados = 0;
files.forEach(file => {
  const ext = path.extname(file).toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
    const inputPath = path.join(inputDir, file);
    const outputPath = path.join(outputDir, file);
    sharp(inputPath)
      .resize(thumbnailWidth)
      .toFile(outputPath)
      .then(() => { console.log(`Miniatura creada: ${outputPath}`); procesados++; })
      .catch(err => console.error(`Error con ${file}:`, err));
  }
});
setTimeout(() => { console.log(`Total de miniaturas procesadas: ${procesados}`); }, 2000);
