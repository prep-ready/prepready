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
};

export const deals: Deal[] = [];

export const activeDeals = (lang: 'pl' | 'en') =>
  deals.filter((d) => d.lang.includes(lang) && new Date(d.until + 'T23:59:59') >= new Date());
