// Genera versiones reducidas del elenco para uso en grids y tarjetas
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Al mover el script dentro de src/develop-scripts, subimos dos niveles a la raíz
const SOURCE_DIR = path.join(__dirname, '..', '..', 'public', 'images', 'elenco', 'inicio');
const SUPPORTED_EXTENSIONS = new Set(['.webp', '.jpg', '.jpeg', '.png', '.avif']);
const OUTPUT_SUFFIX = '-sm';
const TARGET_WIDTH = 600; // px

function toOutputName(fileName) {
  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);
  return `${base}${OUTPUT_SUFFIX}${ext}`;
}

function isSupported(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.has(ext)) return false;
  return !fileName.toLowerCase().includes(`${OUTPUT_SUFFIX}.`);
}

async function processImage(fileName) {
  const inputPath = path.join(SOURCE_DIR, fileName);
  const outputFile = toOutputName(fileName);
  const outputPath = path.join(SOURCE_DIR, outputFile);

  const inputStats = await fs.promises.stat(inputPath);
  const existedBefore = fs.existsSync(outputPath);
  if (existedBefore) {
    const outputStats = await fs.promises.stat(outputPath);
    if (outputStats.mtimeMs >= inputStats.mtimeMs) {
      return { status: 'skipped', fileName, outputFile };
    }
  }

  const ext = path.extname(fileName).toLowerCase();
  const pipeline = sharp(inputPath).resize({ width: TARGET_WIDTH, withoutEnlargement: true });

  if (ext === '.webp') pipeline.webp({ quality: 72, effort: 4 });
  else if (ext === '.jpg' || ext === '.jpeg') pipeline.jpeg({ quality: 78, mozjpeg: true });
  else if (ext === '.png') pipeline.png({ compressionLevel: 8, adaptiveFiltering: true });
  else if (ext === '.avif') pipeline.avif({ quality: 55 });

  await pipeline.toFile(outputPath);
  return { status: existedBefore ? 'updated' : 'created', fileName, outputFile };
}

async function run() {
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`Directorio no encontrado: ${SOURCE_DIR}`);
    process.exitCode = 1;
    return;
  }

  const entries = await fs.promises.readdir(SOURCE_DIR);
  const images = entries.filter(isSupported).sort();
  if (images.length === 0) {
    console.log('No se encontraron imágenes compatibles para procesar.');
    return;
  }

  let created = 0, updated = 0, skipped = 0, failed = 0;
  console.log(`Generando versiones pequeñas (${TARGET_WIDTH}px) para ${images.length} archivos...`);
  for (const fileName of images) {
    try {
      const result = await processImage(fileName);
      if (result.status === 'skipped') { skipped += 1; continue; }
      if (result.status === 'updated') updated += 1; else created += 1;
      console.log(`✔ ${result.status === 'updated' ? 'Actualizado' : 'Creado'} ${result.outputFile}`);
    } catch (error) {
      failed += 1;
      console.error(`✖ Error al procesar ${fileName}:`, error.message || error);
    }
  }

  console.log('---');
  console.log(`Creado: ${created}`);
  console.log(`Actualizado: ${updated}`);
  console.log(`Omitido: ${skipped}`);
  console.log(`Errores: ${failed}`);
  if (failed > 0) process.exitCode = 1;
}

run().catch((error) => {
  console.error('Error inesperado:', error);
  process.exitCode = 1;
});
