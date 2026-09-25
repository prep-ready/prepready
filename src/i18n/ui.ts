export type Lang = 'pl' | 'en';
export const langs: Lang[] = ['pl', 'en'];

/** Adresy sekcji w każdym języku. Zmieniasz tu — zmienia się w całym serwisie. */
export const routes = {
  home:     { pl: '/pl/',                    en: '/en/' },
  index:    { pl: '/pl/indeks/',             en: '/en/readiness-index/' },
  news:     { pl: '/pl/wiadomosci/',         en: '/en/news/' },
  guides:   { pl: '/pl/poradniki/',          en: '/en/guides/' },
  checklist:{ pl: '/pl/checklisty/plecak-72h/', en: '/en/checklists/72-hour-bag/' },
  gear:     { pl: '/pl/sprzet/',             en: '/en/gear/' },
  about:    { pl: '/pl/o-nas/',              en: '/en/about/' },
  earn:     { pl: '/pl/jak-zarabiamy/',      en: '/en/how-we-earn/' },
  partners: { pl: '/pl/wspolpraca/',         en: '/en/partners/' },
} as const;
export type RouteKey = keyof typeof routes;

export const guideBase = { pl: '/pl/poradniki/', en: '/en/guides/' } as const;

export const clusters = {
  bag:          { pl: 'Plecak ewakuacyjny', en: 'Go-bags' },
  'water-food': { pl: 'Woda i żywność',     en: 'Water & food' },
  shelter:      { pl: 'Schron i ochrona',   en: 'Shelter' },
  blackout:     { pl: 'Blackout',           en: 'Blackouts' },
  evacuation:   { pl: 'Ewakuacja i łączność', en: 'Evacuation & comms' },
  'first-aid':  { pl: 'Pierwsza pomoc',     en: 'First aid' },
} as const;

export const ui = {
  pl: {
    'site.tagline': 'Spokojne, oparte na danych przygotowanie na kryzys.',
    'nav.index': 'Indeks', 'nav.news': 'Wiadomości', 'nav.guides': 'Poradniki', 'nav.checklist': 'Checklisty', 'nav.gear': 'Sprzęt',
    'nav.menu': 'Menu',
    'cta.start': 'Zacznij od plecaka 72h',
    'sample': 'Dane przykładowe',
    'strip.updated': 'Indeks zaktualizowano',
    'strip.alerts': 'Sprawdź ostrzeżenia w aplikacji RSO',
    'idx.eyebrow': 'Indeks gotowości · Polska',
    'idx.title': 'Jak bardzo trzeba się przygotować?',
    'idx.todo': 'Co zrobić przy tym poziomie',
    'idx.delta7': 'w 7 dni', 'idx.ago30': '30 dni temu',
    'idx.compEyebrow': '6 składowych · wagi i źródła jawne',
    'idx.compTitle': 'Z czego składa się dzisiejszy wynik',
    'idx.method': 'Metodologia →',
    'idx.weight': 'waga',
    'clock.text': '<strong>{s} sekund do północy.</strong> Zegar Zagłady Bulletin of the Atomic Scientists, ustawiony {d} — najbliżej w historii. Pokazujemy go jako kontekst; nie wchodzi do indeksu.',
    'news.eyebrow': 'Feed · Polska · źródła urzędowe i media, codziennie',
    'news.title': 'Co się dzieje i co to znaczy dla Ciebie',
    'news.forYou': 'Dla Ciebie',
    'news.all': 'Wszystko', 'news.weather': 'Pogoda i żywioły', 'news.energy': 'Energia', 'news.security': 'Bezpieczeństwo', 'news.health': 'Zdrowie',
    'news.more': 'Wszystkie wiadomości →',
    'sev.1': 'info', 'sev.2': 'uwaga', 'sev.3': 'ważne', 'sev.4': 'pilne',
    'nl.eyebrow': 'Newsletter · co piątek', 'nl.title': 'Raport gotowości w 3 minuty',
    'nl.body': 'Zmiana indeksu, 3 najważniejsze wydarzenia tygodnia i jedno zadanie do zrobienia w domu. Alert tylko przy skoku o 10+ pkt.',
    'nl.btn': 'Zapisz mnie', 'nl.small': 'Bez spamu. Wypiszesz się jednym kliknięciem.', 'nl.placeholder': 'twoj@email.pl',
    'nl.pending': 'Zapis ruszy po podłączeniu narzędzia do newslettera.',
    'src.title': 'Monitorowane źródła',
    'start.eyebrow': 'Zacznij tutaj · po kolei', 'start.title': 'Trzy kroki na pierwszy weekend',
    'cl.eyebrow': 'Checklista interaktywna · zapis w przeglądarce', 'cl.title': 'Plecak ewakuacyjny na 72 godziny',
    'cl.sub': 'Lista oparta na „Poradniku bezpieczeństwa” MSWiA. Zaznacz, co już masz — przy brakach podpowiadamy sprawdzony sprzęt.',
    'cl.reset': 'Wyczyść', 'cl.pick': 'Polecamy →', 'cl.picksTitle': 'Najczęstsze braki · nasze typy', 'cl.view': 'Sprawdź',
    'aff.disclose': 'Polecamy tylko sprzęt, który sprawdziliśmy. Dzięki współpracy z producentami często mamy dla Was kody rabatowe.',
    'aff.how': 'Jak działamy',
    'g.eyebrow': 'Poradniki · 6 tematów', 'g.title': 'Wiedza, która działa bez prądu i internetu', 'g.all': 'Wszystkie poradniki →',
    'g.min': 'min', 'g.reviewed': 'przegląd', 'g.soon': 'w przygotowaniu',
    'gear.eyebrow': 'Test redakcji', 'gear.title': 'Stacje zasilania na blackout',
    'gear.sub': 'W rankingach są tylko sprawdzone rzeczy. Mierzymy realną pojemność, czas ładowania i ile razy naładują telefon.',
    'gear.model': 'Model', 'gear.cap': 'Pojemność zmierzona (Wh)', 'gear.charge': 'Ładowanie 0–100% (h)', 'gear.phone': 'Ładowań telefonu', 'gear.score': 'Ocena', 'gear.price': 'Cena (zł)',
    'art.by': 'Autor', 'art.reviewedBy': 'Konsultacja', 'art.reviewed': 'Ostatni przegląd', 'art.sources': 'Źródła', 'art.faq': 'Najczęstsze pytania', 'art.toc': 'W tym poradniku',
    'art.disclaimer': 'Poradnik ma charakter edukacyjny. W sytuacji zagrożenia stosuj się do komunikatów RCB, RSO i służb.',
    'f.c1': 'Serwis', 'f.c2': 'Zaufanie', 'f.c3': 'Ważne numery',
    'f.about': 'Spokojne, oparte na danych przygotowanie na kryzys. Indeks jest narzędziem edukacyjnym — w sytuacji zagrożenia obowiązują komunikaty RCB, RSO i służb.',
    'f.team': 'O nas i redakcja', 'f.earn': 'Jak działamy', 'f.partners': 'Dla producentów', 'f.method': 'Metodologia indeksu',
    'theme': 'Motyw', 'lang.switch': 'English',
  },
  en: {
    'site.tagline': 'Calm, data-driven crisis preparedness.',
    'nav.index': 'Index', 'nav.news': 'News', 'nav.guides': 'Guides', 'nav.checklist': 'Checklists', 'nav.gear': 'Gear',
    'nav.menu': 'Menu',
    'cta.start': 'Start with a 72-hour kit',
    'sample': 'Sample data',
    'strip.updated': 'Index updated',
    'strip.alerts': 'Official local alerts always take priority',
    'idx.eyebrow': 'Readiness Index · Global',
    'idx.title': 'How prepared should you be right now?',
    'idx.todo': 'What to do at this level',
    'idx.delta7': 'in 7 days', 'idx.ago30': '30 days ago',
    'idx.compEyebrow': '6 components · open weights and sources',
    'idx.compTitle': "What today's score is made of",
    'idx.method': 'Methodology →',
    'idx.weight': 'weight',
    'clock.text': "<strong>{s} seconds to midnight.</strong> The Bulletin of the Atomic Scientists' Doomsday Clock, set on {d} — the closest ever. Shown as context; not part of the index.",
    'news.eyebrow': 'Feed · worldwide · official sources and media, daily',
    'news.title': "What's happening and what it means for you",
    'news.forYou': 'For you',
    'news.all': 'All', 'news.weather': 'Disasters', 'news.energy': 'Energy', 'news.security': 'Security', 'news.health': 'Health',
    'news.more': 'All news →',
    'sev.1': 'info', 'sev.2': 'watch', 'sev.3': 'important', 'sev.4': 'urgent',
    'nl.eyebrow': 'Newsletter · every Friday', 'nl.title': 'The Readiness Report in 3 minutes',
    'nl.body': "The index change, the week's 3 key events and one task to do at home. Alerts only on a 10+ point jump.",
    'nl.btn': 'Sign me up', 'nl.small': 'No spam. Unsubscribe in one click.', 'nl.placeholder': 'you@email.com',
    'nl.pending': 'Sign-up goes live once the newsletter tool is connected.',
    'src.title': 'Sources we monitor',
    'start.eyebrow': 'Start here · in order', 'start.title': 'Three steps for your first weekend',
    'cl.eyebrow': 'Interactive checklist · saved in your browser', 'cl.title': '72-hour go-bag',
    'cl.sub': 'Based on Ready.gov and EU civil-protection guidance. Tick what you have — we suggest tested gear for the gaps.',
    'cl.reset': 'Clear', 'cl.pick': 'Our pick →', 'cl.picksTitle': 'Most common gaps · our picks', 'cl.view': 'View',
    'aff.disclose': 'We only recommend gear we have checked. Thanks to partnerships with manufacturers we often have discount codes for you.',
    'aff.how': 'How we work',
    'g.eyebrow': 'Guides · 6 topics', 'g.title': 'Knowledge that works without power or internet', 'g.all': 'All guides →',
    'g.min': 'min', 'g.reviewed': 'reviewed', 'g.soon': 'coming soon',
    'gear.eyebrow': 'Editors’ test', 'gear.title': 'Portable power stations for blackouts',
    'gear.sub': 'Only checked gear makes our rankings. We measure real capacity, charge time and how many phone charges you get.',
    'gear.model': 'Model', 'gear.cap': 'Measured capacity (Wh)', 'gear.charge': 'Charge 0–100% (h)', 'gear.phone': 'Phone charges', 'gear.score': 'Score', 'gear.price': 'Price (EUR)',
    'art.by': 'By', 'art.reviewedBy': 'Reviewed by', 'art.reviewed': 'Last reviewed', 'art.sources': 'Sources', 'art.faq': 'FAQ', 'art.toc': 'In this guide',
    'art.disclaimer': 'This guide is educational. In an emergency, follow official alerts and first responders.',
    'f.c1': 'Site', 'f.c2': 'Trust', 'f.c3': 'Key numbers',
    'f.about': 'Calm, data-driven crisis preparedness. The index is an educational tool — in an emergency, follow official alerts and first responders.',
    'f.team': 'About & editors', 'f.earn': 'How we work', 'f.partners': 'For manufacturers', 'f.method': 'Index methodology',
    'theme': 'Theme', 'lang.switch': 'Polski',
  },
} as const;

export type UIKey = keyof typeof ui.pl;
export function t(lang: Lang, key: UIKey, vars: Record<string, string | number> = {}) {
  let s: string = ui[lang][key] ?? ui.pl[key];
  for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}

export function fmtDate(d: Date | string, lang: Lang, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }) {
  return new Date(d).toLocaleDateString(lang === 'pl' ? 'pl-PL' : 'en-GB', opts);
}
export const num = (n: number, lang: Lang, o?: Intl.NumberFormatOptions) =>
  n.toLocaleString(lang === 'pl' ? 'pl-PL' : 'en-US', o);
