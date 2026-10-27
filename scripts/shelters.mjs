// Mapa schronów — zamienia CSV „Punkty schronienia w Polsce” (KG PSP, dane.gov.pl, CC BY 4.0)
// na małe pliki JSON pocięte na kratki, które strona /pl/mapa-schronow/ dociąga w przeglądarce.
//
// Użycie:  node scripts/shelters.mjs ścieżka/do/punkty_schronienia.csv [data-danych RRRR-MM-DD]
// Wynik:   public/schrony/dane/index.json + public/schrony/dane/c/<wiersz>_<kolumna>.json
//
// Ten sam format zapisuje public/schrony/aktualizuj.php (cotygodniowa aktualizacja na serwerze).
// Zmieniasz format tutaj — zmień go też tam.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const [, , file, sourceDate] = process.argv;
if (!file) { console.error('Podaj ścieżkę do pliku CSV.'); process.exit(1); }

export const GRID = { lat0: 49, lng0: 14, dLat: 0.25, dLng: 0.4 };
const AVAIL = { 'Całodobowa': 0, 'Określone godziny': 1, 'Na żądanie': 2 };
const OUT = join(process.cwd(), 'public/schrony/dane');

function parseCsv(s) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === '"') { if (s[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n') { row.push(f.replace(/\r$/, '')); rows.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows;
}

const rows = parseCsv(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const head = rows.shift().map((h) => h.trim());
const col = (name) => { const i = head.indexOf(name); if (i < 0) throw new Error(`Brak kolumny „${name}” — format pliku się zmienił.`); return i; };
const C = { id: col('Identyfikator publiczny'), gmina: col('Gmina'), powiat: col('Powiat'), lat: col('Szerokosc geograficzna'), lng: col('Dlugosc geograficzna'), addr: col('Adres'), avail: col('Dostepnosc') };

// Podsumowanie dla stron miast (/pl/mapa-schronow/<miasto>/): liczby, dzielnice, ulice, punkty całodobowe.
// Miasto na prawach powiatu = kolumna Powiat równa nazwie miasta (np. „Tarnów”, a nie „pow. tarnowski”).
const citySrc = readFileSync(join(process.cwd(), 'src/data/cities.ts'), 'utf8');
const cityList = [...citySrc.matchAll(/slug: '([^']+)', name: '([^']+)'/g)].map(([, slug, name]) => ({ slug, name }));
const byPowiat = new Map(cityList.map((c) => [c.name, { ...c, total: 0, avail: [0, 0, 0], areas: new Map(), streets: new Map(), open24: [] }]));
// Ujednolicenie zapisu ulic z bazy PSP („Aleja”, „al. Aleja”, „ulica”, „Al.” → „al.”/„ul.”).
const norm = (x) => x.replace(/\s+/g, ' ').trim()
  .replace(/^al\.\s+alej[ae]\s+/i, 'al. ').replace(/^aleje\s+/i, 'al. ').replace(/^(aleja|al\.)\s+/i, 'al. ')
  .replace(/^(ulica|ul\.)\s+(inne\s+)?/i, 'ul. ').replace(/^(plac|pl\.)\s+/i, 'pl. ')
  .replace(/^(osiedle|os\.)\s+/i, 'os. ')
  .replace(/^os\.\s+osiedle\s+/i, 'os. ').replace(/^ul\.\s+alej[ae]\s+/i, 'al. ');
// Adres z nazwą ulicy i numerem (bez „brak” i samych numerów) — tylko takie pokazujemy na stronie miasta.
const streetAddr = (x) => { const n = norm(x); return /^(ul|al|pl|os)\. \D{3,}\s\d/i.test(n) && !/brak/i.test(n) ? n : null; };
const streetOf = (x) => { const n = streetAddr(x); return n ? n.replace(/\s+\d[\w/,.-]*.*$/, '') : null; };

const cells = new Map(); let total = 0, skipped = 0;
for (const r of rows) {
  if (r.length < head.length) { skipped++; continue; }
  const lat = +r[C.lat], lng = +r[C.lng];
  if (!(lat > 48.9 && lat < 55 && lng > 14 && lng < 24.3)) { skipped++; continue; }
  const key = `${Math.floor((lat - GRID.lat0) / GRID.dLat)}_${Math.floor((lng - GRID.lng0) / GRID.dLng)}`;
  if (!cells.has(key)) cells.set(key, []);
  const a = AVAIL[r[C.avail].trim()] ?? 2, addr = r[C.addr].trim();
  cells.get(key).push([Math.round(lat * 1e5), Math.round(lng * 1e5), a, addr, r[C.gmina].trim()]);
  total++;
  const c = byPowiat.get(r[C.powiat].trim());
  if (c) {
    c.total++; c.avail[a]++;
    // Dzielnica/osiedle = ostatni człon adresu, jeśli to nazwa (nie numer i nie samo miasto); „Łódź-Widzew” → „Widzew”.
    const parts = addr.split(',').map((x) => x.trim()).filter(Boolean);
    let area = parts.length > 1 ? parts[parts.length - 1] : '';
    if (area.startsWith(c.name + '-')) area = area.slice(c.name.length + 1);
    if (/\d/.test(area) || area === c.name || area.length < 3) area = '';
    if (area) c.areas.set(area, (c.areas.get(area) || 0) + 1);
    const st = streetOf(parts[0] || ''); if (st) c.streets.set(st, (c.streets.get(st) || 0) + 1);
    const sa = a === 0 && streetAddr(parts[0] || ''); if (sa) c.open24.push(sa + (area ? ` (${area})` : ''));
  }
}
if (total < 50000) { console.error(`Za mało punktów (${total}) — nie nadpisuję danych.`); process.exit(1); }

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'c'), { recursive: true });
const index = { source: 'Komenda Główna PSP · dane.gov.pl (CC BY 4.0)', sourceDate: sourceDate || null, builtAt: new Date().toISOString(), total, grid: GRID, cells: {} };
for (const [key, p] of [...cells].sort()) {
  index.cells[key] = p.length;
  writeFileSync(join(OUT, 'c', `${key}.json`), JSON.stringify({ p }));
}
writeFileSync(join(OUT, 'index.json'), JSON.stringify(index));

// Do 2 adresów z jednej ulicy, żeby lista pokazywała różne części miasta, a nie 30 numerów jednej alei.
const spread = (list, n) => {
  const seen = new Map(), out = [];
  for (const x of list.sort((p, q) => p.localeCompare(q, 'pl'))) {
    const st = streetOf(x) || x; const k = seen.get(st) || 0;
    if (k < 2) { out.push(x); seen.set(st, k + 1); }
  }
  return out.slice(0, n);
};
const top = (m, n) => [...m].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0], 'pl')).slice(0, n);
const summary = { sourceDate: sourceDate || null, cities: {} };
for (const c of byPowiat.values()) {
  if (!c.total) continue;
  summary.cities[c.slug] = {
    total: c.total, avail: c.avail,
    areas: top(c.areas, 12).filter(([, n]) => n > 2),
    streets: top(c.streets, 10).filter(([, n]) => n > 1),
    open24: spread([...new Set(c.open24)], 24),
  };
}
writeFileSync(join(process.cwd(), 'src/data/city-shelters.json'), JSON.stringify(summary, null, 1) + '\n');
console.log(`Zapisano ${total} punktów w ${cells.size} kratkach (pominięto ${skipped}).`);
