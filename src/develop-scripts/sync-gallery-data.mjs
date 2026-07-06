#!/usr/bin/env node
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SUPPORTED_EXTENSIONS = new Set(['.webp']);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Al mover el script dentro de src/develop-scripts necesitamos subir dos niveles para llegar a la raíz
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const GALLERY_DIR = path.join(ROOT_DIR, 'public', 'zona-vip', 'galeria');
const MANIFEST_PATH = path.join(ROOT_DIR, 'src', 'data', 'gallery.manifest.json');

function parseArgs(argv) {
  const options = { dryRun: false, recursive: true, prune: false };
  argv.forEach((arg) => {
    switch (arg) {
      case '--dry-run':
      case '-d': options.dryRun = true; break;
      case '--no-recursive': options.recursive = false; break;
      case '--prune': options.prune = true; break;
      case '--help':
      case '-h': printHelp(); process.exit(0); break;
      default: console.warn(`Opción desconocida: ${arg}`);
    }
  });
  return options;
}

function printHelp() {
  console.log(`Sincroniza gallery.manifest.json con los archivos presentes en public/zona-vip/galeria.\n\nUso: node src/develop-scripts/sync-gallery-data.mjs [opciones]\n\nOpciones:\n  --dry-run, -d       Muestra cambios sin escribir.\n  --no-recursive      No recorre subdirectorios.\n  --prune             Elimina entradas obsoletas.\n  --help, -h          Ayuda.\n`);
}

async function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) return [];
  const raw = await fs.readFile(MANIFEST_PATH, 'utf-8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error('El manifiesto debe ser un array de objetos.');
  return data;
}

async function scanGallery(dir, recursive, base = dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) { if (recursive) files.push(...await scanGallery(absolute, recursive, base)); continue; }
    const ext = path.extname(entry.name).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(ext)) continue;
    const relative = path.relative(base, absolute).split(path.sep).join('/');
    files.push(relative);
  }
  return files.sort((a, b) => a.localeCompare(b, 'es'));
}

function createPlaceholderEntry(file) { return { file, alt: `Descripción pendiente: ${file}`, theme: '', people: [] }; }

async function writeManifest(data, dryRun) {
  if (dryRun) { console.log('\nSe omitió la escritura (dry-run).'); return; }
  await fs.writeFile(MANIFEST_PATH, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
  console.log(`\nManifiesto actualizado: ${MANIFEST_PATH}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!existsSync(GALLERY_DIR)) throw new Error(`No se encontró el directorio de la galería en ${GALLERY_DIR}`);

  // 1. Get raw files from disk (only root level)
  const files = await scanGallery(GALLERY_DIR, false); // No recursive
  const existingFilesSet = new Set(files);

  // 2. Load current manifest
  let manifest = await loadManifest();

  // 2.5 Add missing files from disk that aren't in the manifest
  const existingInManifest = new Set(manifest.map(entry => path.basename(entry.file)));
  for (const file of files) {
    if (!existingInManifest.has(file)) {
      manifest.push(createPlaceholderEntry(file));
    }
  }

  // 3. Fix paths: If path has folders (like "folder/file.webp"), convert to "file.webp" if that file exists in root
  manifest = manifest.map(entry => {
    const basename = path.basename(entry.file);
    if (existingFilesSet.has(basename)) {
      return { ...entry, file: basename };
    }
    return entry;
  });

  // 4. Remove entries that still don't point to an existing file
  const validEntries = manifest.filter(entry => existingFilesSet.has(entry.file));

  // 5. Merge duplicates (if any) - priority to the one with metadata
  const mergedMap = new Map();
  for (const entry of validEntries) {
    if (!mergedMap.has(entry.file)) {
      mergedMap.set(entry.file, entry);
    } else {
      // Merge logic: keep the one with more info
      const current = mergedMap.get(entry.file);
      const richer = (entry.people?.length > current.people?.length) ? entry : current;
      mergedMap.set(entry.file, richer);
    }
  }

  const finalEntries = Array.from(mergedMap.values()).sort((a, b) => a.file.localeCompare(b.file));

  console.log(`Manifiesto limpio: ${finalEntries.length} entradas válidas.`);
  await writeManifest(finalEntries, options.dryRun);
}
main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
