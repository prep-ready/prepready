#!/usr/bin/env node
/**
 * Codzienny wpis na kanale Telegram (opcjonalny).
 * Działa tylko, gdy w GitHubie ustawisz sekrety TELEGRAM_BOT_TOKEN i TELEGRAM_CHAT_ID.
 * TELEGRAM_CHAT_ID dla kanału publicznego to np. @prepready_pl (bot musi być adminem kanału).
 */
import { readFile } from 'node:fs/promises';

const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_ID: chat } = process.env;
if (!token || !chat) { console.log('Telegram: brak sekretów — pomijam.'); process.exit(0); }

const r = JSON.parse(await readFile(new URL('../src/data/readiness.json', import.meta.url), 'utf8')).pl;
const f = JSON.parse(await readFile(new URL('../src/data/feed.json', import.meta.url), 'utf8')).pl;
const lvl = [[20, '🟢 Spokój'], [40, '🟢 Czujność'], [60, '🟡 Podwyższone'], [80, '🟠 Wysokie'], [100, '🔴 Krytyczne']].find(([m]) => r.score <= m)[1];
const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const delta = r.history.length > 7 ? ` (${r.delta7 >= 0 ? '+' : ''}${r.delta7} w 7 dni)` : '';
const news = f.items.slice(0, 3).map((i) => `• <a href="${i.url}">${esc(i.title)}</a> — ${esc(i.source)}`).join('\n');
const text = `<b>Indeks gotowości PrepReady: ${r.score}/100</b>${delta}\n${lvl}\n\n` +
  r.components.map((c) => `${esc(c.name)}: ${c.value}`).join(' · ') +
  (news ? `\n\n<b>Najważniejsze dziś</b>\n${news}` : '') +
  `\n\n👉 https://prepready.pro/pl/`;

const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ chat_id: chat, text, parse_mode: 'HTML', disable_web_page_preview: true }),
});
const j = await res.json();
console.log(j.ok ? 'Telegram: wysłano.' : `Telegram: błąd ${j.description}`);
