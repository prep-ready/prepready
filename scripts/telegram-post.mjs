#!/usr/bin/env node
/**
 * Codzienny wpis z indeksem gotowości w tematach alertów:
 *  - PL: @prepreadyPL, temat „🚨 Alerty” (3) — sekret TG_BOT_PL_TOKEN
 *  - EN: @prepready_global, topic „🚨 Alerts” (2) — sekret TG_BOT_EN_TOKEN
 * Boty muszą być adminami grup.
 */
import { readFile } from 'node:fs/promises';

const R = JSON.parse(await readFile(new URL('../src/data/readiness.json', import.meta.url), 'utf8'));
const F = JSON.parse(await readFile(new URL('../src/data/feed.json', import.meta.url), 'utf8'));
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

const CFG = {
  pl: { token: process.env.TG_BOT_PL_TOKEN, chat: '@prepreadyPL', thread: 3, title: 'Indeks gotowości PrepReady', news: 'Najważniejsze dziś',
    week: 'w 7 dni', url: 'https://prepready.pro/pl/indeks/',
    lvl: [[20, '🟢 Spokój'], [40, '🟢 Czujność'], [60, '🟡 Podwyższone'], [80, '🟠 Wysokie'], [100, '🔴 Krytyczne']] },
  en: { token: process.env.TG_BOT_EN_TOKEN, chat: '@prepready_global', thread: 2, title: 'PrepReady Global Readiness Index', news: 'Top stories today',
    week: 'in 7 days', url: 'https://prepready.pro/en/readiness-index/',
    lvl: [[20, '🟢 Calm'], [40, '🟢 Watchful'], [60, '🟡 Elevated'], [80, '🟠 High'], [100, '🔴 Critical']] },
};

for (const [lang, c] of Object.entries(CFG)) {
  if (!c.token) { console.log(`Telegram ${lang}: brak tokena — pomijam.`); continue; }
  const r = R[lang], f = F[lang];
  if (!r) continue;
  const lvl = c.lvl.find(([m]) => r.score <= m)[1];
  const delta = r.history?.length > 7 ? ` (${r.delta7 >= 0 ? '+' : ''}${r.delta7} ${c.week})` : '';
  const news = (f?.items ?? []).slice(0, 3).map((i) => `• <a href="${i.url}">${esc(i.title)}</a> — ${esc(i.source)}`).join('\n');
  const text = `<b>${c.title}: ${r.score}/100</b>${delta}\n${lvl}\n\n` +
    r.components.map((x) => `${esc(x.name)}: ${x.value}`).join(' · ') +
    (news ? `\n\n<b>${c.news}</b>\n${news}` : '') + `\n\n👉 ${c.url}`;
  const res = await fetch(`https://api.telegram.org/bot${c.token}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: c.chat, message_thread_id: c.thread, text, parse_mode: 'HTML', link_preview_options: { is_disabled: true } }),
  });
  const j = await res.json();
  console.log(j.ok ? `Telegram ${lang}: wysłano.` : `Telegram ${lang}: błąd ${j.description}`);
}
