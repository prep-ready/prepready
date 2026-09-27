#!/usr/bin/env node
/**
 * Codzienny wpis z indeksem gotowości w temacie „🚨 Alerty” grupy @prepreadyPL.
 * Działa, gdy w GitHubie jest sekret TG_BOT_PL_TOKEN (bot @PrepReady_PL_bot musi być adminem grupy).
 */
import { readFile } from 'node:fs/promises';

const token = process.env.TG_BOT_PL_TOKEN;
const chat = '@prepreadyPL';
const THREAD = 3; // 🚨 Alerty
if (!token) { console.log('Telegram: brak sekretu TG_BOT_PL_TOKEN — pomijam.'); process.exit(0); }

const r = JSON.parse(await readFile(new URL('../src/data/readiness.json', import.meta.url), 'utf8')).pl;
const f = JSON.parse(await readFile(new URL('../src/data/feed.json', import.meta.url), 'utf8')).pl;
const lvl = [[20, '🟢 Spokój'], [40, '🟢 Czujność'], [60, '🟡 Podwyższone'], [80, '🟠 Wysokie'], [100, '🔴 Krytyczne']].find(([m]) => r.score <= m)[1];
const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const delta = r.history.length > 7 ? ` (${r.delta7 >= 0 ? '+' : ''}${r.delta7} w 7 dni)` : '';
const news = f.items.slice(0, 3).map((i) => `• <a href="${i.url}">${esc(i.title)}</a> — ${esc(i.source)}`).join('\n');
const text = `<b>Indeks gotowości PrepReady: ${r.score}/100</b>${delta}\n${lvl}\n\n` +
  r.components.map((c) => `${esc(c.name)}: ${c.value}`).join(' · ') +
  (news ? `\n\n<b>Najważniejsze dziś</b>\n${news}` : '') +
  `\n\n👉 https://prepready.pro/pl/indeks/`;

const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ chat_id: chat, message_thread_id: THREAD, text, parse_mode: 'HTML', disable_web_page_preview: true }),
});
const j = await res.json();
console.log(j.ok ? 'Telegram: wysłano.' : `Telegram: błąd ${j.description}`);
