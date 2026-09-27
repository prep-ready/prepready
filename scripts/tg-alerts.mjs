#!/usr/bin/env node
/**
 * Alerty do grup Telegram (uruchamiane co 30 min przez .github/workflows/tg-alerts.yml):
 *  - PL  @prepreadyPL,      temat „🚨 Alerty” (3): nowe ostrzeżenia IMGW meteo i hydro, stopień ≥ 2.   Sekret TG_BOT_PL_TOKEN.
 *  - EN  @prepready_global, topic „🚨 Alerts” (2): new GDACS orange/red events (bez susz).            Sekret TG_BOT_EN_TOKEN.
 * Pamięć wysłanych alertów: .tg-alerts-state.json (cache GitHub Actions). Pierwsze uruchomienie tylko zapamiętuje bieżące alerty.
 */
import { readFile, writeFile } from 'node:fs/promises';

const STATE = '.tg-alerts-state.json';
let state = { sent: {} };
try { state = JSON.parse(await readFile(STATE, 'utf8')); } catch {}
const seeded = (prefix) => Object.keys(state.sent).some((k) => k.startsWith(prefix));

const esc = (s = '') => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const when = (s) => String(s || '').replace('T', ' ').slice(0, 16);
const get = async (u) => { try { const r = await fetch(u); return r.ok ? await r.json() : null; } catch { return null; } };
const list = (j) => (Array.isArray(j) ? j : []);

async function send(token, chat, thread, text) {
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, message_thread_id: thread, text, parse_mode: 'HTML', link_preview_options: { is_disabled: true } }),
  });
  const j = await r.json();
  if (!j.ok) console.log('Telegram error:', j.description);
  return j.ok;
}

async function run(label, token, chat, thread, prefix, msgs) {
  if (!token) { console.log(`${label}: brak tokena — pomijam.`); return; }
  const first = !seeded(prefix) && !process.env.TG_ALERTS_SEND_EXISTING;
  let n = 0;
  for (const [key, text] of msgs) {
    if (state.sent[key]) continue;
    if (!first && !(await send(token, chat, thread, text))) continue;
    state.sent[key] = Date.now(); n++;
  }
  console.log(first ? `${label}: pierwsze uruchomienie — zapamiętano ${n} alertów bez wysyłki.` : `${label}: wysłano ${n}.`);
}

// ── PL: IMGW ──────────────────────────────────────────────
const WOJ = { '02': 'dolnośląskie', '04': 'kujawsko-pomorskie', '06': 'lubelskie', '08': 'lubuskie', '10': 'łódzkie', '12': 'małopolskie',
  '14': 'mazowieckie', '16': 'opolskie', '18': 'podkarpackie', '20': 'podlaskie', '22': 'pomorskie', '24': 'śląskie',
  '26': 'świętokrzyskie', '28': 'warmińsko-mazurskie', '30': 'wielkopolskie', '32': 'zachodniopomorskie' };
const dotPl = (n) => (n >= 3 ? '🔴' : n === 2 ? '🟠' : '🟡');
const pl = [];
if (process.env.TG_BOT_PL_TOKEN) {
  for (const w of list(await get('https://danepubliczne.imgw.pl/api/data/warningsmeteo'))) {
    const lvl = +w.stopien || 0;
    if (lvl < 2) continue;
    const woj = [...new Set((w.teryt || []).map((t) => WOJ[String(t).slice(0, 2)]).filter(Boolean))].sort();
    pl.push([`pl:m:${w.id}:${lvl}`, `${dotPl(lvl)} <b>IMGW: ${esc(w.nazwa_zdarzenia)} — ${lvl}° stopień</b>\n` +
      `📍 ${woj.length ? esc(woj.join(', ')) : 'wg mapy IMGW'}\n🕒 od ${esc(when(w.obowiazuje_od))} do ${esc(when(w.obowiazuje_do))}\n\n` +
      `${esc(w.tresc)}\n\nMapa i powiaty: https://meteo.imgw.pl/`]);
  }
  for (const w of list(await get('https://danepubliczne.imgw.pl/api/data/warningshydro'))) {
    const lvl = +(w['stopień'] ?? w.stopien) || 0;
    if (lvl < 2) continue;
    const woj = [...new Set((w.obszary || []).map((o) => o.wojewodztwo).filter(Boolean))].sort();
    pl.push([`pl:h:${w.numer}:${w.biuro}:${lvl}:${w.data_od}`, `${dotPl(lvl)} <b>IMGW hydro: ${esc(w.zdarzenie)} — ${lvl}° stopień</b>\n` +
      `📍 ${esc(woj.join(', '))}\n🕒 od ${esc(when(w.data_od))} do ${esc(when(w.data_do))}\n\n${esc(w.przebieg)}\n\nSzczegóły: https://hydro.imgw.pl/`]);
  }
}
await run('PL', process.env.TG_BOT_PL_TOKEN, '@prepreadyPL', 3, 'pl:', pl);

// ── EN: GDACS ─────────────────────────────────────────────
const TYPE = { EQ: '🌍 Earthquake', TC: '🌀 Tropical cyclone', FL: '🌊 Flood', VO: '🌋 Volcano', WF: '🔥 Wildfire', TS: '🌊 Tsunami' };
const en = [];
if (process.env.TG_BOT_EN_TOKEN) {
  const since = new Date(Date.now() - 10 * 864e5).toISOString().slice(0, 10);
  const g = await get(`https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?alertlevel=Orange;Red&fromDate=${since}`);
  for (const f of g?.features ?? []) {
    const p = f.properties || {};
    if (!TYPE[p.eventtype] || p.iscurrent !== 'true') continue;
    const red = p.alertlevel === 'Red';
    en.push([`en:${p.eventtype}:${p.eventid}:${p.alertlevel}`,
      `${red ? '🔴' : '🟠'} <b>${TYPE[p.eventtype]} — ${esc(p.alertlevel)} alert</b>\n${esc(p.name)}\n` +
      (p.country ? `📍 ${esc(String(p.country).replace(/,\s*$/, ''))}\n` : '') +
      (p.severitydata?.severitytext ? `⚠️ ${esc(p.severitydata.severitytext)}\n` : '') +
      `🕒 since ${esc(when(p.fromdate))} UTC\n\nFollow your local authorities. Details: ${p.url?.report || 'https://www.gdacs.org/'}`]);
  }
}
await run('EN', process.env.TG_BOT_EN_TOKEN, '@prepready_global', 2, 'en:', en);

for (const [k, t] of Object.entries(state.sent)) if (t < Date.now() - 21 * 864e5) delete state.sent[k];
await writeFile(STATE, JSON.stringify(state));
