#!/usr/bin/env node
/**
 * PrepReady — darmowa codzienna aktualizacja danych (GitHub Actions).
 *
 * Dwa niezależne regiony:
 *   pl — Polska: polskie źródła, polskie tytuły    → strona /pl/
 *   en — Global: źródła międzynarodowe, po angielsku → strona /en/
 *
 * Zapisuje:
 *   src/data/readiness.json  { pl: {...}, en: {...}, doomsdayClock }
 *   src/data/feed.json       { pl: { items }, en: { items } }
 *
 * Źródło, które nie odpowie, nie psuje strony: składowa zostaje z poprzednią wartością.
 * Składowe z "mode": "manual" (radiacja) ustawiasz ręcznie w readiness.json.
 */
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const READINESS = new URL('../src/data/readiness.json', import.meta.url);
const FEED = new URL('../src/data/feed.json', import.meta.url);
const SUPPLY = new URL('../src/data/supply.json', import.meta.url);
const UA = { 'User-Agent': 'PrepReady/1.0 (+https://prepready.pro)' };
const DAY = 864e5;

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
      await sleep(8000 * n);
    }
  }
}

/** Minimalny parser RSS (bez zależności). */
function rss(xml) {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
  const tag = (s, t) => (s.match(new RegExp(`<${t}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${t}>`)) || [])[1]?.trim() ?? '';
  const clean = (s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
  return items.map((i) => ({ title: clean(tag(i, 'title')), link: clean(tag(i, 'link')), date: new Date(tag(i, 'pubDate') || Date.now()) }))
    .filter((i) => !isNaN(i.date));
}
const sourceOf = (t) => (t.match(/ - ([^-]+)$/) || [])[1]?.trim() || 'Media';
const stripSource = (t) => t.replace(/ - [^-]+$/, '').trim();

// ── Natężenie doniesień medialnych ──────────────────────────
async function gdeltRatio(query, extra = '') {
  const u = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}${extra}&mode=timelinevol&format=json&timespan=30d`;
  const data = (await get(u)).timeline?.[0]?.data ?? [];
  if (data.length < 10) throw new Error('GDELT: za mało danych');
  const vals = data.map((d) => d.value);
  const avg = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  return avg(vals.slice(-3)) / Math.max(avg(vals.slice(0, -3)), 1e-6);
}

/** Google News RSS: liczba artykułów z 3 dni vs mediana własnych pomiarów z poprzednich dni. */
async function newsCount(q, lang) {
  const loc = lang === 'pl' ? 'hl=pl&gl=PL&ceid=PL:pl' : 'hl=en-US&gl=US&ceid=US:en';
  const u = `https://news.google.com/rss/search?q=${encodeURIComponent(q + ' when:3d')}&${loc}`;
  return rss(await get(u, 'text')).sort((a, b) => b.date - a.date);
}
// Skrypt działa co godzinę; historia pomiarów i trendy zapisują się raz na dobę (ostatni pomiar dnia nadpisuje poprzedni).
let NEW_DAY = true;
const pushDaily = (arr = [], v) => (NEW_DAY ? [...arr, v] : [...arr.slice(0, -1), v]);
function ratioFromHistory(comp, count) {
  const prev = NEW_DAY ? comp.raw ?? [] : (comp.raw ?? []).slice(0, -1);
  const sorted = [...prev].sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
  comp.raw = [...prev, count].slice(-30);
  return prev.length >= 3 && median > 0 ? count / median : 1;
}
const ratioToScore = (ratio, anchor) => clamp(anchor + 30 * Math.log2(Math.max(ratio, 0.25)), 5, 95);

/** Media: GDELT (jeśli odpowiada) albo Google News. Zwraca też nagłówki do feedu. */
async function media(comp, { gdelt, gdeltExtra = '', news, lang, anchor }) {
  const items = await newsCount(news, lang).catch(() => []);
  let ratio;
  try { ratio = await gdeltRatio(gdelt, gdeltExtra); }
  catch (e) {
    if (!items.length) throw e;
    console.warn(`  GDELT niedostępny (${e.message.slice(0, 40)}), liczę z Google News`);
    ratio = ratioFromHistory(comp, items.length);
  }
  await sleep(6000); // GDELT: max 1 zapytanie / 5 s
  return { score: ratioToScore(ratio, anchor), items };
}

// ── GDACS ───────────────────────────────────────────────────
const GDACS_PL = { EQ: 'Trzęsienie ziemi', TC: 'Cyklon tropikalny', FL: 'Powódź', VO: 'Erupcja wulkanu', DR: 'Susza', WF: 'Pożar lasu', TS: 'Tsunami' };
async function gdacs() {
  const from = new Date(Date.now() - 14 * DAY).toISOString().slice(0, 10);
  const g = await get(`https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?alertlevel=Orange;Red&fromDate=${from}`);
  return (g.features ?? []).map((f) => f.properties).map((p) => ({
    type: p.eventtype, level: p.alertlevel, country: p.country ?? '', name: p.name, url: p.url?.report || 'https://www.gdacs.org/',
    from: new Date(p.fromdate), fresh: Date.now() - new Date(p.fromdate) < 14 * DAY,
  }));
}

// ── Teksty „co to znaczy dla Ciebie” ────────────────────────
const TIP = {
  pl: {
    security: 'Poznaj sygnały syren i sprawdź najbliższe miejsce ukrycia. Nie udostępniaj niesprawdzonych nagrań.',
    safety: 'Unikaj miejsca zdarzenia i stosuj się do poleceń służb. Numer alarmowy: 112.',
    supply: 'Nie rób zakupów w panice. Uzupełniaj zapas stopniowo, a bak tankuj, gdy spadnie do połowy.',
    cyber: 'Aktualizuj system i aplikacje. Podejrzane SMS-y przekazuj na numer 8080.',
    energy: 'Ogranicz zużycie prądu w godzinach szczytu, naładuj powerbanki i latarki.',
    weather: 'Sprawdź ostrzeżenie dla swojego powiatu, naładuj telefon, zabezpiecz rzeczy na zewnątrz.',
    disaster: 'Jeśli masz bliskich w tym regionie, skontaktuj się z nimi. Przejrzyj swój plan ewakuacji.',
    health: 'Zwykle bez działań. Sprawdź apteczkę i daty ważności leków.',
  },
  en: {
    security: 'Know your local alert signals and nearest shelter. Don’t share unverified footage.',
    safety: 'Avoid the area and follow instructions from emergency services.',
    supply: 'Don’t panic-buy. Top up supplies gradually.',
    cyber: 'Update your devices and don’t tap links in alert-style messages.',
    energy: 'Keep power banks and torches charged; have a plan for heat and light without mains power.',
    weather: 'If you live nearby, follow local warnings and keep your go-bag ready.',
    disaster: 'If you have family in the area, check in. Review your own evacuation plan.',
    health: 'Usually no action. Check your first-aid kit and expiry dates.',
  },
};
/** Konkretna rada zależna od treści wiadomości (pierwsza pasująca reguła), w razie braku: rada dla kategorii. */
const RULES = {
  pl: [
    [/dron|przestrze[nń] powietrzn|rakiet|poderwan|myśliw/i, 'Jeśli RCB ogłosi zagrożenie z powietrza w Twoim regionie, zejdź do piwnicy lub pomieszczenia bez okien i śledź Alert RCB. Nie podchodź do szczątków, zgłoś je pod 112.'],
    [/sabota[żz]|dywersj|podpalen|kolej|tor[óo]w/i, 'Zgłaszaj podejrzane osoby i przedmioty przy torach, liniach energetycznych i obiektach wojskowych pod 112. Nie rób zdjęć instalacji wojskowych.'],
    [/ćwiczen|manewr|kolumn|konw[oó]j|przemarsz/i, 'Ćwiczenia wojskowe: spodziewaj się utrudnień na drogach i hałasu. To zaplanowane działania, nie powód do niepokoju.'],
    [/mobilizac|pobór|kwalifikacj|karta mobilizacyjn/i, 'Sprawdź, czy Twoje dane w urzędzie i WKU są aktualne. Informacje o wezwaniach podaje tylko wojsko i gov.pl.'],
    [/ewakuac/i, 'Słuchaj poleceń służb, weź plecak ewakuacyjny, dokumenty i leki. Nie wracaj, dopóki służby nie odwołają ewakuacji.'],
    [/alarm bombow|ładun|podejrzan[ay] (pakunek|przedmiot)/i, 'Omijaj wskazany teren i nie podchodź do podejrzanych pakunków. Stosuj się do poleceń policji.'],
    [/strzelanin|strzał|nożownik|atak na|napastnik/i, 'Jeśli jesteś w pobliżu: uciekaj, a jeśli nie możesz, ukryj się i wycisz telefon. Dzwoń pod 112, gdy będzie to bezpieczne. Unikaj okolicy i nie powielaj niesprawdzonych nagrań.'],
    [/fałszyw|dezinformac|fake/i, 'Sprawdzaj informacje w źródłach urzędowych (gov.pl, RCB, policja) zanim je udostępnisz.'],
  ],
  en: [
    [/drone|airspace|missile|interceptor|jet/i, 'If authorities issue an air threat alert where you are, go to a basement or a windowless inner room and follow official alerts. Do not touch debris; report it to emergency services.'],
    [/nuclear|radiation|radiolog/i, 'If authorities warn of radiation, go inside, close windows and follow official instructions. Take iodine tablets only if told to.'],
    [/sabotage|arson|railway|pipeline|cable/i, 'Report suspicious activity near railways, power lines or military sites to emergency services. Do not photograph military installations.'],
    [/evacuat/i, 'Follow official instructions, take your go-bag, documents and medication, and do not return until the order is lifted.'],
    [/mobiliz|conscription|draft/i, 'Rely only on official government sources for call-up information.'],
    [/ceasefire|talks|negotiat/i, 'No action needed. Keep your basic supplies ready; situations can change quickly.'],
  ],
};
const tipFor = (lang, cat, title) => ((cat === 'security' || cat === 'safety') && RULES[lang].find(([re]) => re.test(title))?.[1]) || TIP[lang][cat] || TIP[lang].security;
const OFFICIAL = /^(IMGW|PSE|CERT Polska|GDACS|ECDC|RCB|Policja|gov\.pl|policja\.pl|Rządowe Centrum Bezpieczeństwa|Ministerstwo|MON|MSWiA|Dowództwo Operacyjne|Straż Graniczna|PSP)/i;
const item = (lang, cat, sev, source, url, title, at = new Date()) =>
  ({ at: new Date(at).toISOString(), cat, sev, source, url, title, official: OFFICIAL.test(source) || /\.gov\.pl|policja\.pl|wojsko-polskie\.pl/.test(url), forYou: tipFor(lang, cat, title) });

// ── Regiony ─────────────────────────────────────────────────
const REGIONS = {
  pl: {
    async conflict(c, feed) {
      const { score, items } = await media(c, { lang: 'pl', anchor: 40,
        gdelt: '"Poland" (drone OR airspace OR missile OR sabotage)',
        news: 'Polska (dron OR "przestrzeń powietrzna" OR rakieta OR sabotaż OR wojsko)' });
      items.slice(0, 3).forEach((i) => feed.push(item('pl', 'security', 2, sourceOf(i.title), i.link, stripSource(i.title), i.date)));
      // Zdarzenia w kraju: ewakuacje, alarmy bombowe, ataki, komunikaty policji i RCB (z ostatnich 24 h).
      try {
        const inc = (await newsCount('(ewakuacja OR "alarm bombowy" OR strzelanina OR nożownik OR "atak w szkole" OR "komunikat policji" OR "Alert RCB") Polska', 'pl'))
          .filter((i) => Date.now() - i.date < DAY).slice(0, 3);
        inc.forEach((i) => feed.push(item('pl', 'safety', /strzel|nożow|atak|bomb/i.test(i.title) ? 3 : 2, sourceOf(i.title), i.link, stripSource(i.title), i.date)));
      } catch (e) { console.warn('  incydenty:', e.message); }
      return score;
    },
    async cyber(c, feed) {
      const { score } = await media(c, { lang: 'pl', anchor: 35,
        gdelt: '"Poland" (cyberattack OR "cyber attack" OR ransomware OR DDoS)',
        news: 'Polska (cyberatak OR ransomware OR DDoS OR "atak hakerski")' });
      try {
        rss(await get('https://cert.pl/rss.xml', 'text')).slice(0, 2)
          .forEach((i) => feed.push(item('pl', 'cyber', 2, 'CERT Polska', i.link, i.title, i.date)));
      } catch (e) { console.warn('  CERT:', e.message); }
      return score;
    },
    async energy(c, feed) {
      const j = await get(`https://api.raporty.pse.pl/api/pdgsz?$filter=business_date%20eq%20'${today}'`);
      const rows = (j.value ?? []).filter((v) => v.is_active);
      const all = rows.length ? rows : j.value ?? [];
      if (!all.length) throw new Error('PSE: brak danych na dziś');
      const max = Math.max(...all.map((r) => r.usage_fcst ?? 0));
      if (max >= 2) feed.push(item('pl', 'energy', max >= 3 ? 4 : 3, 'PSE', 'https://www.pse.pl/',
        max >= 3 ? 'PSE: dziś wymagane ograniczenie zużycia energii' : 'PSE: dziś zalecane oszczędzanie energii'));
      return { 0: 15, 1: 25, 2: 55, 3: 85 }[max] ?? 25;
    },
    async weather(c, feed, ctx) {
      let score = 10;
      const w = await get('https://danepubliczne.imgw.pl/api/data/warningsmeteo');
      if (Array.isArray(w) && w.length) {
        const lvl = Math.max(...w.map((x) => +x.stopien || 1));
        score = ({ 1: 30, 2: 55, 3: 80 }[lvl] ?? 30) + Math.min(10, w.length / 5);
        const top = [...w].sort((a, b) => (+b.stopien || 0) - (+a.stopien || 0))[0];
        feed.push(item('pl', 'weather', Math.min(4, (+top.stopien || 1) + 1), 'IMGW', 'https://meteo.imgw.pl/',
          `IMGW: ${w.length} ostrzeżeń meteo, najwyższy stopień ${lvl}: ${top.nazwa_zdarzenia ?? 'zjawiska'}`, top.opublikowano || Date.now()));
      }
      const near = (ctx.gdacs ?? []).filter((e) => /Poland|Germany|Czech|Slovakia|Ukraine|Lithuania|Belarus/.test(e.country));
      score += near.filter((e) => e.fresh).length * 10 + near.filter((e) => !e.fresh).length * 3;
      near.filter((e) => e.fresh).slice(0, 2).forEach((e) => feed.push(item('pl', 'disaster', e.level === 'Red' ? 4 : 3, 'GDACS', e.url,
        `${GDACS_PL[e.type] ?? 'Zdarzenie'}: ${e.country.split(',')[0]} (alert ${e.level === 'Red' ? 'czerwony' : 'pomarańczowy'})`, e.from)));
      return clamp(score, 5, 95);
    },
    async health(c, feed, ctx) {
      const week = (ctx.ecdc ?? []).filter((i) => Date.now() - i.date < 7 * DAY);
      const eu = week.filter((i) => /outbreak|threat|epidemic|emergency/i.test(i.title) && /Europe|EU\/EEA|\bEU\b|Poland|European/i.test(i.title));
      try {
        const n = await newsCount('(GIS OR sanepid OR epidemia OR "ognisko choroby") Polska', 'pl');
        n.slice(0, 1).forEach((i) => feed.push(item('pl', 'health', 1, sourceOf(i.title), i.link, stripSource(i.title), i.date)));
      } catch {}
      return clamp(12 + eu.length * 15, 5, 90);
    },
  },

  en: {
    async conflict(c, feed) {
      const { score, items } = await media(c, { lang: 'en', anchor: 45,
        gdelt: '(missile OR airstrike OR invasion OR "nuclear threat" OR mobilization)',
        news: '(missile strike OR airstrike OR invasion OR "nuclear threat" OR escalation) war' });
      items.slice(0, 3).forEach((i) => feed.push(item('en', 'security', 2, sourceOf(i.title), i.link, stripSource(i.title), i.date)));
      return score;
    },
    async cyber(c, feed) {
      const { score, items } = await media(c, { lang: 'en', anchor: 35,
        gdelt: '(cyberattack OR "cyber attack" OR ransomware) (infrastructure OR hospital OR grid OR airport)',
        news: '(cyberattack OR ransomware) (infrastructure OR hospital OR grid OR airport)' });
      items.slice(0, 1).forEach((i) => feed.push(item('en', 'cyber', 2, sourceOf(i.title), i.link, stripSource(i.title), i.date)));
      return score;
    },
    async energy(c, feed) {
      const items = await newsCount('("power outage" OR blackout OR "grid failure") (millions OR nationwide OR widespread)', 'en');
      const ratio = ratioFromHistory(c, items.length);
      items.slice(0, 1).forEach((i) => feed.push(item('en', 'energy', 2, sourceOf(i.title), i.link, stripSource(i.title), i.date)));
      return ratioToScore(ratio, 25);
    },
    async weather(c, feed, ctx) {
      const ev = ctx.gdacs ?? [];
      if (!ctx.gdacs) throw new Error('GDACS niedostępny');
      const fresh = ev.filter((e) => e.fresh);
      const score = 10 + fresh.filter((e) => e.level === 'Red').length * 15 + fresh.filter((e) => e.level === 'Orange').length * 6 + (ev.length - fresh.length) * 1;
      fresh.sort((a, b) => b.from - a.from).slice(0, 3).forEach((e) =>
        feed.push(item('en', 'disaster', e.level === 'Red' ? 4 : 3, 'GDACS', e.url, `${e.name} (${e.level} alert)`, e.from)));
      return clamp(score, 5, 95);
    },
    async health(c, feed, ctx) {
      const week = (ctx.ecdc ?? []).filter((i) => Date.now() - i.date < 7 * DAY);
      const alarming = week.filter((i) => /outbreak|threat|epidemic|emergency|pandemic/i.test(i.title));
      week.slice(0, 2).forEach((i) => feed.push(item('en', 'health', alarming.includes(i) ? 2 : 1, 'ECDC', i.link, i.title, i.date)));
      return clamp(12 + alarming.length * 8, 5, 90);
    },
  },
};

const BASELINE = { conflict: 40, cyber: 35, energy: 25, weather: 15, health: 15 };

// ── Main ────────────────────────────────────────────────────
const readiness = JSON.parse(await readFile(READINESS, 'utf8'));
const feedFile = JSON.parse(await readFile(FEED, 'utf8'));

const ctx = {};
try { ctx.gdacs = await gdacs(); } catch (e) { console.warn('GDACS:', e.message); }
try { ctx.ecdc = rss(await get('https://www.ecdc.europa.eu/en/taxonomy/term/1307/feed', 'text')); } catch (e) { console.warn('ECDC:', e.message); }

for (const region of ['pl', 'en']) {
  const R = readiness[region];
  if (R.sample) { // pierwsze prawdziwe uruchomienie: bez przykładowej historii
    R.history = []; R.historyDates = [];
    R.components.forEach((c) => { if (c.mode !== 'manual') { c.trend = []; c.raw = []; c.value = BASELINE[c.id] ?? 30; } });
  }
  NEW_DAY = R.historyDates?.at(-1) !== today;
  const feed = [];
  let live = 0;
  console.log(`\n[${region.toUpperCase()}]`);
  for (const c of R.components) {
    const fn = REGIONS[region][c.id];
    if (c.mode === 'manual' || !fn) { console.log(`• ${c.id}: ręcznie (${c.value})`); c.trend = pushDaily(c.trend, c.value).slice(-8); continue; }
    try { c.value = await fn(c, feed, ctx); c.stale = false; live++; console.log(`✓ ${c.id}: ${c.value}`); }
    catch (e) { c.stale = true; console.warn(`✗ ${c.id}: ${e.message.slice(0, 90)} — zostaje ${c.value}`); }
    c.trend = pushDaily(c.trend, c.value).slice(-8);
  }
  const totalW = R.components.reduce((s, c) => s + c.weight, 0);
  const score = clamp(R.components.reduce((s, c) => s + c.value * c.weight, 0) / totalW);
  R.history ??= []; R.historyDates ??= [];
  if (R.historyDates.at(-1) === today) R.history[R.history.length - 1] = score;
  else { R.history.push(score); R.historyDates.push(today); }
  R.history = R.history.slice(-30); R.historyDates = R.historyDates.slice(-30);
  R.score = score;
  R.delta7 = R.history.length > 7 ? score - R.history[R.history.length - 8] : 0;
  R.ago30 = R.history[0];
  R.updatedAt = new Date().toISOString();
  if (live >= 3) R.sample = false;

  const F = feedFile[region] ?? { items: [] };
  if (feed.length) {
    const seen = new Set();
    F.items = [...feed, ...(F.sample ? [] : F.items)]
      .filter((i) => (seen.has(i.url + i.title) ? false : seen.add(i.url + i.title)))
      .filter((i) => Date.now() - new Date(i.at) < 14 * DAY)
      .sort((a, b) => +new Date(b.at) - +new Date(a.at))
      .slice(0, 20);
    F.sample = false;
  }
  F.updatedAt = new Date().toISOString();
  feedFile[region] = F;
  console.log(`→ indeks ${region}: ${score} (na żywo ${live}/${R.components.length}), newsów: ${F.items.length}`);
}

// ── Ceny i zaopatrzenie (PL): paliwa z Weekly Oil Bulletin KE (co tydzień), kursy z NBP (dni robocze) ──
let supply = {};
try { supply = JSON.parse(await readFile(SUPPLY, 'utf8')); } catch {}
try {
  const rate = async (code) => (await get(`https://api.nbp.pl/api/exchangerates/rates/a/${code}/last/8/?format=json`)).rates;
  const eur = await rate('eur'), usd = await rate('usd');
  const fx = (r) => ({ value: r.at(-1).mid, date: r.at(-1).effectiveDate, prev: r.at(-2)?.mid ?? null, week: r[0].mid });
  supply.fx = { eur: fx(eur), usd: fx(usd), source: 'NBP' };
  // Oil Bulletin: plik „Prices with taxes, latest” (XLSX). Rozpakowanie systemowym unzip, bez zależności npm.
  const dir = await mkdtemp(join(tmpdir(), 'ob-'));
  const r = await fetch('https://energy.ec.europa.eu/document/download/264c2d0f-f161-4ea3-a777-78faae59bea0_en', { headers: UA, signal: AbortSignal.timeout(60000) });
  if (!r.ok) throw new Error(`Oil Bulletin ${r.status}`);
  await writeFile(join(dir, 'ob.xlsx'), Buffer.from(await r.arrayBuffer()));
  const unzip = (f) => execFileSync('unzip', ['-p', join(dir, 'ob.xlsx'), f], { encoding: 'utf8' });
  const strings = [...unzip('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => m[1].replace(/<[^>]+>/g, '').trim());
  const rows = [...unzip('xl/worksheets/sheet1.xml').matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].map((m) =>
    Object.fromEntries([...m[1].matchAll(/<c r="([A-Z]+)\d+"([^>]*)>(?:<v>([^<]*)<\/v>)?/g)].map(([, col, attr, v]) => [col, /t="s"/.test(attr) ? strings[+v] : v])));
  const serial = +rows.find((x) => /^\d{5}(\.\d+)?$/.test(String(x.A ?? '')))?.A;
  const dateOB = serial ? new Date(Date.UTC(1899, 11, 30) + serial * DAY).toISOString().slice(0, 10) : today;
  const pl = rows.find((x) => /^Poland$/i.test(String(x.A ?? '').trim()));
  if (!pl) throw new Error('Oil Bulletin: brak wiersza Poland');
  const eurPln = supply.fx.eur.value;
  const perL = (v) => Math.round((+v / 1000) * eurPln * 100) / 100;      // EUR/1000 l → zł/l
  const now = { date: dateOB, pb95: perL(pl.B), on: perL(pl.C), lpg: perL(pl.G) };
  supply.fuel ??= { history: [] };
  const H = supply.fuel.history.filter((h) => h.date !== now.date);
  supply.fuel.history = [...H, now].sort((a, b) => a.date.localeCompare(b.date)).slice(-12);
  supply.fuel.source = 'Komisja Europejska, Weekly Oil Bulletin (ceny z podatkami, przeliczone kursem NBP)';
  const prev = supply.fuel.history.at(-2);
  const jump = prev ? Math.max(...['pb95', 'on', 'lpg'].map((k) => (now[k] - prev[k]) / prev[k])) : 0;
  const fuelTitle = `Ceny paliw w Polsce wzrosły w tydzień o ${Math.round(jump * 100)}%: Pb95 ${now.pb95.toFixed(2)} zł, ON ${now.on.toFixed(2)} zł`;
  if (jump > 0.05 && !feedFile.pl.items.some((i) => i.cat === 'supply' && i.at.startsWith(dateOB))) feedFile.pl.items.unshift(item('pl', 'supply', 3, 'Komisja Europejska', 'https://energy.ec.europa.eu/data-and-analysis/weekly-oil-bulletin_en',
    fuelTitle, new Date(dateOB + 'T12:00:00Z')));
  supply.updatedAt = new Date().toISOString();
  console.log(`✓ ceny: Pb95 ${now.pb95} ON ${now.on} LPG ${now.lpg} (${dateOB}), EUR ${eurPln}`);
} catch (e) { console.warn('✗ ceny i zaopatrzenie:', e.message); }
await writeFile(SUPPLY, JSON.stringify(supply, null, 2) + '\n');

await writeFile(READINESS, JSON.stringify(readiness, null, 2) + '\n');
await writeFile(FEED, JSON.stringify(feedFile, null, 2) + '\n');
