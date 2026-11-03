/**
 * Kody rabatowe od partnerów (umowy bezpośrednie z producentami).
 * Dodaj obiekt, a kod pojawi się na stronie sprzętu i głównej. Po dacie `until` znika sam.
 * Przykład:
 * { brand: 'Firma X', product: 'Filtry do wody', code: 'PREPREADY10', discount: { pl: '−10%', en: '−10%' },
 *   url: 'https://sklep.firmax.pl/', until: '2026-12-31', lang: ['pl'] },
 */
export type Deal = {
  brand: string;
  product: string;
  code: string;
  discount: { pl: string; en: string };
  url: string;
  until: string;
  lang: ('pl' | 'en')[];
  /** Ogłoszenie w grupach Telegram (scripts/tg-content.mjs, temat Sprzęt/Gear). Wysyła się raz na język. */
  tg?: { pl?: string; en?: string };
};

export const deals: Deal[] = [
  { brand: 'Vayox', product: 'Latarki czołowe, m.in. VA0361 TwinBeam do plecaka 72h', code: 'PREP5', discount: { pl: '−5%', en: '−5%' },
    url: 'https://vayox.pl/produkt/va0361/', until: '2026-12-31', lang: ['pl'],
    tg: {
      pl: '🔦 <b>Kod rabatowy: Vayox −5%</b>\n\nCzołówkę Vayox VA0361 TwinBeam pakujemy do naszego plecaka 72h: 600 lm, światło skupione, rozproszone i czerwone, ładowanie USB-C, a w awaryjnej sytuacji działa też na baterie AAA.\n\nKod <code>PREP5</code> daje 5% zniżki w sklepie vayox.pl.\n\n👉 https://vayox.pl/produkt/va0361/\n✅ Checklista plecaka 72h: https://prepready.pro/pl/checklisty/plecak-72h/',
      en: '🔦 <b>Discount code: Vayox −5%</b>\n\nThe Vayox VA0361 TwinBeam headlamp goes into our own 72-hour go-bag: 600 lm, spot, flood and red light, USB-C charging, and it also runs on AAA batteries when the power bank is empty.\n\nCode <code>PREP5</code> gives 5% off at vayox.pl (Polish shop).\n\n👉 https://vayox.pl/produkt/va0361/\n✅ 72-hour go-bag checklist: https://prepready.pro/en/checklists/72-hour-bag/',
    } },
];

export const activeDeals = (lang: 'pl' | 'en') =>
  deals.filter((d) => d.lang.includes(lang) && new Date(d.until + 'T23:59:59') >= new Date());
