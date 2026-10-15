#!/usr/bin/env node
/**
 * Treści z bloga do grup Telegram (raz dziennie, .github/workflows/tg-content.yml).
 *  - 🆕 Nowy poradnik → temat Porady/Tips (max 1 dziennie; kolejka, jeśli wyszło kilka naraz)
 *  - 💡 Porada dnia z FAQ poradników → Porady/Tips (w dni bez nowego poradnika; rotacja bez powtórek)
 *  - 🧰 Środa: poradnik zakupowy → Sprzęt/Gear
 *  - 🛠 Piątek: narzędzie PrepReady (mapa schronów, checklista, indeks) → Porady/Tips
 *  - 💬 Niedziela: pytanie do społeczności → Dyskusja/Discussion
 * Dane: https://prepready.pro/tg-artykuly.json (generuje build). Pamięć ogłoszonych poradników: .tg-content-state.json (cache Actions).
 * TG_DRY=1 — tylko wypisuje wiadomości. TG_DATE=2026-10-18 — symuluje dzień. TG_FEED=dist/tg-artykuly.json — plik lokalny.
 */
import { readFile, writeFile } from 'node:fs/promises';

const DRY = !!process.env.TG_DRY;
const today = process.env.TG_DATE ? new Date(process.env.TG_DATE + 'T10:00:00Z') : new Date();
const day = Math.floor(today.getTime() / 864e5);          // numer dnia — do rotacji
const week = Math.floor((day + 3) / 7);                    // numer tygodnia
const dow = today.getUTCDay();                             // 0 niedziela … 3 środa … 5 piątek
const STATE = '.tg-content-state.json';
let state = { announced: {} };
try { state = JSON.parse(await readFile(STATE, 'utf8')); } catch {}

const feed = process.env.TG_FEED
  ? JSON.parse(await readFile(process.env.TG_FEED, 'utf8'))
  : await (await fetch('https://prepready.pro/tg-artykuly.json')).json();

const esc = (s = '') => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const pick = (arr, n) => arr[((n % arr.length) + arr.length) % arr.length];

const CFG = {
  pl: {
    token: process.env.TG_BOT_PL_TOKEN, chat: '@prepreadyPL', topic: { tips: 4, gear: 6, talk: 7 },
    t: { new: '🆕 <b>Nowy poradnik</b>', tip: '💡 <b>Porada dnia</b>', more: '📖 Więcej', gear: '🧰 <b>Sprzęt na kryzys</b>', tool: '🛠 <b>Narzędzie PrepReady</b>', talk: '💬 <b>Pytanie tygodnia</b>', talkEnd: 'Napiszcie w komentarzu 👇 Wasze doświadczenia pomagają innym.' },
    tools: [
      ['🗺 Mapa schronów', 'Wpisz adres i sprawdź najbliższe schrony i miejsca ukrycia z bazy PSP — z odległością i trasą pieszo. Sprawdź dom, pracę i szkołę dzieci.', 'https://prepready.pro/pl/mapa-schronow/'],
      ['✅ Checklista plecaka 72h', 'Zaznaczaj, co już masz w plecaku ewakuacyjnym. Postęp zapisuje się w przeglądarce, a przy brakach podpowiadamy sprawdzony sprzęt.', 'https://prepready.pro/pl/checklisty/plecak-72h/'],
      ['📊 Indeks gotowości', 'Codzienna ocena, jak bardzo trzeba się dziś przygotować w Polsce — z jawną metodologią i źródłami.', 'https://prepready.pro/pl/indeks/'],
      ['📰 Wiadomości kryzysowe', 'Codzienny przegląd ostrzeżeń i komunikatów z polskich źródeł urzędowych — bez paniki, z kontekstem.', 'https://prepready.pro/pl/wiadomosci/'],
    ],
    talk: [
      'Co macie już w plecaku ewakuacyjnym, a czego wciąż brakuje?',
      'Ile dni dalibyście radę w domu bez prądu i bez zakupów? Co by się skończyło najpierw?',
      'Czy sprawdziliście, gdzie jest najbliższy schron od domu lub pracy? Jak daleko macie?',
      'Jakie jedzenie trzymacie na zapas i jak je rotujecie, żeby się nie zmarnowało?',
      'Macie w rodzinie ustalone miejsce spotkania, gdy nie będzie zasięgu?',
      'Jaki sprzęt z Waszego zapasu przydał się już naprawdę — przy burzy, awarii prądu, powodzi?',
      'Czym oświetlacie dom przy blackoucie? Latarki, lampki solarne, świeczki?',
      'Trzymacie gotówkę na czarną godzinę? Ile i w jakich nominałach?',
      'Jak przygotowujecie na kryzys dzieci albo starszych rodziców?',
      'Jakie aplikacje i źródła informacji macie na telefonie na wypadek zagrożenia?',
      'Co było najtrudniejsze, kiedy zaczynaliście przygotowania? Co poradzilibyście nowym osobom?',
      'Macie w domu radio na baterie lub korbkę? Kiedy ostatnio je sprawdzaliście?',
    ],
  },
  en: {
    token: process.env.TG_BOT_EN_TOKEN, chat: '@prepready_global', topic: { tips: 3, gear: 5, talk: 6 },
    t: { new: '🆕 <b>New guide</b>', tip: '💡 <b>Tip of the day</b>', more: '📖 Read more', gear: '🧰 <b>Emergency gear</b>', tool: '🛠 <b>PrepReady tool</b>', talk: '💬 <b>Question of the week</b>', talkEnd: 'Share in the comments 👇 Your experience helps others.' },
    tools: [
      ['✅ 72-hour go-bag checklist', 'Tick off what is already in your go-bag. Progress is saved in your browser, and we suggest tested gear for the gaps.', 'https://prepready.pro/en/checklists/72-hour-bag/'],
      ['📊 Global Readiness Index', 'A daily read on how much preparation the world situation calls for — with open methodology and sources.', 'https://prepready.pro/en/readiness-index/'],
      ['📰 Crisis news', 'A daily digest of alerts and official updates from international sources — calm, with context.', 'https://prepready.pro/en/news/'],
    ],
    talk: [
      'What is already in your go-bag, and what is still missing?',
      'How many days could you manage at home without power or shopping? What would run out first?',
      'What food do you keep in reserve, and how do you rotate it?',
      'Does your family have a meeting point if phones stop working?',
      'Which item from your preps has actually saved the day — in a storm, an outage, a flood?',
      'How do you light your home in a blackout?',
      'Do you keep emergency cash? How much, and in what notes?',
      'How do you prepare kids or older parents for an emergency?',
      'Which apps and information sources do you rely on during a crisis?',
      'What was hardest when you started preparing? Any advice for newcomers?',
    ],
  },
};

async function send(c, thread, text, preview = true) {
  if (DRY) { console.log(`\n--- ${c.chat} #${thread} ---\n${text}`); return true; }
  const r = await fetch(`https://api.telegram.org/bot${c.token}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: c.chat, message_thread_id: thread, text, parse_mode: 'HTML', link_preview_options: { is_disabled: !preview } }),
  });
  const j = await r.json();
  console.log(j.ok ? `${c.chat} #${thread}: wysłano.` : `${c.chat} #${thread}: błąd ${j.description}`);
  return j.ok;
}

for (const [lang, c] of Object.entries(CFG)) {
  if (!c.token && !DRY) { console.log(`${lang}: brak tokena — pomijam.`); continue; }
  const list = feed[lang] ?? [];
  if (!list.length) continue;

  // Pierwsze uruchomienie: oznacz starsze niż 14 dni jako ogłoszone (bez wysyłki).
  const key = (a) => `${lang}:${a.slug}`;
  const recent = (a) => today - new Date(a.pubDate + 'T00:00:00Z') <= 14 * 864e5;
  if (!Object.keys(state.announced).some((k) => k.startsWith(lang + ':'))) for (const a of list) if (!recent(a)) state.announced[key(a)] = 1;

  // 1. Nowy poradnik (najstarszy nieogłoszony z ostatnich 14 dni)
  const fresh = list.filter((a) => recent(a) && !state.announced[key(a)]).sort((a, b) => a.pubDate.localeCompare(b.pubDate))[0];
  let posted = false;
  if (fresh) {
    const teaser = fresh.faq?.[0] ? `\n\n❓ <i>${esc(fresh.faq[0].q)}</i>\n${esc(fresh.faq[0].a)}` : '';
    posted = await send(c, c.topic.tips, `${c.t.new}\n\n<b>${esc(fresh.title)}</b>\n${esc(fresh.description)}${teaser}\n\n👉 ${fresh.url}`);
    if (posted) state.announced[key(fresh)] = Date.now();
  }

  // 2. Porada dnia z FAQ (gdy nie było nowego poradnika)
  if (!posted) {
    const tips = list.flatMap((a) => (a.faq ?? []).map((f) => ({ ...f, a2: a }))).sort((x, y) => (x.a2.slug + x.q).localeCompare(y.a2.slug + y.q));
    // przeplot: kolejne dni biorą pytania z różnych poradników (krok względnie pierwszy z długością listy)
    if (tips.length) {
      let step = 7; while (gcd(step, tips.length) !== 1) step++;
      const t = tips[(day * step) % tips.length];
      await send(c, c.topic.tips, `${c.t.tip}\n\n<b>${esc(t.q)}</b>\n${esc(t.a)}\n\n${c.t.more}: <a href="${t.a2.url}">${esc(t.a2.title)}</a>`);
    }
  }

  // 3. Środa — sprzęt
  if (dow === 3) {
    const gear = list.filter((a) => a.translationKey?.startsWith('buy-'));
    if (gear.length) { const g = pick(gear, week); await send(c, c.topic.gear, `${c.t.gear}\n\n<b>${esc(g.title)}</b>\n${esc(g.description)}\n\n👉 ${g.url}`); }
  }

  // 4. Piątek — narzędzie
  if (dow === 5) { const [n, d, u] = pick(c.tools, week); await send(c, c.topic.tips, `${c.t.tool}\n\n<b>${n}</b>\n${d}\n\n👉 ${u}`); }

  // 5. Niedziela — pytanie do dyskusji
  if (dow === 0) await send(c, c.topic.talk, `${c.t.talk}\n\n${esc(pick(c.talk, week))}\n\n${c.t.talkEnd}`, false);
}

function gcd(a, b) { return b ? gcd(b, a % b) : a; }
if (!DRY || process.env.TG_DRY_SAVE) await writeFile(STATE, JSON.stringify(state));
