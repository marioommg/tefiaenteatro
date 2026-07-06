#!/usr/bin/env node
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { exiftool } from 'exiftool-vendored';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Al estar dentro de src, el manifiesto está en ../data
const MANIFEST_PATH = path.join(__dirname, '..', 'data', 'gallery.manifest.json');

function printUsage() {
  console.log(`Rellena la propiedad "people" de gallery.manifest.json usando palabras clave EXIF.\n\nUso:\n  node src/develop-scripts/import-gallery-keywords.mjs --originals "RUTA" [opciones]\n\nOpciones:\n  --originals, -o   Ruta al directorio con originales (obligatorio).\n  --map, -m         Ruta a JSON de mapeo keyword -> nombre.\n  --overwrite       Sustituye lista people aunque exista.\n  --dry-run         Muestra cambios sin escribir.\n  --theme           Tema común (si se omite se pregunta).\n  --event           Evento común (si se omite se pregunta).\n  --no-prompts      Desactiva preguntas interactivas.\n  --help, -h        Ayuda.\n`);
}

function parseArgs(argv) {
  const options = { originals: '', dryRun: false, overwrite: false, mapPath: undefined, theme: undefined, event: undefined, prompts: true };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--originals':
      case '-o': options.originals = argv[++i] ?? ''; break;
      case '--map':
      case '-m': options.mapPath = argv[++i] ?? ''; break;
      case '--dry-run': options.dryRun = true; break;
      case '--overwrite': options.overwrite = true; break;
      case '--theme': options.theme = argv[++i] ?? ''; break;
      case '--event': options.event = argv[++i] ?? ''; break;
      case '--no-prompts': options.prompts = false; break;
      case '--help':
      case '-h': printUsage(); process.exit(0); break;
      default: console.warn(`Opción desconocida: ${arg}`);
    }
  }
  if (!options.originals) throw new Error('Debes indicar --originals');
  return options;
}

async function promptForContext(options) {
  const hasTty = Boolean(input.isTTY && output.isTTY);
  if (!options.prompts || !hasTty) { options.theme = options.theme?.trim() || undefined; options.event = options.event?.trim() || undefined; return; }
  const rl = readline.createInterface({ input, output });
  try {
    if (options.theme === undefined) options.theme = (await rl.question('Tema común: ')).trim() || undefined; else options.theme = options.theme.trim() || undefined;
    if (options.event === undefined) options.event = (await rl.question('Evento común: ')).trim() || undefined; else options.event = options.event.trim() || undefined;
  } finally { rl.close(); }
}

async function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) throw new Error(`No se encontró el manifiesto en ${MANIFEST_PATH}`);
  const raw = await fs.readFile(MANIFEST_PATH, 'utf-8');
  const manifest = JSON.parse(raw);
  if (!Array.isArray(manifest)) throw new Error('El manifiesto debe ser un array.');
  return manifest;
}

async function loadMap(mapPath) {
  if (!mapPath) return new Map();
  const raw = await fs.readFile(mapPath, 'utf-8');
  const json = JSON.parse(raw);
  if (typeof json !== 'object' || json === null) throw new Error('El fichero de mapeo debe contener un objeto JSON.');
  return new Map(Object.entries(json).map(([k, v]) => [k.toLowerCase(), String(v)]));
}

async function collectOriginals(rootDir) {
  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) files.push(...await walk(absolute)); else files.push(absolute);
    }
    return files;
  }
  const files = await walk(rootDir);
  const index = new Map();
  files.forEach((filePath) => { const base = path.parse(filePath).name; if (!index.has(base)) index.set(base, []); index.get(base).push(filePath); });
  return index;
}

const toArray = (v) => !v ? [] : Array.isArray(v) ? v : [v];
const normalizeKeyword = (k) => k ? k.split('|').pop().trim() : '';
// Helper to extract specific hierarchy: "tefía|NAME" -> "NAME"
const extractHierarchy = (items, prefix) => {
  return items
    .filter(i => i.startsWith(prefix))
    .map(i => i.replace(prefix, '').trim())
    .filter(Boolean);
};
const applyMapping = (keyword, map) => { const normalized = keyword.trim(); if (!normalized) return ''; const mapped = map.get(normalized.toLowerCase()); return mapped ? mapped.trim() : normalized; };

async function readKeywords(filePath) {
  try {
    const metadata = await exiftool.read(filePath);

    // Raw arrays
    const hierarchicalSubject = toArray(metadata.HierarchicalSubject);
    const keywordsRaw = [toArray(metadata.Keywords), toArray(metadata.Subject), toArray(metadata.PersonInImage)];

    // Check for our specific hierarchies
    const peopleHierarchical = extractHierarchy(hierarchicalSubject, 'tefía|');
    const musicalHierarchical = extractHierarchy(hierarchicalSubject, 'NÚMERO MUSICAL|');
    const tematicaHierarchical = extractHierarchy(hierarchicalSubject, 'TEMÁTICA|');
    const dateValue = metadata.DateTimeOriginal?.rawValue || metadata.CreateDate?.rawValue || '';

    // If we have specific hierarchies, use them exclusively
    if (peopleHierarchical.length > 0 || musicalHierarchical.length > 0 || tematicaHierarchical.length > 0) {
      return {
        people: peopleHierarchical,
        musical_numbers: musicalHierarchical,
        theme: tematicaHierarchical[0] || '',
        date: dateValue,
        isHierarchical: true
      };
    }

    // Fallback: legacy behavior (mix everything)
    const keywords = new Set();
    keywordsRaw.flat().concat(hierarchicalSubject).forEach((v) => {
      const label = normalizeKeyword(String(v || ''));
      if (label) keywords.add(label);
    });

    return {
      people: Array.from(keywords),
      musical_numbers: [],
      theme: '',
      date: dateValue,
      isHierarchical: false
    };

  } catch (error) {
    console.warn(`No se pudieron leer metadatos de ${filePath}: ${error instanceof Error ? error.message : error}`);
    return { people: [], musical_numbers: [], theme: '', date: '', isHierarchical: false };
  }
}

async function writeManifest(manifest, dryRun) {
  const content = `${JSON.stringify(manifest, null, 2)}\n`;
  if (dryRun) { console.log('\n--dry-run activo, no se escribe el manifiesto.'); return; }
  await fs.writeFile(MANIFEST_PATH, content, 'utf-8');
  console.log(`Manifiesto actualizado: ${MANIFEST_PATH}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const originalsDir = path.resolve(options.originals);
  if (!existsSync(originalsDir)) throw new Error(`La ruta indicada en --originals no existe: ${originalsDir}`);
  const [manifest, originals, mapping] = await Promise.all([loadManifest(), collectOriginals(originalsDir), loadMap(options.mapPath)]);
  await promptForContext(options);
  const themeValue = options.theme; const eventValue = options.event;
  const applyTheme = typeof themeValue === 'string' && themeValue.length > 0;
  const applyEvent = typeof eventValue === 'string' && eventValue.length > 0;
  let updatedCount = 0; const missingMetadata = []; const missingOriginal = [];
  for (const entry of manifest) {
    const base = path.parse(entry.file).name;
    const skipKeywords = !options.overwrite && Array.isArray(entry.people) && entry.people.length;
    const candidates = originals.get(base);
    if (!candidates || !candidates.length) { missingOriginal.push(entry.file); continue; }

    let result = { people: [], musical_numbers: [], theme: '', event: '', date: '', isHierarchical: false };

    for (const candidate of candidates) {
      const r = await readKeywords(candidate);
      
      // Siempre guardamos el primer resultado como fallback para no perder fecha/evento
      if (!result.date && !result.event) {
        result = r;
        result.event = path.basename(path.dirname(candidate));
      }

      if (r.people.length || r.musical_numbers.length || r.theme) {
        result = r;
        result.event = path.basename(path.dirname(candidate));
        break;
      }

      const parsed = path.parse(candidate);
      const sidecar = path.join(parsed.dir, `${parsed.name}.xmp`);
      if (sidecar !== candidate && existsSync(sidecar)) {
        const rSidecar = await readKeywords(sidecar);
        if (rSidecar.people.length || rSidecar.musical_numbers.length || rSidecar.theme) {
          result = rSidecar;
          result.event = path.basename(path.dirname(sidecar));
          break;
        }
      }
    }

    const uniquePeople = Array.from(new Set(result.people.map((k) => applyMapping(k, mapping)).map((n) => n.trim()).filter(Boolean)));
    const uniqueMusical = Array.from(new Set(result.musical_numbers.map((n) => n.trim()).filter(Boolean)));

    if (!uniquePeople.length && !uniqueMusical.length) {
      missingMetadata.push(entry.file);
    }

    if (!skipKeywords) {
      entry.people = uniquePeople;
      // Only set musical_numbers if we have them, otherwise undefined (cleaner JSON)
      if (uniqueMusical.length > 0) {
        entry.musical_numbers = uniqueMusical;
      } else {
        delete entry.musical_numbers; // Clean up if empty
      }

      if (applyTheme) {
        entry.theme = themeValue;
      } else if (result.theme) {
        entry.theme = result.theme;
      }

      const altPeople = entry.people && entry.people.length > 0 ? entry.people.join(', ') : 'varias personas';
      const altEvent = entry.event ? entry.event : 'un evento';
      entry.alt = `Foto de ${altPeople} en ${altEvent}`;
    }

    if (applyEvent) {
      entry.event = eventValue;
    } else if (result.event) {
      entry.event = result.event;
    }

    if (result.date) {
      entry.date = result.date;
    } else if (!entry.date) {
      delete entry.date;
    }

    updatedCount += 1;
  }
  await writeManifest(manifest, options.dryRun);
  console.log(`\nEntradas actualizadas: ${updatedCount}`);
  if (applyTheme) console.log(`Tema aplicado: ${themeValue}`);
  if (applyEvent) console.log(`Evento aplicado: ${eventValue}`);
  if (missingOriginal.length) { console.warn(`\nSin archivo original asociado (${missingOriginal.length}):`); missingOriginal.forEach((f) => console.warn(`  - ${f}`)); }
  if (missingMetadata.length) { console.warn(`\nArchivos sin metadatos de personas (${missingMetadata.length}):`); missingMetadata.forEach((f) => console.warn(`  - ${f}`)); }
}

main()
  .catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); })
  .finally(() => { exiftool.end().catch(() => { }); });
