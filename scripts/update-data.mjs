#!/usr/bin/env node
/**
 * PrepReady — darmowa aktualizacja danych (zamiast n8n).
 * Uruchamiana codziennie przez GitHub Actions (.github/workflows/update.yml).
 *
 * Pobiera publiczne, bezpłatne źródła → liczy składowe indeksu → zapisuje:
 *   src/data/readiness.json   (wynik, składowe, historia)
 *   src/data/feed.json        (wiadomości)
 *
 * Zasada bezpieczeństwa: jeśli źródło nie odpowiada, składowa zachowuje poprzednią wartość.
 * Składowe z "mode": "manual" (np. radiacja) ustawiasz ręcznie w readiness.json.
 */
import { readFile, writeFile } from 'node:fs/promises';

const READINESS = new URL('../src/data/readiness.json', import.meta.url);
const FEED = new URL('../src/data/feed.json', import.meta.url);
const UA = { 'User-Agent': 'PrepReady/1.0 (+https://prepready.pro)' };

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, Math.round(v)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const today = new Date().toISOString().slice(0, 10);

async function get(url, type = 'json', tries = 3) {
  for (let n = 1; ; n++) {
    try {
      const r = await fetch(url, { headers: UA, redirect: 'follow', signal: AbortSignal.timeout(30000) });
      if (!r.ok) throw new Error(`${r.status} ${url.slice(0, 80)}`);
      return type === 'json' ? await r.json() : await r.text();
    } catch (e) {
      if (n >= tries) throw e;
      await sleep(10000 * n); // np. GDELT 429/503 — odczekaj i spróbuj ponownie
    }
  }
}

/** Minimalny parser RSS (bez zależności). */
function rss(xml) {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
  const tag = (s, t) => (s.match(new RegExp(`<${t}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${t}>`)) || [])[1]?.trim() ?? '';
  const clean = (s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
  return items.map((i) => ({ title: clean(tag(i, 'title')), link: clean(tag(i, 'link')), date: new Date(tag(i, 'pubDate') || Date.now()) }));
}

/** GDELT: stosunek natężenia wzmianek z ostatnich 3 dni do 27 dni wcześniej. */
async function gdeltRatio(query) {
  const u = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=timelinevol&format=json&timespan=30d`;
  const j = await get(u);
  const data = j.timeline?.[0]?.data ?? [];
  if (data.length < 10) throw new Error('GDELT: za mało danych');
  const vals = data.map((d) => d.value);
  const recent = vals.slice(-3), base = vals.slice(0, -3);
  const avg = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  return avg(recent) / Math.max(avg(base), 1e-6);
}
/**
 * Zapasowe źródło: Google News RSS. Liczy artykuły z ostatnich 3 dni i porównuje z medianą
 * własnych pomiarów z poprzednich dni (zapisanych w readiness.json → components[].raw).
 * Przez pierwsze 3 dni ratio = 1 (wynik = kotwica), potem kalibruje się samo.
 */
const rawStore = {};
async function newsRatio(q, id) {
  const u = `https://news.google.com/rss/search?q=${encodeURIComponent(q + ' when:3d')}&hl=pl&gl=PL&ceid=PL:pl`;
  const items = rss(await get(u, 'text')).filter((i) => !isNaN(i.date)).sort((a, b) => b.date - a.date);
  const count = items.length;
  const prev = rawStore[id] ?? [];
  const sorted = [...prev].sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
  rawStore[id] = [...prev, count].slice(-30);
  const ratio = prev.length >= 3 && median > 0 ? count / median : 1;
  return { ratio: Math.max(ratio, 0.25), items };
}
/** GDELT, a gdy nie odpowiada — Google News. */
async function mediaRatio(id, gdeltQuery, newsQuery) {
  try { return { ratio: await gdeltRatio(gdeltQuery), items: [] }; }
  catch (e) { console.warn('  GDELT niedostępny, używam Google News:', e.message); return newsRatio(newsQuery, id); }
}
const ratioToScore = (ratio, anchor) => clamp(anchor + 30 * Math.log2(ratio), 5, 95);

// ── Składowe ────────────────────────────────────────────────
const feedItems = [];

const sources = {
  /** Konflikt: natężenie doniesień o dronach, przestrzeni powietrznej, rakietach, sabotażu w PL. Kotwica 40 = stan bazowy. */
  async conflict() {
    const { ratio, items } = await mediaRatio('conflict', '"Poland" (drone OR airspace OR missile OR sabotage)', 'Polska (dron OR "przestrzeń powietrzna" OR rakieta OR sabotaż)');
    items.slice(0, 2).forEach((i) => feedItems.push({ at: i.date.toISOString(), cat: 'security', sev: 2, source: sourceOf(i.title), url: i.link,
      title: { pl: stripSource(i.title), en: stripSource(i.title) }, forYou: TIPS.security }));
    return ratioToScore(ratio, 40);
  },

  /** Cyber: natężenie doniesień o cyberatakach w PL + wpisy CERT Polska. */
  async cyber() {
    await sleep(6000); // GDELT: max 1 zapytanie / 5 s
    const { ratio } = await mediaRatio('cyber', '"Poland" (cyberattack OR "cyber attack" OR ransomware OR DDoS)', 'Polska (cyberatak OR ransomware OR DDoS OR "atak hakerski")');
    const score = ratioToScore(ratio, 35);
    try {
      const items = rss(await get('https://cert.pl/rss.xml', 'text')).slice(0, 2);
      items.forEach((i) => feedItems.push({ at: i.date.toISOString(), cat: 'security', sev: 2, source: 'CERT Polska', url: i.link,
        title: { pl: i.title, en: i.title }, forYou: TIPS.cyber }));
    } catch (e) { console.warn('CERT RSS:', e.message); }
    return score;
  },

  /** Energia: komunikat PSE o zalecanym użytkowaniu mocy na dziś (0 normalnie … 3 wymagane ograniczenia). */
  async energy() {
    const j = await get(`https://api.raporty.pse.pl/api/pdgsz?$filter=business_date%20eq%20'${today}'`);
    const active = (j.value ?? []).filter((v) => v.is_active);
    const rows = active.length ? active : j.value ?? [];
    if (!rows.length) throw new Error('PSE: brak danych na dziś');
    const max = Math.max(...rows.map((r) => r.usage_fcst ?? 0));
    if (max >= 2) feedItems.push({ at: new Date().toISOString(), cat: 'energy', sev: max >= 3 ? 4 : 3, source: 'PSE', url: 'https://www.pse.pl/',
      title: { pl: max >= 3 ? 'PSE: wymagane ograniczenie zużycia energii dziś' : 'PSE: zalecane oszczędzanie energii dziś', en: max >= 3 ? 'Polish grid operator: power use must be limited today' : 'Polish grid operator: save power today' },
      forYou: TIPS.energy });
    return { 0: 15, 1: 25, 2: 55, 3: 85 }[max] ?? 25;
  },

  /** Pogoda: ostrzeżenia IMGW (liczba i najwyższy stopień) + zdarzenia GDACS w Europie. */
  async weather() {
    let score = 10;
    const w = await get('https://danepubliczne.imgw.pl/api/data/warningsmeteo');
    if (Array.isArray(w) && w.length) {
      const lvl = Math.max(...w.map((x) => +x.stopien || 1));
      score = { 1: 30, 2: 55, 3: 80 }[lvl] ?? 30;
      score += Math.min(10, w.length / 5);
      const top = w.sort((a, b) => (+b.stopien || 0) - (+a.stopien || 0))[0];
      feedItems.push({ at: new Date(top.opublikowano || Date.now()).toISOString(), cat: 'weather', sev: Math.min(4, (+top.stopien || 1) + 1), source: 'IMGW', url: 'https://meteo.imgw.pl/',
        title: { pl: `IMGW: ${w.length} ostrzeż. meteo, najwyższy stopień ${lvl} — ${top.nazwa_zdarzenia ?? 'zjawiska'}`, en: `Polish Met Office: ${w.length} weather warnings, highest level ${lvl}` },
        forYou: TIPS.weather });
    }
    try {
      const from = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
      const g = await get(`https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?alertlevel=Orange;Red&fromDate=${from}`);
      const eu = (g.features ?? []).filter((f) => { const [lon, lat] = f.geometry?.coordinates ?? [0, 0]; return lon > -25 && lon < 45 && lat > 34 && lat < 72; });
      score += eu.length * 8;
      eu.slice(0, 2).forEach((f) => feedItems.push({ at: new Date(f.properties.fromdate || Date.now()).toISOString(), cat: 'weather', sev: f.properties.alertlevel === 'Red' ? 4 : 3, source: 'GDACS',
        url: f.properties.url?.report || 'https://www.gdacs.org/', title: { pl: f.properties.name, en: f.properties.name }, forYou: TIPS.disaster }));
    } catch (e) { console.warn('GDACS:', e.message); }
    return clamp(score, 5, 95);
  },

  /** Zdrowie: liczba komunikatów ECDC z 7 dni ze słowami outbreak/threat. Kotwica niska. */
  async health() {
    const items = rss(await get('https://www.ecdc.europa.eu/en/taxonomy/term/1307/feed', 'text'));
    const week = items.filter((i) => Date.now() - i.date < 7 * 864e5);
    const alarming = week.filter((i) => /outbreak|threat|epidemic|emergency/i.test(i.title));
    // Liczą się mocniej zdarzenia w Europie niż odległe ogniska.
    const inEurope = alarming.filter((i) => /Europe|EU\/EEA|\bEU\b|Poland|European/i.test(i.title));
    week.slice(0, 1).forEach((i) => feedItems.push({ at: i.date.toISOString(), cat: 'health', sev: alarming.length ? 2 : 1, source: 'ECDC', url: i.link,
      title: { pl: i.title, en: i.title }, forYou: TIPS.health }));
    return clamp(12 + inEurope.length * 15 + (alarming.length - inEurope.length) * 3, 5, 90);
  },
};

const sourceOf = (t) => (t.match(/ - ([^-]+)$/) || [])[1]?.trim() || 'Media';
const stripSource = (t) => t.replace(/ - [^-]+$/, '').trim();

const TIPS = {
  security: { pl: 'Poznaj sygnały syren i sprawdź najbliższe miejsce ukrycia. Nie udostępniaj niesprawdzonych nagrań.', en: 'Learn the siren signals and find your nearest shelter. Don’t share unverified footage.' },
  cyber: { pl: 'Aktualizuj system i aplikacje. Nie klikaj linków w SMS-ach o zagrożeniach — zgłaszaj je na 8080.', en: 'Keep devices updated. Don’t tap links in alert-style texts.' },
  energy: { pl: 'Ogranicz zużycie w godzinach szczytu, naładuj powerbanki i latarki.', en: 'Cut use at peak hours, charge power banks and torches.' },
  weather: { pl: 'Sprawdź ostrzeżenie dla swojego powiatu, naładuj telefon i zabezpiecz rzeczy na zewnątrz.', en: 'Check the warning for your area, charge your phone, secure outdoor items.' },
  disaster: { pl: 'Jeśli masz bliskich w regionie, ustal z nimi kontakt. Sprawdź swój plan ewakuacji.', en: 'If you have family in the area, check in. Review your own evacuation plan.' },
  health: { pl: 'Zwykle bez działań. Sprawdź apteczkę i daty ważności leków.', en: 'Usually no action. Check your first-aid kit and expiry dates.' },
};

/** Wartości bazowe, gdy źródło nie odpowie przy pierwszym uruchomieniu. */
const BASELINE = { conflict: 40, cyber: 35, energy: 25, weather: 15, health: 15 };

// ── Main ────────────────────────────────────────────────────
const readiness = JSON.parse(await readFile(READINESS, 'utf8'));
const feed = JSON.parse(await readFile(FEED, 'utf8'));
// Pierwsze prawdziwe uruchomienie: wyczyść przykładową historię, żeby nie mieszać jej z danymi.
if (readiness.sample) {
  readiness.history = []; readiness.historyDates = [];
  readiness.components.forEach((c) => { if (c.mode !== 'manual') { c.trend = []; c.raw = []; c.value = BASELINE[c.id] ?? 30; } });
}
let live = 0;
readiness.components.forEach((c) => { rawStore[c.id] = c.raw ?? []; });

for (const c of readiness.components) {
  if (c.mode === 'manual' || !sources[c.id]) { console.log(`• ${c.id}: ręcznie (${c.value})`); continue; }
  try {
    const v = await sources[c.id]();
    c.value = v; c.stale = false; live++;
    console.log(`✓ ${c.id}: ${v}`);
  } catch (e) {
    c.stale = true;
    console.warn(`✗ ${c.id}: ${e.message} — zostaje ${c.value}`);
  }
  c.trend = [...(c.trend ?? []), c.value].slice(-8);
  if (c.id === 'conflict') await sleep(6000);
}

readiness.components.forEach((c) => { if (rawStore[c.id]?.length) c.raw = rawStore[c.id]; });
const totalW = readiness.components.reduce((s, c) => s + c.weight, 0);
const score = clamp(readiness.components.reduce((s, c) => s + c.value * c.weight, 0) / totalW);
const lastDate = readiness.historyDates?.at(-1);
readiness.history = readiness.history ?? [];
readiness.historyDates = readiness.historyDates ?? [];
if (lastDate === today) { readiness.history[readiness.history.length - 1] = score; }
else { readiness.history.push(score); readiness.historyDates.push(today); }
readiness.history = readiness.history.slice(-30);
readiness.historyDates = readiness.historyDates.slice(-30);
const h = readiness.history;
readiness.score = score;
readiness.delta7 = h.length > 7 ? score - h[h.length - 8] : 0;
readiness.ago30 = h[0];
readiness.updatedAt = new Date().toISOString();
if (live >= 3) readiness.sample = false;

if (feedItems.length) {
  const seen = new Set();
  const merged = [...feedItems, ...(feed.sample ? [] : feed.items)]
    .filter((i) => (seen.has(i.url + i.title.pl) ? false : seen.add(i.url + i.title.pl)))
    .filter((i) => Date.now() - new Date(i.at) < 14 * 864e5)
    .sort((a, b) => +new Date(b.at) - +new Date(a.at))
    .slice(0, 20);
  feed.items = merged;
  feed.sample = false;
}

await writeFile(READINESS, JSON.stringify(readiness, null, 2) + '\n');
await writeFile(FEED, JSON.stringify(feed, null, 2) + '\n');
console.log(`Indeks: ${score} (źródła na żywo: ${live}/${readiness.components.length}), newsów: ${feed.items.length}`);
