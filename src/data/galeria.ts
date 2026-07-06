import fs from 'node:fs';
import path from 'node:path';
import imageSize from 'image-size';

// ============================================================================
// INTERFACES
// ============================================================================

export interface GalleryItem {
  id: string;
  slug: string;
  file: string;
  src: string;
  alt: string;
  people: string[];
  peopleSlugs: string[];
  event?: string;
  eventSlug?: string;
  musicalNumber?: string;
  musicalNumberSlug?: string;
  width: number;
  height: number;
  detailUrl: string;
  date?: string;
}


export interface GalleryPerson {
  isSeparator?: boolean;
  name: string;
  slug?: string;
  count?: number;
}

export interface GalleryEvent {
  isSeparator?: boolean;
  label: string;
  slug?: string;
  count?: number;
}

export interface GalleryMusicalNumber {
  isSeparator?: boolean;
  label: string;
  slug?: string;
  count?: number;
}

interface GalleryManifestEntry {
  file: string;
  alt: string;
  people?: string[];
  event?: string;
  musicalNumber?: string;
  musical_numbers?: string[];
  date?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const manifestCandidates = [
  path.join(process.cwd(), 'src', 'data', 'gallery.manifest.json'),
  path.join(process.cwd(), 'src', 'data', 'gallery.manifest.example.json'),
];
const manifestPath = manifestCandidates.find((candidate) => fs.existsSync(candidate));
const galleryDir = path.join(process.cwd(), 'public', 'zona-vip', 'galeria');

// Configuración de orden y separadores de filtros.
// Los elementos no especificados aquí aparecerán al final, ordenados alfabéticamente.
// Para crear un separador, añade un elemento que empiece por "---", por ejemplo "--- Elenco ---".
export const filterOrderConfig = {
  events: [
    "--- Funciones ---",
    "16 Mayo - Representación nº 1",
    "24 Mayo - Representación nº 2",
    "14 Junio - Representación nº 3",
    "15 Junio - Representación nº 4",
    "6 Julio - Representación nº 5",
    "--- Grabaciones ---",
    "6 Mayo - Grabaciones Estudios Sonido",
    "--- Ensayos ---",
    "23 Febrero - Ensayo",
    "2 Abril - Ensayo",
    "30 Abril - Ensayo",
    "--- Promoción ---",
    "Póster",
    "Personajes"
  ],
  people: [
    "--- Elenco ---",
    "Alba",
    "Dani",
    "Darío",
    "Eider",
    "Helena",
    "Juanjo",
    "María",
    "Mario Bambi",
    "Martín",
    "Moisés",
    "Nafsikaa",
    "Nico",
    "Pedro",
    "Sara Presilla",
    "Sara Kondo",
    "Sergio",
    "Toni",
    "Víctor",
    "Rodrigo",
    "Eloy",
    "--- Dirección ---",
    "Gaby",
    "Ingrid",
    "Mario Dire",
    "--- Apoyo ---",
    "Ignacio",
    "Jesús",
    "Marcos",
    "Vicky",
    "Aitana"
  ],
  musicalNumbers: [
    "--- Acto 1 ---",
    "Obertura",
    "Obertura Tindaya",
    "Soy lo que soy",
    "Eres diferente",
    "Camino",
    "Netsram",
    "Mírame",
    "Hola",
    "Obertura Tindaya (Reprise)",
    "Mujer Mujer",
    "--- Acto 2 ---",
    "Asesinos",
    "Soy lo que soy (Reprise)",
    "Quédate quieto",
    "Lacrimosa",
    "Dueto",
    "Número final"
  ]
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function readManifest(): GalleryManifestEntry[] {
  if (!manifestPath) {
    throw new Error('No se encontró manifiesto de galería (gallery.manifest.json o gallery.manifest.example.json).');
  }
  const raw = fs.readFileSync(manifestPath, 'utf-8');
  return JSON.parse(raw.replace(/^\\uFEFF/, '').trim()) as GalleryManifestEntry[];
}

function slugify(value: string): string {
  const normalized = value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'sin-etiqueta';
}

function toTitleCase(value: string): string {
  const lowered = value.toLocaleLowerCase('es');
  return lowered.replace(/\p{L}+/gu, (word) => {
    const [first, ...rest] = word;
    return (first ? first.toLocaleUpperCase('es') : '') + rest.join('');
  });
}

function ensureImageSize(relativeFile: string): { width: number; height: number } | null {
  const absolute = path.join(galleryDir, relativeFile);
  if (!fs.existsSync(absolute)) {
    console.warn(`[galeria] Imagen no encontrada (omitida): ${relativeFile}`);
    return null;
  }
  const { width, height } = imageSize(absolute);
  if (!width || !height) {
    throw new Error(`No se pudieron leer las dimensiones de la imagen: ${absolute}`);
  }
  return { width, height };
}

// ============================================================================
// DATA PROCESSING
// ============================================================================

const manifest = readManifest();

const items: GalleryItem[] = manifest.flatMap((entry) => {
  const file = entry.file.trim();
  const baseId = path.parse(file).name;
  const dimensions = ensureImageSize(file);
  if (!dimensions) return [];
  const { width, height } = dimensions;
  const people = Array.isArray(entry.people)
    ? entry.people
      .map((person) => person.trim())
      .filter(Boolean)
      .map((person) => toTitleCase(person))
    : [];
  const peopleSlugs = people.map((person) => slugify(person));
  const alt = (entry.alt ?? '').trim();
  if (!alt) {
    throw new Error(`La imagen "${file}" necesita un texto alternativo en gallery.manifest.json.`);
  }
  const slug = slugify(baseId);

  const event = (entry.event || '').trim();
  const eventSlug = event ? slugify(event) : undefined;
  const rawMusicalNumbers = entry.musical_numbers || [];
  const musicalNumberRaw = rawMusicalNumbers.length > 0 ? rawMusicalNumbers[0].trim() : (entry.musicalNumber || '').trim();
  const musicalNumberSlug = musicalNumberRaw ? slugify(musicalNumberRaw) : undefined;
  const musicalNumber = musicalNumberRaw || undefined;

  return [{
    id: baseId,
    slug,
    file,
    src: `/zona-vip/galeria/${file}`,
    alt,
    people,
    peopleSlugs,
    width,
    height,
    detailUrl: `/zona-vip/galeria/${slug}/`,
    event,
    eventSlug,
    musicalNumber,
    musicalNumberSlug,
    date: entry.date,
  }];
});

// ============================================================================
const eventMap = new Map<string, GalleryEvent>();
const personMap = new Map<string, GalleryPerson>();
const musicalNumberMap = new Map<string, GalleryMusicalNumber>();

items.forEach((item) => {
  // People
  item.people.forEach((person, index) => {
    const slug = item.peopleSlugs[index];
    if (!personMap.has(slug)) {
      personMap.set(slug, { name: person, slug, count: 0 });
    }
    const personEntry = personMap.get(slug);
    if (personEntry) {
      personEntry.count = (personEntry.count || 0) + 1;
    }
  });

  // Events
  if (item.event && item.eventSlug) {
    if (!eventMap.has(item.eventSlug)) {
      eventMap.set(item.eventSlug, { label: item.event, slug: item.eventSlug, count: 0 });
    }
    const eventEntry = eventMap.get(item.eventSlug);
    if (eventEntry) {
      eventEntry.count = (eventEntry.count || 0) + 1;
    }
  }

  // Musical Numbers
  if (item.musicalNumber && item.musicalNumberSlug) {
    if (!musicalNumberMap.has(item.musicalNumberSlug)) {
      musicalNumberMap.set(item.musicalNumberSlug, {
        label: item.musicalNumber,
        slug: item.musicalNumberSlug,
        count: 0,
      });
    }
    const musicalEntry = musicalNumberMap.get(item.musicalNumberSlug);
    if (musicalEntry) {
      musicalEntry.count = (musicalEntry.count || 0) + 1;
    }
  }
});

// ============================================================================
// EXPORTS
// ============================================================================

const eventSortOrder = new Map<string, number>();
let currentEventIndex = 0;
filterOrderConfig.events.forEach((configItem) => {
  const trimmed = configItem.trim();
  if (!trimmed.startsWith('---')) {
    eventSortOrder.set(slugify(trimmed), currentEventIndex++);
  }
});

items.sort((a, b) => {
  const orderA = a.eventSlug && eventSortOrder.has(a.eventSlug) ? eventSortOrder.get(a.eventSlug)! : Number.MAX_SAFE_INTEGER;
  const orderB = b.eventSlug && eventSortOrder.has(b.eventSlug) ? eventSortOrder.get(b.eventSlug)! : Number.MAX_SAFE_INTEGER;

  if (orderA !== orderB) {
    return orderA - orderB;
  }

  // Sort by date chronologically if both items have a date
  if (a.date && b.date && a.date !== b.date) {
    return a.date.localeCompare(b.date);
  }

  // If only one item has a date, prioritize the one with the date? 
  // O el que no tiene fecha va al final
  if (a.date && !b.date) return -1;
  if (!a.date && b.date) return 1;

  // Fallback to alphabetical order by file
  return a.file.localeCompare(b.file, 'es');
});

export const galleryItems: GalleryItem[] = items;

function orderAndGroupFilters<T>(
  items: T[],
  configOrder: string[],
  nameExtractor: (item: T) => string,
  separatorCreator: (label: string) => T
): T[] {
  const result: T[] = [];
  const itemsMap = new Map<string, T>();

  items.forEach(item => {
    itemsMap.set(nameExtractor(item).toLowerCase().trim(), item);
  });

  configOrder.forEach(configItem => {
    const trimmed = configItem.trim();
    if (trimmed.startsWith('---')) {
      const label = trimmed.replace(/^-+|-+$/g, '').trim();
      result.push(separatorCreator(label));
    } else {
      const key = trimmed.toLowerCase();
      if (itemsMap.has(key)) {
        result.push(itemsMap.get(key)!);
        itemsMap.delete(key);
      }
    }
  });

  const remaining = Array.from(itemsMap.values()).sort((a, b) =>
    nameExtractor(a).localeCompare(nameExtractor(b), 'es')
  );

  return [...result, ...remaining];
}

export const galleryEvents: GalleryEvent[] = orderAndGroupFilters(
  Array.from(eventMap.values()),
  filterOrderConfig.events,
  (e) => e.label,
  (label) => ({ isSeparator: true, label })
);

export const galleryPeople: GalleryPerson[] = orderAndGroupFilters(
  Array.from(personMap.values()),
  filterOrderConfig.people,
  (p) => p.name,
  (label) => ({ isSeparator: true, name: label })
);

export const galleryMusicalNumbers: GalleryMusicalNumber[] = orderAndGroupFilters(
  Array.from(musicalNumberMap.values()),
  filterOrderConfig.musicalNumbers,
  (m) => m.label,
  (label) => ({ isSeparator: true, label })
);