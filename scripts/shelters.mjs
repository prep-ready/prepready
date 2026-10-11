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
const C = { id: col('Identyfikator publiczny'), gmina: col('Gmina'), lat: col('Szerokosc geograficzna'), lng: col('Dlugosc geograficzna'), addr: col('Adres'), avail: col('Dostepnosc') };

const cells = new Map(); let total = 0, skipped = 0;
for (const r of rows) {
  if (r.length < head.length) { skipped++; continue; }
  const lat = +r[C.lat], lng = +r[C.lng];
  if (!(lat > 48.9 && lat < 55 && lng > 14 && lng < 24.3)) { skipped++; continue; }
  const key = `${Math.floor((lat - GRID.lat0) / GRID.dLat)}_${Math.floor((lng - GRID.lng0) / GRID.dLng)}`;
  if (!cells.has(key)) cells.set(key, []);
  cells.get(key).push([Math.round(lat * 1e5), Math.round(lng * 1e5), AVAIL[r[C.avail].trim()] ?? 2, r[C.addr].trim(), r[C.gmina].trim()]);
  total++;
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
console.log(`Zapisano ${total} punktów w ${cells.size} kratkach (pominięto ${skipped}).`);
