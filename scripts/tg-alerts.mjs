#!/usr/bin/env node
/**
 * Alerty IMGW do tematu „🚨 Alerty” w grupie @prepreadyPL.
 * Uruchamiane co 30 min przez .github/workflows/tg-alerts.yml.
 * Wysyła tylko NOWE ostrzeżenia meteo (stopień ≥ 2) i hydro (stopień ≥ 2).
 * Pamięć wysłanych ostrzeżeń: plik .tg-alerts-state.json (trzymany w cache GitHub Actions).
 */
import { readFile, writeFile } from 'node:fs/promises';

const token = process.env.TG_BOT_PL_TOKEN;
if (!token) { console.log('Brak TG_BOT_PL_TOKEN — pomijam.'); process.exit(0); }
const CHAT = '@prepreadyPL';
const THREAD = 3; // 🚨 Alerty
const STATE = '.tg-alerts-state.json';

const WOJ = { '02': 'dolnośląskie', '04': 'kujawsko-pomorskie', '06': 'lubelskie', '08': 'lubuskie', '10': 'łódzkie', '12': 'małopolskie',
  '14': 'mazowieckie', '16': 'opolskie', '18': 'podkarpackie', '20': 'podlaskie', '22': 'pomorskie', '24': 'śląskie',
  '26': 'świętokrzyskie', '28': 'warmińsko-mazurskie', '30': 'wielkopolskie', '32': 'zachodniopomorskie' };
const esc = (s = '') => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const dot = (n) => (n >= 3 ? '🔴' : n === 2 ? '🟠' : '🟡');
const when = (s) => String(s || '').slice(0, 16);

let state = { sent: {} };
try { state = JSON.parse(await readFile(STATE, 'utf8')); } catch {}
const firstRun = Object.keys(state.sent).length === 0 && !process.env.TG_ALERTS_SEND_EXISTING;

const get = async (u) => { try { const r = await fetch(u); return r.ok ? await r.json() : []; } catch { return []; } };
const meteo = await get('https://danepubliczne.imgw.pl/api/data/warningsmeteo');
const hydro = await get('https://danepubliczne.imgw.pl/api/data/warningshydro');

const msgs = [];
for (const w of meteo) {
  const lvl = +w.stopien || 0;
  const key = `m:${w.id}:${lvl}`;
  if (lvl < 2 || state.sent[key]) continue;
  const woj = [...new Set((w.teryt || []).map((t) => WOJ[String(t).slice(0, 2)]).filter(Boolean))].sort();
  msgs.push([key, `${dot(lvl)} <b>IMGW: ${esc(w.nazwa_zdarzenia)} — ${lvl}° stopień</b>\n` +
    `📍 ${woj.length ? esc(woj.join(', ')) : 'wg mapy IMGW'}\n` +
    `🕒 od ${esc(when(w.obowiazuje_od))} do ${esc(when(w.obowiazuje_do))}\n\n${esc(w.tresc)}\n\n` +
    `Mapa i powiaty: https://meteo.imgw.pl/`]);
}
for (const w of hydro) {
  const lvl = +(w['stopień'] ?? w.stopien) || 0;
  const key = `h:${w.numer}:${w.biuro}:${lvl}:${w.data_od}`;
  if (lvl < 2 || state.sent[key]) continue;
  const woj = [...new Set((w.obszary || []).map((o) => o.wojewodztwo).filter(Boolean))].sort();
  msgs.push([key, `${dot(lvl)} <b>IMGW hydro: ${esc(w.zdarzenie)} — ${lvl}° stopień</b>\n` +
    `📍 ${esc(woj.join(', '))}\n🕒 od ${esc(when(w.data_od))} do ${esc(when(w.data_do))}\n\n${esc(w.przebieg)}\n\n` +
    `Szczegóły: https://hydro.imgw.pl/`]);
}

for (const [key, text] of msgs) {
  if (!firstRun) {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT, message_thread_id: THREAD, text, parse_mode: 'HTML', link_preview_options: { is_disabled: true } }),
    });
    const j = await r.json();
    if (!j.ok) { console.log('Błąd:', j.description); continue; }
  }
  state.sent[key] = Date.now();
}
// zapominamy wpisy starsze niż 14 dni
for (const [k, t] of Object.entries(state.sent)) if (t < Date.now() - 14 * 864e5) delete state.sent[k];
await writeFile(STATE, JSON.stringify(state));
console.log(firstRun ? `Pierwsze uruchomienie: zapamiętano ${msgs.length} ostrzeżeń bez wysyłki.` : `Wysłano ${msgs.length} alertów.`);
