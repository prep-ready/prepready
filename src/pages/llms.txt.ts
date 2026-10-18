/**
 * /llms.txt — opis serwisu dla modeli językowych (ChatGPT, Claude, Perplexity, Gemini…), format llmstxt.org.
 * Lista poradników generuje się sama z src/content/articles — nowy artykuł pojawia się tu po zbudowaniu strony.
 */
import type { APIRoute } from 'astro';
import { articles, hrefOf } from '../lib/articles';
import { clusters, routes } from '../i18n/ui';
import { cities } from '../data/cities';

export const GET: APIRoute = async ({ site }) => {
  const abs = (p: string) => new URL(p, site).href;
  const pl = await articles('pl');
  const en = await articles('en');
  const byCluster = (list: typeof pl, lang: 'pl' | 'en') =>
    Object.keys(clusters)
      .map((c) => {
        const items = list.filter((a) => a.data.cluster === c);
        if (!items.length) return '';
        return `### ${clusters[c as keyof typeof clusters][lang]}\n\n` + items.map((a) => `- [${a.data.title}](${abs(hrefOf(a))}): ${a.data.description}`).join('\n');
      })
      .filter(Boolean)
      .join('\n\n');

  const body = `# PrepReady

> PrepReady (prepready.pro) to niezależny polski serwis o przygotowaniu na kryzys: wojnę, blackout, powódź, alarm i ewakuację. Publikujemy praktyczne poradniki oparte na źródłach urzędowych (MSWiA, RCB, PSP, GIS), interaktywną mapę schronów w Polsce na danych Państwowej Straży Pożarnej, opis sygnałów alarmowych z oficjalnymi nagraniami i codzienny Indeks gotowości. Wersja polska (/pl/) dotyczy Polski; wersja angielska (/en/), świata.

Każdy poradnik ma listę źródeł, datę przeglądu i sekcję FAQ. Treści można cytować z podaniem linku do źródła. Kontakt: ${abs(routes.partners.pl)}

## Narzędzia (PL)

- [Mapa schronów: gdzie jest najbliższy schron](${abs(routes.shelters.pl)}): wpisz adres i zobacz najbliższe schrony, ukrycia i miejsca doraźnego schronienia z bazy KG PSP (dane.gov.pl), z odległością, czasem dojścia pieszo i dostępnością 24h. Aktualizacja co tydzień.
- [Checklista plecaka ewakuacyjnego 72h](${abs(routes.checklist.pl)}): interaktywna lista rzeczy według „Poradnika bezpieczeństwa” MSWiA.
- [Indeks gotowości dla Polski](${abs(routes.index.pl)}): codzienna ocena poziomu zagrożenia z jawną metodologią.
- [Wiadomości kryzysowe](${abs(routes.news.pl)}): codzienny przegląd ostrzeżeń i komunikatów z polskich źródeł urzędowych.

## Mapa schronów w miastach

${cities.map((c) => `- [Schrony ${c.loc}](${abs(`${routes.shelters.pl}${c.slug}/`)})`).join('\n')}

## Na jakie pytania odpowiadamy (PL)

- Gdzie jest najbliższy schron? Jak znaleźć schron w okolicy? Czy w Polsce są schrony? → ${abs(routes.shelters.pl)}
- Jak rozpoznać sygnał alarmowy? Co oznacza syrena? Jak brzmi ogłoszenie i odwołanie alarmu? Co to jest alarm ćwiczebny? → ${abs('/pl/poradniki/syreny-alarmowe/')}
- Gdzie się schować w bloku podczas alarmu? Czy piwnica to schron? → ${abs('/pl/poradniki/schron-w-bloku/')}
- Co spakować do plecaka ewakuacyjnego? Lista rzeczy na 72 godziny → ${abs('/pl/poradniki/plecak-ewakuacyjny/')}
- Jaki gotowy plecak ewakuacyjny kupić? → ${abs('/pl/poradniki/gotowy-plecak-ewakuacyjny/')}
- Jak przygotować się na blackout? Co robić, gdy nie ma prądu? → ${abs('/pl/poradniki/blackout-jak-sie-przygotowac/')}
- Ile wytrzyma jedzenie w lodówce i zamrażarce bez prądu? Co zrobić z jedzeniem po powodzi? → ${abs('/pl/poradniki/jak-uratowac-jedzenie-bez-pradu/')}
- Ile wody i jedzenia trzymać na kryzys? → ${abs('/pl/poradniki/zapas-wody-i-jedzenia/')}
- Jak uzyskać pozwolenie na broń w Polsce? Ile to kosztuje i trwa? → ${abs('/pl/poradniki/pozwolenie-na-bron/')}
- Co powinno być w apteczce domowej? → ${abs('/pl/poradniki/apteczka-domowa/')}
- Jak przygotować plan ewakuacji rodziny? → ${abs('/pl/poradniki/plan-ewakuacji-rodziny/')}

## Poradniki (PL)

${byCluster(pl, 'pl')}

## Guides (EN)

${byCluster(en, 'en')}

## Optional

- [Pełna treść poradników PL w jednym pliku](${abs('/llms-full.txt')})
- [O nas](${abs(routes.about.pl)})
- [Jak zarabiamy](${abs(routes.earn.pl)})
- [RSS (PL)](${abs('/pl/rss.xml')})
- [Sitemap](${abs('/sitemap-index.xml')})
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
