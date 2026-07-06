import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const manifestPath = path.resolve(__dirname, '../data/gallery.manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

function parseDateString(str) {
  const [datePart, timePart] = str.split(' ');
  const isoDateStr = datePart.replace(/:/g, '-') + 'T' + timePart + 'Z';
  return new Date(isoDateStr).getTime();
}

function formatDateString(ms) {
  const d = new Date(ms);
  const pad = (n) => n.toString().padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  const MM = pad(d.getUTCMonth() + 1);
  const dd = pad(d.getUTCDate());
  const HH = pad(d.getUTCHours());
  const mm = pad(d.getUTCMinutes());
  const ss = pad(d.getUTCSeconds());
  return `${yyyy}:${MM}:${dd} ${HH}:${mm}:${ss}`;
}

const anchors = [
  {
    event: "16 Mayo - Representación nº 1",
    type: "last",
    targetStr: "2025:05:16 20:22:00"
  },
  {
    event: "24 Mayo - Representación nº 2",
    type: "file",
    file: "DSC_3132.webp",
    targetStr: "2025:05:24 21:35:00"
  },
  {
    event: "14 Junio - Representación nº 3",
    type: "file",
    file: "DSC_3247.webp",
    targetStr: "2025:06:14 18:21:00"
  },
  {
    event: "15 Junio - Representación nº 4",
    type: "last",
    targetStr: "2025:06:15 21:30:00"
  },
  {
    event: "6 Julio - Representación nº 5",
    type: "file",
    file: "DSC_6072.webp",
    targetStr: "2025:07:06 22:00:00"
  },
  {
    event: "2 Abril - Ensayo",
    type: "file",
    file: "DSC_1717.webp",
    targetStr: "2025:04:02 19:52:36"
  }
];

let updatedCount = 0;

for (const anchor of anchors) {
  const badPhotos = manifest.filter(img => img.event === anchor.event && img.date && img.date.startsWith("2023:"));
  if (badPhotos.length === 0) {
    console.log(`[!] No 2023 photos found for ${anchor.event}`);
    continue;
  }

  let anchorImg;
  if (anchor.type === "last") {
    const sorted = [...badPhotos].sort((a, b) => parseDateString(a.date) - parseDateString(b.date));
    anchorImg = sorted[sorted.length - 1];
  } else if (anchor.type === "file") {
    anchorImg = badPhotos.find(img => img.file === anchor.file || img.file === anchor.file.replace('.webp',''));
  }

  if (!anchorImg) {
    console.log(`[!] Anchor ${anchor.type} not found for ${anchor.event}!`);
    continue;
  }

  const badTime = parseDateString(anchorImg.date);
  const targetTime = parseDateString(anchor.targetStr);
  const offset = targetTime - badTime;
  
  console.log(`Event: ${anchor.event} -> Applying offset of ${(offset / 1000 / 60 / 60).toFixed(2)} hours`);

  for (const item of manifest) {
    if (item.event === anchor.event && item.date && item.date.startsWith("2023:")) {
      const ms = parseDateString(item.date);
      item.date = formatDateString(ms + offset);
      updatedCount++;
    }
  }
}

console.log(`\nSuccessfully updated ${updatedCount} photo dates.`);
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
