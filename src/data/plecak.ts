/**
 * Plecak ewakuacyjny PrepReady: wersje, saszetki, zawartość, przykładowe produkty i warianty plecaka.
 * Strona: /pl/plecak-ewakuacyjny/ (src/views/BagView.astro), model 3D: src/lib/bag3d.ts.
 *
 * Jak edytować:
 * - nowa rzecz: dopisz obiekt do `bagItems`. `id` jest STAŁE (linki w mailach do producentów: #rzecz-<id>),
 *   bez spacji i polskich znaków; nie zmieniaj id istniejących rzeczy,
 * - `level`: od której wersji rzecz jest w standardzie ('basic' = Podstawowy, 'extended' = Rozszerzony, 'pro' = Pro;
 *   każda wyższa wersja zawiera wszystko z niższych),
 * - `cat`: id saszetki z `bagCategories` (kolor saszetki = kategoria; 'plecak' to sam plecak),
 * - `outside: true`: rzecz jest przypięta NA ZEWNĄTRZ plecaka (czołówka na szelce, śpiwór i plandeka pod spodem),
 * - `produkt`: przykładowy produkt z ceną. `cena: null` = „cena wkrótce”. `partner: true` = producent jest naszym partnerem
 *   (wtedy znika dopisek „Miejsce dla producenta”),
 * - `partner` (stare pole, marka): ten egzemplarz jest już w naszym plecaku testowym (pasek „Co już mamy”),
 * - `replaces`: id rzeczy, którą ta zastępuje (lepsza wersja tej samej rzeczy, np. duży powerbank zamiast małego).
 *   Gdy obie są w zestawie, liczy się tylko ta lepsza; zaznaczenie jednej odznacza drugą.
 */

export type BagLevel = 'basic' | 'extended' | 'pro';
export type BagVersionId = BagLevel | 'custom';

export interface BagPouch {
  /** Kolor saszetki w nazwie: „Niebieska” */
  colorName: string;
  /** Kolor na modelu 3D i kropka na liście */
  hex: string;
  /** Biały krzyż (apteczka, znak ISO 7010 E003) */
  cross?: boolean;
}

export interface BagCategory {
  id: string;
  /** Co jest w saszetce: „Woda” */
  name: string;
  /** Podpis na modelu 3D */
  short: string;
  /** Saszetka; brak = sam plecak */
  pouch?: BagPouch;
  /** Krótka uwaga pod nagłówkiem (np. znaczenie koloru apteczki) */
  note?: string;
  /** Punkt podpisu na ZAMKNIĘTYM plecaku (jednostki sceny: korpus ok. 0,88 × 1,3 × 0,4, środek 0,0,0, przód +z, 1 jednostka ≈ 38 cm) */
  anchor: [number, number, number];
  /** Kierunek „na zewnątrz” w tym punkcie: podpis chowa się, gdy ta strona plecaka jest odwrócona od widza */
  normal: [number, number, number];
}

export interface BagProduct {
  nazwa: string;
  marka: string;
  /** Cena w PLN; null = jeszcze nie sprawdzona („cena wkrótce”) */
  cena: number | null;
  url?: string;
  sklep?: string;
  /** Data sprawdzenia ceny, RRRR-MM-DD */
  sprawdzono?: string;
  /** Producent jest naszym partnerem */
  partner?: boolean;
  /** Linki do pozostałych części zestawu (np. krzesiwo + zapalniczka) */
  dodatkowe?: string[];
  /** Krótka uwaga przy cenie: „promocja”, „ostatnie sztuki”, „linka dokupiona osobno” */
  uwaga?: string;
}

export interface BagItem {
  id: string;
  name: string;
  /** Jedno zdanie: po co to jest */
  why: string;
  cat: string;
  level: BagLevel;
  /** Przypięte na zewnątrz plecaka (nie w saszetce): gdzie, małą literą */
  outside?: string;
  /** Marka egzemplarza, który już jest w naszym plecaku testowym */
  partner?: string;
  /** Model tego egzemplarza (pasek „Co już mamy w plecaku testowym”) */
  model?: string;
  /** Przykładowy produkt z ceną */
  produkt?: BagProduct;
  /** Zastępuje tę rzecz (id): w zestawie jest tylko jedna z nich */
  replaces?: string;
}

export const bagVersions: { id: BagVersionId; slug: string; name: string; gen: string; desc: string }[] = [
  { id: 'basic', slug: 'podstawowy', name: 'Podstawowy', gen: 'Podstawowego', desc: 'Na 72 godziny dla jednej osoby. Lekki, do szybkiego wyjścia z domu.' },
  { id: 'extended', slug: 'rozszerzony', name: 'Rozszerzony', gen: 'Rozszerzonego', desc: 'Do tego filtr, ciepły posiłek i nocleg poza domem.' },
  { id: 'pro', slug: 'pro', name: 'Pro', gen: 'Pro', desc: 'Na dłuższą ewakuację: łączność bez sieci, własny prąd i apteczka na poważne urazy.' },
  { id: 'custom', slug: 'wlasny', name: 'Własny', gen: 'Własnego', desc: 'Zacznij od dowolnej wersji, a potem usuwaj i dodawaj rzeczy na liście.' },
];

export const levelOrder: BagLevel[] = ['basic', 'extended', 'pro'];
/** „W standardzie w wersji Rozszerzonej” */
export const levelLoc: Record<BagLevel, string> = { basic: 'Podstawowej', extended: 'Rozszerzonej', pro: 'Pro' };

export const bagCategories: BagCategory[] = [
  { id: 'plecak', name: 'Plecak', short: 'Plecak', anchor: [0.49, 0.14, -0.02], normal: [1, 0, 0] },
  { id: 'woda', name: 'Woda', short: 'Woda', pouch: { colorName: 'Niebieska', hex: '#2E6DB4' },
    anchor: [-0.49, -0.3, 0.0], normal: [-1, 0, 0] },
  { id: 'jedzenie', name: 'Jedzenie', short: 'Jedzenie', pouch: { colorName: 'Pomarańczowa', hex: '#E0761C' },
    anchor: [-0.05, 0.385, 0.226], normal: [0, 0.15, 1] },
  { id: 'ogien', name: 'Ogień i narzędzia', short: 'Ogień', pouch: { colorName: 'Czerwona', hex: '#C2352E' },
    anchor: [0.565, -0.52, -0.02], normal: [1, 0, 0.15] },
  { id: 'apteczka', name: 'Apteczka', short: 'Apteczka', pouch: { colorName: 'Zielona', hex: '#1F7F4E', cross: true },
    note: 'Zielona saszetka z białym krzyżem to oficjalny znak pierwszej pomocy (ISO 7010, E003). Każdy rozpozna ją w plecaku od razu, także ratownik.',
    anchor: [0.06, 0.0, 0.352], normal: [0, 0, 1] },
  { id: 'swiatlo', name: 'Światło i zasilanie', short: 'Światło', pouch: { colorName: 'Żółta', hex: '#E5BE2B' },
    anchor: [0.1, 0.652, 0.08], normal: [0, 1, 0.3] },
  { id: 'lacznosc', name: 'Łączność i dokumenty', short: 'Łączność', pouch: { colorName: 'Czarna', hex: '#232527' },
    anchor: [-0.17, 0.22, -0.445], normal: [-0.25, 0.05, -1] },
  { id: 'higiena', name: 'Higiena', short: 'Higiena', pouch: { colorName: 'Biała', hex: '#EAE8E2' },
    anchor: [0.0, -0.12, -0.262], normal: [0, 0, -1] },
  { id: 'ochrona', name: 'Ochrona i nocleg', short: 'Ochrona', pouch: { colorName: 'Oliwkowa', hex: '#5E6A3C' },
    anchor: [0.3, -0.55, 0.31], normal: [0.35, -0.2, 1] },
];

/** Nazwa saszetki: „Niebieska saszetka” */
export const pouchName = (c: BagCategory) => (c.pouch ? `${c.pouch.colorName} saszetka` : 'Plecak');

export const bagItems: BagItem[] = [
  // ── Plecak ────────────────────────────────────────────────
  { id: 'plecak', cat: 'plecak', level: 'basic', partner: 'Wisport', model: 'Whistler II 35, graphite', name: 'Plecak',
    why: 'Wytrzymały, z pasem biodrowym: cały zestaw niesiesz na plecach, a ręce masz wolne.',
    produkt: { nazwa: 'Wisport Whistler II 35, Grafitowy', marka: 'Wisport', cena: 799, sklep: 'wisport.com.pl', url: 'https://www.wisport.com.pl/sklep/whistler-ii/?attribute_pa_kolor=grafitowy', sprawdzono: '2026-11-07', partner: true } },

  // ── Niebieska: Woda ───────────────────────────────────────
  { id: 'woda', cat: 'woda', level: 'basic', name: 'Woda 2 × 0,75 l w butelkach + tabletki do uzdatniania',
    why: 'Woda na pierwsze godziny, a tabletki zrobią pitną wodę z kranu, studni lub rzeki.',
    produkt: { nazwa: 'Bidon ATTABO 750 ml, 2 szt. + tabletki Javel Aqua, 10 szt.', marka: 'ATTABO', cena: 34.98, url: 'https://sportano.pl/p/923250/bidon-attabo-sportano-750-ml-czarny', sklep: 'Sportano', sprawdzono: '2026-11-07', dodatkowe: ['https://www.specshop.pl/product-pol-49108-Tabletki-do-uzdatniania-wody-Javel-Aqua-Chlorowe-10-sztuk-BU-JATB10.html'] } },
  { id: 'filtr', cat: 'woda', level: 'extended', name: 'Filtr do wody',
    why: 'Oczyszcza wodę z rzeki lub jeziora od razu, bez czekania, aż zadziałają tabletki.',
    produkt: { nazwa: 'Filtr do wody LifeStraw Peak Series Personal (słomka), niebieski', marka: 'LifeStraw', cena: 129, url: 'https://www.specshop.pl/Filtr-do-wody-Peak-Series-Personal-LifeStraw-Niebieski', sklep: 'SpecShop.pl', sprawdzono: '2026-11-07' } },
  { id: 'elektrolity', cat: 'woda', level: 'extended', name: 'Elektrolity',
    why: 'Uzupełniają sole przy upale, dużym wysiłku i biegunce.',
    produkt: { nazwa: 'Plusssz tabletki musujące Elektrolity, 24 szt.', marka: 'Plusssz', cena: 13.99, url: 'https://www.rossmann.pl/Produkt/Elektrolity/Plusssz-tabletki-musujace-Elektrolity-suplement-diety-24-szt,264656,19073', sklep: 'Rossmann', sprawdzono: '2026-11-07' } },
  { id: 'filtr-pro', cat: 'woda', level: 'pro', replaces: 'filtr', name: 'Filtr wysokowydajny',
    why: 'Zamiast słomki: szybciej filtruje więcej wody, gdy korzysta z niego cała rodzina.',
    produkt: { nazwa: 'Butelka z filtrem Katadyn BeFree Filter AC 1 l, slate blue', marka: 'Katadyn', cena: 224.99, url: 'https://sportano.pl/p/614166/butelka-turystyczna-z-filtrem-katadyn-befree-filter-ac-1-l-slate-blue', sklep: 'Sportano', sprawdzono: '2026-11-07', uwaga: 'promocja' } },

  // ── Pomarańczowa: Jedzenie ────────────────────────────────
  { id: 'jedzenie-3', cat: 'jedzenie', level: 'basic', partner: 'Lyofood', name: 'Jedzenie liofilizowane na 3 dni',
    why: 'Lekkie i trwałe przez lata. Wystarczy zalać wodą, w razie potrzeby nawet zimną.',
    produkt: { nazwa: 'Zestaw ratunkowy 72h - serowy (6 dań głównych, 3 przekąski, 3 desery)', marka: 'LYOFOOD', cena: 370, url: 'https://lyofood.pl/products/zestaw-ratunkowy-serowy', sklep: 'lyofood.pl', sprawdzono: '2026-11-07', partner: true } },
  { id: 'lyzka', cat: 'jedzenie', level: 'basic', name: 'Łyżka z długim trzonkiem',
    why: 'Liofilizaty je się prosto z torebki, a długa łyżka sięga do dna bez brudzenia rąk.' },
  { id: 'glukoza', cat: 'jedzenie', level: 'extended', name: 'Tabletki z glukozą',
    why: 'Szybka energia przy osłabieniu i spadku cukru. Nie topią się, nie kruszą i leżą latami.' },
  { id: 'jedzenie-5', cat: 'jedzenie', level: 'pro', name: 'Zapas jedzenia na 5 dni',
    why: 'Dodatkowe posiłki na wypadek, gdy powrót do domu potrwa dłużej niż 72 godziny.',
    produkt: { nazwa: 'Zestaw ratunkowy 72h - wegetariański', marka: 'LYOFOOD', cena: 400, url: 'https://lyofood.pl/products/zestaw-ratunkowy-wegetarianski', sklep: 'lyofood.pl', sprawdzono: '2026-11-07' } },

  // ── Czerwona: Ogień i narzędzia ───────────────────────────
  { id: 'ogien', cat: 'ogien', level: 'basic', name: 'Zapalniczka i krzesiwo',
    why: 'Zapalniczka na co dzień, krzesiwo, gdy zamoknie albo skończy się gaz.',
    produkt: { nazwa: 'Krzesiwo magnezowe Fosco Magnesium Fire Starter + zapalniczka Clipper', marka: 'Fosco / Clipper', cena: 43.99, url: 'https://www.specshop.pl/Krzesiwo-Magnesium-Fire-Starter-Fosco-429746', sklep: 'SpecShop.pl + Rossmann', sprawdzono: '2026-11-07', dodatkowe: ['https://www.rossmann.pl/Produkt/Swiece/Clipper-zapalniczka-kieszonkowa-rozne-rodzaje-1-szt,328796,19444'] } },
  { id: 'multitool', cat: 'ogien', level: 'basic', name: 'Multitool',
    why: 'Nóż, kombinerki i śrubokręt w jednym, do drobnych napraw i otwierania puszek.',
    produkt: { nazwa: 'Narzędzie wielofunkcyjne Mil-Tec Black, duże, z etui (15406102)', marka: 'Mil-Tec', cena: 99, url: 'https://www.specshop.pl/product-pol-29413-Mil-Tec-Narzedzie-multitool-Black-duze-z-etui-15406102.html', sklep: 'SpecShop.pl', sprawdzono: '2026-11-07' } },
  { id: 'kuchenka', cat: 'ogien', level: 'extended', name: 'Kuchenka z kartuszem i kubkiem',
    why: 'Wrzątek do liofilizatów i ciepły posiłek w kilka minut.',
    produkt: { nazwa: 'Kuchenka turystyczna Fire-Maple FMS-X2 z garnkiem 1 l (black) + kartusz Coleman Performance Gas 300', marka: 'Fire-Maple / Coleman', cena: 293.98, url: 'https://sportano.pl/p/390316/kuchenka-turystyczna-fire-maple-fms-x2-garnek-black', sklep: 'Sportano', sprawdzono: '2026-11-07', dodatkowe: ['https://sportano.pl/p/244483/kartusz-gazowy-coleman-performance-gas-300'], uwaga: 'promocja' } },
  { id: 'tasma', cat: 'ogien', level: 'extended', name: 'Taśma naprawcza',
    why: 'Załata plandekę, but, plecak albo pęknięty pojemnik na wodę.',
    produkt: { nazwa: 'Taśma naprawcza Drel typu duct, srebrna 48 mm × 10 m', marka: 'Drel', cena: 7.1, url: 'https://www.castorama.pl/departments/ta-ma-naprawcza-drel-typu-duct-srebrna-48-mm-x-10-m-wodoodporna-mocna-uniwersalna-1-szt-/5902143167952_CAPL.prd', sklep: 'Castorama', sprawdzono: '2026-11-07' } },
  { id: 'noz', cat: 'ogien', level: 'pro', name: 'Nóż z głownią stałą',
    why: 'Mocniejszy niż multitool: drewno na opał, liny i budowa schronienia.',
    produkt: { nazwa: 'Nóż Morakniv Companion HeavyDuty MG, stal węglowa (12494)', marka: 'Morakniv', cena: 109, url: 'https://www.specshop.pl/product-pol-14770-Morakniv-Noz-Companion-HeavyDuty-MG-Stal-weglowa-12494.html', sklep: 'SpecShop.pl', sprawdzono: '2026-11-07' } },

  // ── Zielona z białym krzyżem: Apteczka ────────────────────
  { id: 'apteczka', cat: 'apteczka', level: 'basic', name: 'Apteczka podstawowa',
    why: 'Opatrunki, plastry, rękawiczki i środek do dezynfekcji na drobne urazy.',
    produkt: { nazwa: 'Apteczka wodoodporna Medaid Typ 200, 16 elementów, czarna', marka: 'Medaid', cena: 129, url: 'https://www.specshop.pl/product-pol-32505-Medaid-Apteczka-wodoodporna-Typ-200-16-elementow-Czarna.html', sklep: 'SpecShop.pl', sprawdzono: '2026-11-07' } },
  { id: 'leki-otc', cat: 'apteczka', level: 'basic', name: 'Leki bez recepty',
    why: 'Przeciwbólowe i przeciwgorączkowe, na biegunkę i na alergię, po jednym listku. Ból albo gorączka w drodze potrafią zatrzymać całą rodzinę.' },
  { id: 'multiwitamina', cat: 'apteczka', level: 'extended', name: 'Multiwitamina w tabletkach',
    why: 'Przez kilka dni na liofilizatach łatwo o braki w diecie. Tabletki zajmują mało miejsca i długo się przechowują, lepiej niż kapsułki z olejem.' },
  { id: 'wegiel', cat: 'apteczka', level: 'extended', name: 'Węgiel aktywny',
    why: 'Przy niestrawności i biegunce po jedzeniu lub wodzie niewiadomego pochodzenia.' },
  { id: 'apteczka-pro', cat: 'apteczka', level: 'pro', replaces: 'apteczka', name: 'Apteczka rozszerzona ze stazą taktyczną',
    why: 'Zamiast podstawowej: opatrunki na poważne rany i staza na silne krwawienia, gdy pomoc dociera później.',
    produkt: { nazwa: 'Apteczka taktyczna IFAK - Indywidualny Pakiet Medyczny IPMED (czarny), z opaską zaciskową CAT', marka: 'AEDMAX', cena: 584, url: 'https://aedmax24.pl/pl/p/Apteczka-Taktyczna-IFAK-Indywidualny-Pakiet-Medyczny-IPMED-czarny/1125', sklep: 'aedmax24.pl', sprawdzono: '2026-11-07' } },

  // ── Żółta: Światło i zasilanie ────────────────────────────
  { id: 'czolowka', cat: 'swiatlo', level: 'basic', partner: 'Vayox', outside: 'na szelce, z przodu',
    name: 'Czołówka',
    why: 'Światło tam, gdzie patrzysz, i dwie wolne ręce do pakowania czy opatrunku.',
    produkt: { nazwa: 'Latarka czołowa hybrydowa VA0361 TwinBeam 600 lm', marka: 'Vayox', cena: 119, url: 'https://vayox.pl/produkt/va0361/', sklep: 'vayox.pl', sprawdzono: '2026-11-07', partner: true } },
  { id: 'akumulatory', cat: 'swiatlo', level: 'basic', partner: 'everActive', name: 'Akumulatory i ładowarka',
    why: 'Zasilą czołówkę i radio, a ładowarkę podłączysz do powerbanku.',
    produkt: { nazwa: 'Ładowarka everActive NC-450 (USB) + akumulatory everActive Silver Line R6/AA 2000 mAh, 4 szt.', marka: 'everActive', cena: 94.9, url: 'https://botland.com.pl/ladowarki-sieciowe-do-akumulatorkow-nimh/8204-ladowarka-akumulatorow-everactive-nc-450-aa-aaa-1-4szt-czarna-5902020523987.html', sklep: 'Botland', sprawdzono: '2026-11-07', dodatkowe: ['https://botland.com.pl/akumulatory-ni-mh/4212-akumulator-everactive-silver-line-r6-aa-ni-mh-2000mah-4szt-5902020523642.html'], partner: true } },
  { id: 'powerbank', cat: 'swiatlo', level: 'basic', name: 'Powerbank z kablem',
    why: 'Telefon to latarka, mapa i kontakt z rodziną, więc musi mieć z czego się ładować.',
    produkt: { nazwa: 'Powerbank VA0340 10000 mAh 20 W + kabel USB-C/USB-C 1 m VA0105', marka: 'Vayox', cena: 69.8, url: 'https://vayox.pl/produkt/powerbank-va0340-10000mah-20w/', sklep: 'vayox.pl', sprawdzono: '2026-11-07', dodatkowe: ['https://vayox.pl/produkt/kabel-usb-c-usb-c-bialy-1m-va0105-vayox/'] } },
  { id: 'latarka', cat: 'swiatlo', level: 'extended', name: 'Zapasowa latarka',
    why: 'Gdy czołówka się zgubi albo rozładuje, nie zostajesz po ciemku.',
    produkt: { nazwa: 'Latarka akumulatorowa VA0116 800 lm', marka: 'Vayox', cena: 45, url: 'https://vayox.pl/produkt/va0116/', sklep: 'vayox.pl', sprawdzono: '2026-11-07' } },
  { id: 'duzy-powerbank', cat: 'swiatlo', level: 'pro', replaces: 'powerbank', name: 'Duży powerbank z kablem',
    why: 'Zamiast małego: kilka pełnych ładowań telefonu i radia, gdy prądu nie ma przez kilka dni.',
    produkt: { nazwa: 'Powerbank VA0341 20000 mAh 20 W + kabel USB-C/USB-C 1 m VA0105', marka: 'Vayox', cena: 104.8, url: 'https://vayox.pl/produkt/powerbank-va0341-20000mah-20w/', sklep: 'vayox.pl', sprawdzono: '2026-11-07', dodatkowe: ['https://vayox.pl/produkt/kabel-usb-c-usb-c-bialy-1m-va0105-vayox/'] } },
  { id: 'solar', cat: 'swiatlo', level: 'pro', outside: 'na MOLLE kieszeni przedniej', name: 'Składany panel solarny',
    why: 'Doładuje powerbank w ciągu dnia, gdy prądu nie ma przez wiele dni. Kabel jedzie w żółtej saszetce.',
    produkt: { nazwa: 'Ładowarka solarna Sunen PowerNeed ES-5, składana, 18 W, 2× USB', marka: 'Sunen PowerNeed', cena: 287.98, url: 'https://www.morele.net/ladowarka-solarna-sunen-powerneed-es-5-5860627/', sklep: 'Morele.net', sprawdzono: '2026-11-07', uwaga: 'ostatnie sztuki' } },

  // ── Czarna: Łączność i dokumenty ──────────────────────────
  { id: 'radio', cat: 'lacznosc', level: 'basic', name: 'Radio na baterie lub korbkę',
    why: 'Komunikaty RCB i służb usłyszysz także wtedy, gdy nie ma prądu ani zasięgu.',
    produkt: { nazwa: 'Radio turystyczne z Bluetooth VA0440 z powerbankiem (akumulator, korbka, panel solarny, 3× AAA)', marka: 'Vayox', cena: 179, url: 'https://vayox.pl/produkt/radio-turystyczne-z-bluetooth-va0440-powerbank/', sklep: 'vayox.pl', sprawdzono: '2026-11-07' } },
  { id: 'etui', cat: 'lacznosc', level: 'basic', name: 'Wodoodporne etui na dokumenty i gotówkę',
    why: 'Kopie dokumentów i gotówka przetrwają ulewę i przeprawę przez wodę.',
    produkt: { nazwa: 'Wodoodporne etui PVC Waterproof Pouch, małe', marka: 'Fosco', cena: 15, url: 'https://www.specshop.pl/product-pol-13730-FOSCO-Wodoorporne-etui-PVC-Waterproof-Pouch-Male.html', sklep: 'SpecShop.pl', sprawdzono: '2026-11-07' } },
  { id: 'notes', cat: 'lacznosc', level: 'basic', name: 'Notes, ołówek i lista kontaktów',
    why: 'Gdy telefon padnie, numery bliskich masz na papierze. Ołówek pisze też na mokro.',
    produkt: { nazwa: 'Notes wodoodporny Rite in the Rain 3×5" (935, oliwkowy) + ołówki Maped Black\'Peps HB z gumką, 3 szt.', marka: 'Rite in the Rain / Maped', cena: 32.49, url: 'https://www.specshop.pl/product-pol-12421-Rite-in-the-Rain-Notes-wodoodporny-3-x-5-935-Oliwkowy.html', sklep: 'SpecShop.pl + Rossmann', sprawdzono: '2026-11-07', dodatkowe: ['https://www.rossmann.pl/Produkt/Olowki-i-wegle/Maped-BlackPeps-olowki-grafitowe-z-gumka-HB-3-szt,342885,19175'] } },
  { id: 'gwizdek', cat: 'lacznosc', level: 'basic', name: 'Gwizdek',
    why: 'Słychać go dalej niż głos i nie zdziera gardła, gdy wzywasz pomocy.',
    produkt: { nazwa: 'Gwizdek ratunkowy Emergency Whistle, pomarańczowy (GW-ERG-PP-24)', marka: 'Helikon-Tex', cena: 18.99, url: 'https://www.specshop.pl/Helikon-Gwizdek-Emergency-Whistle-Pomaranczowy-GW-ERG-PP-24', sklep: 'SpecShop.pl', sprawdzono: '2026-11-07' } },
  { id: 'mapa', cat: 'lacznosc', level: 'extended', name: 'Mapa papierowa i kompas',
    why: 'Działają bez baterii i zasięgu. Zaznacz na mapie swoje trasy ewakuacji.',
    produkt: { nazwa: 'Kompas mapowy Silva Field 37501 + Polska mapa samochodowa 1:700 000 foliowana 2026 (Expressmap)', marka: 'Silva / Expressmap', cena: 123.79, url: 'https://www.specshop.pl/product-pol-13747-Silva-Kompas-mapowy-Field-37501.html', sklep: 'SpecShop.pl + TaniaKsiazka.pl', sprawdzono: '2026-11-07', dodatkowe: ['https://www.taniaksiazka.pl/polska-mapa-samochodowa-1-700-000-foliowana-2026-p-2448942.html'] } },
  { id: 'pmr', cat: 'lacznosc', level: 'pro', name: 'Krótkofalówki PMR',
    why: 'Kontakt z rodziną na kilka kilometrów, bez sieci komórkowej i bez opłat.',
    produkt: { nazwa: 'Motorola T42 Gummy, 2 szt. (pomarańczowa + niebieska), PMR446', marka: 'Motorola', cena: 130.99, url: 'https://www.morele.net/krotkofalowka-motorola-t42-gummy-2-szt-pomaranczowy-niebieski-15756818/', sklep: 'Morele.net', sprawdzono: '2026-11-07' } },

  // ── Biała: Higiena ────────────────────────────────────────
  { id: 'ffp2', cat: 'higiena', level: 'basic', name: 'Maseczki FFP2',
    why: 'Chronią przed pyłem i dymem oraz przed zakażeniem w zatłoczonym miejscu.',
    produkt: { nazwa: 'DOZ Product Półmaska ochronna FFP2 NR, pięciowarstwowa, 2 szt.', marka: 'DOZ Product', cena: 8.97, url: 'https://www.doz.pl/p/doz-product-polmaska-ochronna-ffp2-nr-pieciowarstwowa-2-szt-163987', sklep: 'DOZ.pl', sprawdzono: '2026-11-07' } },
  { id: 'chusteczki', cat: 'higiena', level: 'basic', name: 'Chusteczki nawilżane i żel do rąk',
    why: 'Higiena bez bieżącej wody: przed jedzeniem, po toalecie i przed opatrunkiem.',
    produkt: { nazwa: 'Isana Med chusteczki nawilżane antybakteryjne 15 szt. + Isana Med żel antybakteryjny do rąk 63% alk. 50 ml', marka: 'Isana (Rossmann)', cena: 8.58, url: 'https://www.rossmann.pl/Produkt/Minikosmetyki/Isana-Med-chusteczki-nawilzane-antybakteryjne-15-szt,272620,19247', sklep: 'Rossmann', sprawdzono: '2026-11-07', dodatkowe: ['https://www.rossmann.pl/Produkt/Zele-antybakteryjne/Isana-Med-zel-antybakteryjny-do-rak-63-alk-50-ml,414829,13137'], uwaga: 'promocja' } },
  { id: 'higiena-podst', cat: 'higiena', level: 'basic', name: 'Szczoteczka, pasta i papier toaletowy',
    why: 'Drobiazgi, których najbardziej brakuje po pierwszej nocy poza domem. Papier spłaszcz, bez tulejki zajmie połowę miejsca.' },
  { id: 'intymne', cat: 'higiena', level: 'extended', name: 'Środki higieny intymnej',
    why: 'Na kilka dni poza domem, gdy sklepy są zamknięte albo puste.' },
  { id: 'worki', cat: 'higiena', level: 'extended', name: 'Worki na śmieci',
    why: 'Peleryna, podkładka pod siedzenie, worek na mokre rzeczy albo na odpadki.',
    produkt: { nazwa: 'Jan Niezbędny Magnum Flex & Strong, worki na śmieci z taśmą, 60 l, 10 szt.', marka: 'Jan Niezbędny', cena: 9.99, url: 'https://www.rossmann.pl/Produkt/Worki-na-smieci/Jan-Niezbedny-Magnum-Flex-Strong-worki-na-smieci-z-tasma-poj-60-L-10-szt,235233,19374', sklep: 'Rossmann', sprawdzono: '2026-11-07' } },

  // ── Oliwkowa: Ochrona i nocleg ────────────────────────────
  { id: 'koc-nrc', cat: 'ochrona', level: 'basic', name: 'Koc ratunkowy NRC',
    why: 'Waży kilkadziesiąt gramów, a chroni przed wychłodzeniem, wiatrem i deszczem.',
    produkt: { nazwa: 'Folia NRC / koc ratunkowy MFH 27134 srebrny/zielony OD', marka: 'MFH', cena: 19.99, url: 'https://www.specshop.pl/MFH-Folia-NRC-Koc-ratunkowy-27134', sklep: 'SpecShop.pl', sprawdzono: '2026-11-07' } },
  { id: 'poncho', cat: 'ochrona', level: 'basic', name: 'Poncho przeciwdeszczowe',
    why: 'Przykryje Ciebie razem z plecakiem i zajmuje mniej miejsca niż kurtka.',
    produkt: { nazwa: 'Ponczo przeciwdeszczowe US RipStop oliwkowe (10630001)', marka: 'Mil-Tec', cena: 109, url: 'https://www.specshop.pl/product-pol-1091-Mil-Tec-Ponczo-przeciwdeszczowa-US-RipStop-Oliwkowy-10630001.html', sklep: 'SpecShop.pl', sprawdzono: '2026-11-07' } },
  { id: 'rekawice', cat: 'ochrona', level: 'extended', name: 'Rękawice robocze',
    why: 'Ochronią dłonie przy gruzie, szkle, drewnie i ogniu.',
    produkt: { nazwa: 'Rękawice Delta Plus DPVE715 z poliestru, powłoka nitrylowa, niebieskie, rozm. 8', marka: 'Delta Plus', cena: 11.49, url: 'https://www.obi.pl/p/3899069/rekawica-dpve715bl08-z-poliestru-powloka-nitrylowa-niebieska-roz-8', sklep: 'OBI', sprawdzono: '2026-11-07' } },
  { id: 'bielizna', cat: 'ochrona', level: 'extended', name: 'Bielizna i skarpety termoaktywne',
    why: 'Szybko schną, a suche skarpety to mniej otarć i mniej wychłodzenia.',
    produkt: { nazwa: 'Komplet bielizny termoaktywnej unisex DRY (Brubeck) + skarpeta wielosezonowa Wisport', marka: 'Brubeck / Wisport', cena: 229.98, url: 'https://brubeck.pl/produkt/komplet-bielizny-termoaktywnej-unisex-dry/', sklep: 'brubeck.pl + wisport.com.pl', sprawdzono: '2026-11-07', dodatkowe: ['https://www.wisport.com.pl/sklep/skarpeta-wielosezonowa/'] } },
  { id: 'spiwor', cat: 'ochrona', level: 'extended', outside: 'troczony pod plecakiem', name: 'Śpiwór lub worek biwakowy',
    why: 'Noc poza domem bez śpiwora szybko odbiera siły, nawet latem.',
    produkt: { nazwa: 'Termiczny worek ratunkowy Bad Weather Bag, zielony (CL182G)', marka: 'BCB', cena: 52, url: 'https://www.specshop.pl/product-pol-23329-BCB-Termiczny-worek-ratunkowy-Bad-Weather-Bag-Zielony-CL182G.html', sklep: 'SpecShop.pl', sprawdzono: '2026-11-07' } },
  { id: 'tarp', cat: 'ochrona', level: 'extended', outside: 'troczona razem ze śpiworem', name: 'Plandeka (tarp) i linka',
    why: 'Daszek nad głową w kilka minut. Linka przyda się też do suszenia i mocowania.',
    produkt: { nazwa: 'Plandeka 120 g/m² 3×4 m VA0476-3x4 srebrna', marka: 'Vayox', cena: 34.9, url: 'https://vayox.pl/produkt/plandeka-120g-3x4m-va0476-3x4-srebrna/', sklep: 'vayox.pl', sprawdzono: '2026-11-07', uwaga: 'linka dokupiona osobno' } },
  { id: 'czapka', cat: 'ochrona', level: 'extended', name: 'Czapka i komin',
    why: 'Przez głowę szybko ucieka ciepło, a komin osłoni też usta i nos przed pyłem i dymem.' },
  { id: 'okulary', cat: 'ochrona', level: 'pro', name: 'Okulary ochronne',
    why: 'Chronią oczy przed pyłem, odłamkami i dymem.',
    produkt: { nazwa: 'Okulary ochronne Bolle Safety COBRA, przezroczyste (COBPSI)', marka: 'Bolle Safety', cena: 49, url: 'https://www.specshop.pl/product-pol-12502-Bolle-Safety-Okulary-ochronne-COBRA-Przezroczysty-COBPSI.html', sklep: 'SpecShop.pl', sprawdzono: '2026-11-07' } },
];

/** Zostawia tylko rzeczy, których nie zastępuje inna rzecz z tej samej listy (apteczka podstawowa znika przy rozszerzonej). */
export function withoutReplaced<T extends BagItem>(list: T[]): T[] {
  const ids = new Set(list.map((i) => i.id));
  const gone = new Set(list.filter((i) => i.replaces && ids.has(i.replaces)).map((i) => i.replaces!));
  return list.filter((i) => !gone.has(i.id));
}

/** Rzeczy w standardzie danej wersji (Własny = wybór czytelnika, więc tu pusta lista). */
export function itemsFor(version: BagVersionId): BagItem[] {
  if (version === 'custom') return [];
  const max = levelOrder.indexOf(version);
  return withoutReplaced(bagItems.filter((i) => levelOrder.indexOf(i.level) <= max));
}

/** Odmiana: 1 rzecz, 2 rzeczy, 5 rzeczy. */
export function rzeczy(n: number): string {
  return n === 1 ? 'rzecz' : 'rzeczy';
}
/** Odmiana: 1 saszetka, 2–4 saszetki, 5+ saszetek (12–14 saszetek). */
export function saszetek(n: number): string {
  if (n === 1) return 'saszetka';
  const d = n % 10, dd = n % 100;
  return d >= 2 && d <= 4 && (dd < 12 || dd > 14) ? 'saszetki' : 'saszetek';
}

/** Cena po polsku: 49,99 zł, 1 299 zł */
export function zl(n: number): string {
  const s = new Intl.NumberFormat('pl-PL', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2, useGrouping: true }).format(n);
  return `${s.replace(/\s/g, ' ')} zł`;
}

/** Data ostatniego sprawdzenia cen (DD.MM.RRRR) albo null, jeśli żadna cena nie jest jeszcze wpisana */
export function cenyZDnia(): string | null {
  const d = bagItems.map((i) => i.produkt?.sprawdzono).filter(Boolean).sort().pop();
  if (!d) return null;
  const [y, m, day] = d!.split('-');
  return `${day}.${m}.${y}`;
}

/* ───────────────────────── Plecak: opis i warianty kolorów ───────────────────────── */

export interface BagColor {
  id: string;
  /** Nazwa wariantu u producenta */
  name: string;
  /** Kolor główny (dla kamuflażu: kolor dominujący, np. do kropki) */
  hex: string;
  /** Kamuflaż: paleta (pierwszy kolor = tło) i rodzaj wzoru generowanego w kodzie */
  palette?: string[];
  pattern?: 'pantera' | 'multi';
  /** Opis wzoru (podpowiedź przy próbniku) */
  desc?: string;
  /** Cena plecaka w tym kolorze u producenta */
  cena?: number;
  url?: string;
  /** Dostępny w sklepie producenta w dniu sprawdzenia */
  dostepny?: boolean;
}

export interface BagModelInfo {
  name: string;
  url: string;
  sprawdzono: string;
  opis: string[];
  /** [nazwa, wartość]; nazwa pusta = cecha bez etykiety */
  specs: [string, string][];
  colors: BagColor[];
  defaultColor: string;
}

/**
 * Wisport Whistler II 35: opis i warianty ze strony producenta (sprawdzone 7.11.2026).
 * Kolory hex to przybliżenia (RAL: przybliżone sRGB), nie dane producenta. Kamuflaże rysujemy w kodzie (bez zdjęć Wisport).
 */
export const bagModel: BagModelInfo = {
  name: 'Wisport Whistler II 35',
  url: 'https://www.wisport.com.pl/sklep/whistler-ii/',
  sprawdzono: '2026-11-07',
  opis: [
    'Whistler II to 35-litrowy plecak z linii Military polskiej firmy Wisport, szyty we Wrocławiu z wytrzymałej Cordury. Ma jedną dużą komorę z wewnętrzną przegrodą, siedem kieszeni i przedni organizer, więc mieści zapas na kilka dni bez rozrastania się do rozmiarów plecaka wyprawowego. To dobra objętość na plecak ewakuacyjny: wystarczająco duży na wodę, jedzenie i apteczkę, a wciąż wygodny w biegu, w tramwaju czy w samochodzie.',
    'Za wygodę odpowiada system nośny SAS Ergonomic Military z wyjmowanym usztywnieniem z włókna szklanego, szeroki pas biodrowy i pas piersiowy. Na zewnątrz są taśmy zgodne z MOLLE (można dopiąć np. boczne kieszenie Raccoon), boczne kieszonki, panel na identyfikator i system szybkiego wypinania. W zestawie jest peleryna przeciwdeszczowa, a w środku kieszeń na bukłak. Plecak waży 1,75 kg i jest dostępny w dziesięciu kolorach, od czerni i grafitu po kamuflaże MultiCam i polski wz. 93.',
  ],
  specs: [
    ['Pojemność', '35 l'],
    ['Wymiary', '50 × 33 × 23 cm'],
    ['Waga', '1,75 kg'],
    ['Materiał', 'Cordura'],
    ['System nośny', 'SAS Ergonomic Military z wyjmowaną listwą z włókna szklanego'],
    ['Komory i kieszenie', '1 komora główna z wewnętrzną przegrodą, 7 kieszeni, organizer w przedniej kieszeni, boczne kieszonki'],
    ['Klamry i zamki', 'klamry ITW Nexus i Duraflex, zamki Wisport'],
    ['Bukłak', 'kieszeń na bukłak (typu CamelBak) z dostępem od wewnątrz'],
    ['Pasy', 'biodrowy i piersiowy'],
    ['MOLLE', 'taśmy kompatybilne z MOLLE, można dopiąć boczne kieszenie Raccoon'],
    ['W zestawie', 'peleryna przeciwdeszczowa'],
    ['Inne', 'system szybkiego wypinania, panel ID'],
    ['Produkcja', 'Polska (Wrocław), linia Military'],
    ['Cena u producenta', 'od 799 zł (kolory podstawowe) przez 899 zł (RAL, Coyote) do 1049 zł (kamuflaże)'],
  ],
  colors: [
    { id: 'grafitowy', name: 'Grafitowy', hex: '#3E4044', cena: 799, dostepny: false, url: 'https://www.wisport.com.pl/sklep/whistler-ii/?attribute_pa_kolor=grafitowy' },
    { id: 'czarny', name: 'Czarny', hex: '#1C1C1C', cena: 799, dostepny: false, url: 'https://www.wisport.com.pl/sklep/whistler-ii/?attribute_pa_kolor=czarny' },
    { id: 'olive-green', name: 'Olive green', hex: '#545A3B', cena: 799, dostepny: false, url: 'https://www.wisport.com.pl/sklep/whistler-ii/?attribute_pa_kolor=olive-green' },
    { id: 'ral-6003', name: 'RAL 6003', hex: '#4F5338', cena: 899, dostepny: true, url: 'https://www.wisport.com.pl/sklep/whistler-ii/?attribute_pa_kolor=ral-6003' },
    { id: 'ral-7013', name: 'RAL 7013', hex: '#555548', cena: 899, dostepny: false, url: 'https://www.wisport.com.pl/sklep/whistler-ii/?attribute_pa_kolor=ral-7013' },
    { id: 'coyote-brown', name: 'Coyote brown', hex: '#81613C', cena: 899, dostepny: true, url: 'https://www.wisport.com.pl/sklep/whistler-ii/?attribute_pa_kolor=coyote-brown' },
    { id: 'wz93', name: 'Polski leśny wz. 93, full camo', hex: '#6B7449', pattern: 'pantera',
      palette: ['#7F8A58', '#4A5A33', '#5E4A32', '#2A2B24', '#9A9668'],
      desc: 'Duże, poziomo wydłużone plamy o postrzępionych brzegach: zieleń, brąz i czarne smugi na jasnooliwkowym tle',
      cena: 1049, dostepny: false, url: 'https://www.wisport.com.pl/sklep/whistler-ii/?attribute_pa_kolor=polski-lesny-wz-93-full-camo' },
    { id: 'multicam', name: 'Multicam US, full camo', hex: '#A69A72', pattern: 'multi',
      palette: ['#D6C8A1', '#A69A72', '#7B7445', '#5D4A35', '#3E3A2C'],
      desc: 'Miękkie, pionowe pociągnięcia pędzla z drobnymi plamkami: beż, khaki, zieleń i brąz',
      cena: 1049, dostepny: true, url: 'https://www.wisport.com.pl/sklep/whistler-ii/?attribute_pa_kolor=multicam-us-full-camo' },
    { id: 'multicam-black', name: 'Multicam Black, full camo', hex: '#2B2B2B', pattern: 'multi',
      palette: ['#161616', '#2B2B2B', '#3D3D3B', '#4F4F4B', '#5F5F5A'],
      desc: 'Pociągnięcia pędzla i plamki w odcieniach czerni i ciemnej szarości, niski kontrast',
      cena: 1049, dostepny: true, url: 'https://www.wisport.com.pl/sklep/whistler-ii/?attribute_pa_kolor=multicam-black-full-camo' },
    { id: 'multicam-tropic', name: 'Multicam Tropic, full camo', hex: '#4F5A34', pattern: 'multi',
      palette: ['#2D3A23', '#4F5A34', '#6D7A3C', '#8F8F58', '#3B3524'],
      desc: 'Pociągnięcia pędzla w nasyconych zieleniach dżungli z ciemnobrązowymi i jasnożółtozielonymi akcentami',
      cena: 1049, dostepny: true, url: 'https://www.wisport.com.pl/sklep/whistler-ii/?attribute_pa_kolor=multicam-tropic-full-camo' },
  ],
  // Grafit: taki plecak mamy w zestawie testowym
  defaultColor: 'grafitowy',
};
