import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Ajuste de ruta tras mover el script a src/develop-scripts
const galleryDir = path.join(__dirname, '..', '..', 'public', 'zona-vip', 'galeria');
const outputDir = path.join(galleryDir, 'downloads');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`✓ Directorio creado: ${outputDir}`);
}

async function convertWebPToJPG() {
  const files = fs.readdirSync(galleryDir);
  const webpFiles = files.filter(file => file.toLowerCase().endsWith('.webp'));
  console.log(`Encontrados ${webpFiles.length} archivos WebP`);
  for (const file of webpFiles) {
    const inputPath = path.join(galleryDir, file);
    const outputFileName = file.replace(/\.webp$/i, '.jpg');
    const outputPath = path.join(outputDir, outputFileName);
    if (fs.existsSync(outputPath)) { console.log(`⊘ Ya existe: ${outputFileName}`); continue; }
    try {
      await sharp(inputPath).jpeg({ quality: 95, mozjpeg: true }).toFile(outputPath);
      console.log(`✓ Convertido: ${file} → ${outputFileName}`);
    } catch (error) {
      console.error(`✗ Error al convertir ${file}:`, error.message);
    }
  }
  console.log('\n✓ Conversión completada');
}
convertWebPToJPG();
