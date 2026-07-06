import fs from 'fs';

const manifestPath = '../data/gallery.manifest.json';
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const eventsToCheck = [
  "16 Mayo - Representación nº 1",
  "24 Mayo - Representación nº 2",
  "14 Junio - Representación nº 3",
  "15 Junio - Representación nº 4",
  "6 Julio - Representación nº 5"
];

const results = [];

for (const e of eventsToCheck) {
  const images = manifest.filter(item => item.event === e && item.date);
  if (images.length === 0) {
    results.push({ event: e, count: 0 });
    continue;
  }
  
  const dates = images.map(img => img.date).sort();
  results.push({
    event: e,
    count: images.length,
    minDate: dates[0],
    maxDate: dates[dates.length - 1],
    sample: dates[Math.floor(dates.length / 2)]
  });
}

fs.writeFileSync('dates-info.json', JSON.stringify(results, null, 2));
