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
 * - `produkt`: przykładowy produkt. Wpisujemy TYLKO marki, z którymi jesteśmy w kontakcie (próbka, kod, propozycja;
 *   arkusz PrepReady-LEAD). Na stronie nie pokazujemy cen ani linków do sklepów: `cena` zostaje tylko do wewnętrznej wyceny.
 *   `opis` i `spec` pokazują się w dymku po najechaniu. `partner: true` = producent jest naszym partnerem
 *   (wtedy znika dopisek „Miejsce dla producenta”),
 * - `drobne: true`: tani drobiazg, który kupujemy sami (krótki wiersz, bez produktu i bez „Miejsca dla producenta”),
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
  /** Krótka uwaga: „linka dokupiona osobno” */
  uwaga?: string;
  /** Krótki opis w dymku po najechaniu (nasz, nie z katalogu producenta) */
  opis?: string;
  /** Krótka specyfikacja w dymku: [cecha, wartość]. Tylko sprawdzone dane. */
  spec?: [string, string][];
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
  /** Drobiazg do dokupienia (chusteczki, łyżka, gwizdek): krótki wiersz bez przykładowego produktu i bez outreachu */
  drobne?: boolean;
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
    produkt: { nazwa: 'Wisport Whistler II 35, Grafitowy', marka: 'Wisport', cena: 799, sprawdzono: '2026-11-07', partner: true,
      opis: 'Polski plecak z linii Military, szyty we Wrocławiu. Tym plecakiem kompletujemy zestaw testowy.',
      spec: [['Pojemność', '35 l'], ['Wymiary', '50 × 33 × 23 cm'], ['Waga', '1,75 kg'], ['Materiał', 'Cordura'], ['MOLLE', 'tak']] } },

  // ── Niebieska: Woda ───────────────────────────────────────
  { id: 'woda', cat: 'woda', level: 'basic', partner: 'Javel Aqua', model: 'tabletki do uzdatniania wody', name: 'Woda 2 × 0,75 l w butelkach + tabletki do uzdatniania',
    why: 'Woda na pierwsze godziny, a tabletki zrobią pitną wodę z kranu, studni lub rzeki.',
    produkt: { nazwa: 'tabletki do uzdatniania wody + 2 butelki 0,75 l', marka: 'Javel Aqua', cena: null, partner: true,
      opis: 'Chlorowe tabletki do dezynfekcji wody. Próbki dostaliśmy od producenta i testujemy je w plecaku.',
      spec: [['Rodzaj', 'tabletki chlorowe'], ['W zestawie', 'tabletki + 2 butelki 0,75 l']] } },
  { id: 'filtr', cat: 'woda', level: 'extended', name: 'Butelka z filtrem',
    why: 'Oczyszcza wodę z rzeki lub jeziora od razu, bez czekania, aż zadziałają tabletki.',
    produkt: { nazwa: 'Water Straw, butelka z filtrem', marka: 'Global Water', cena: null,
      opis: 'Butelka z filtrem: pijesz prosto z niej, filtr zatrzymuje bakterie i zanieczyszczenia.',
      spec: [['Pojemność', '650 ml'], ['Filtracja', '0,1 µm'], ['Wydajność filtra', 'do 1500 l'], ['Waga', '210 g']] } },
  { id: 'elektrolity', cat: 'woda', level: 'extended', drobne: true, name: 'Elektrolity',
    why: 'Uzupełniają sole przy upale, dużym wysiłku i biegunce.' },
  { id: 'filtr-pro', cat: 'woda', level: 'pro', replaces: 'filtr', name: 'Filtr wysokowydajny',
    why: 'Zamiast butelki: szybciej filtruje więcej wody, gdy korzysta z niego cała rodzina.' },

  // ── Pomarańczowa: Jedzenie ────────────────────────────────
  { id: 'jedzenie-3', cat: 'jedzenie', level: 'basic', partner: 'Lyofood', name: 'Jedzenie liofilizowane na 3 dni',
    why: 'Lekkie i trwałe przez lata. Wystarczy zalać wodą, w razie potrzeby nawet zimną.',
    produkt: { nazwa: 'Zestaw ratunkowy 72h, serowy', marka: 'LYOFOOD', cena: 370, sprawdzono: '2026-11-07', partner: true,
      opis: 'Polskie liofilizaty: lekkie, trwałe i gotowe po zalaniu wodą. Zestaw jest już w naszym plecaku testowym.',
      spec: [['Dania główne', '6'], ['Przekąski', '3'], ['Desery', '3'], ['Na ile', '72 h dla 1 osoby']] } },
  { id: 'lyzka', cat: 'jedzenie', level: 'basic', drobne: true, name: 'Łyżka z długim trzonkiem',
    why: 'Liofilizaty je się prosto z torebki, a długa łyżka sięga do dna bez brudzenia rąk.' },
  { id: 'glukoza', cat: 'jedzenie', level: 'extended', drobne: true, name: 'Tabletki z glukozą',
    why: 'Szybka energia przy osłabieniu i spadku cukru. Nie topią się, nie kruszą i leżą latami.' },
  { id: 'jedzenie-5', cat: 'jedzenie', level: 'pro', name: 'Zapas jedzenia na 5 dni',
    why: 'Dodatkowe posiłki na wypadek, gdy powrót do domu potrwa dłużej niż 72 godziny.',
    produkt: { nazwa: 'Dania gotowe JemyJemy', marka: 'Profi', cena: null,
      opis: 'Gotowe dania od polskiego producenta Profi. Paczkę do testu dostaliśmy od producenta.' } },

  // ── Czerwona: Ogień i narzędzia ───────────────────────────
  { id: 'ogien', cat: 'ogien', level: 'basic', drobne: true, name: 'Zapalniczka i krzesiwo',
    why: 'Zapalniczka na co dzień, krzesiwo, gdy zamoknie albo skończy się gaz.' },
  { id: 'multitool', cat: 'ogien', level: 'basic', name: 'Multitool',
    why: 'Nóż, kombinerki i śrubokręt w jednym, do drobnych napraw i otwierania puszek.' },
  { id: 'kuchenka', cat: 'ogien', level: 'extended', name: 'Kuchenka z paliwem i kubkiem',
    why: 'Wrzątek do liofilizatów i ciepły posiłek w kilka minut.',
    produkt: { nazwa: 'Kuchenka spirytusowa Piran', marka: 'Piran', cena: null,
      opis: 'Kuchenka na spirytus: bez kartusza z gazem, a paliwo kupisz w każdym markecie. Producent przysyła ją nam do testu.',
      spec: [['Paliwo', 'spirytus']] } },
  { id: 'tasma', cat: 'ogien', level: 'extended', drobne: true, name: 'Taśma naprawcza',
    why: 'Załata plandekę, but, plecak albo pęknięty pojemnik na wodę.' },
  { id: 'noz', cat: 'ogien', level: 'pro', name: 'Nóż z głownią stałą',
    why: 'Mocniejszy niż multitool: drewno na opał, liny i budowa schronienia.' },

  // ── Zielona z białym krzyżem: Apteczka ────────────────────
  { id: 'apteczka', cat: 'apteczka', level: 'basic', name: 'Apteczka podstawowa',
    why: 'Opatrunki, plastry, rękawiczki i środek do dezynfekcji na drobne urazy.' },
  { id: 'leki-otc', cat: 'apteczka', level: 'basic', drobne: true, name: 'Leki bez recepty',
    why: 'Przeciwbólowe i przeciwgorączkowe, na biegunkę i na alergię, po jednym listku. Ból albo gorączka w drodze potrafią zatrzymać całą rodzinę.' },
  { id: 'multiwitamina', cat: 'apteczka', level: 'extended', drobne: true, name: 'Multiwitamina w tabletkach',
    why: 'Przez kilka dni na liofilizatach łatwo o braki w diecie. Tabletki zajmują mało miejsca i długo się przechowują.' },
  { id: 'wegiel', cat: 'apteczka', level: 'extended', drobne: true, name: 'Węgiel aktywny',
    why: 'Przy niestrawności i biegunce po jedzeniu lub wodzie niewiadomego pochodzenia.' },
  { id: 'apteczka-pro', cat: 'apteczka', level: 'pro', replaces: 'apteczka', name: 'Apteczka rozszerzona ze stazą taktyczną',
    why: 'Zamiast podstawowej: opatrunki na poważne rany i staza na silne krwawienia, gdy pomoc dociera później.' },

  // ── Żółta: Światło i zasilanie ────────────────────────────
  { id: 'czolowka', cat: 'swiatlo', level: 'basic', partner: 'Vayox', outside: 'na szelce, z przodu',
    name: 'Czołówka',
    why: 'Światło tam, gdzie patrzysz, i dwie wolne ręce do pakowania czy opatrunku.',
    produkt: { nazwa: 'Latarka czołowa hybrydowa VA0361 TwinBeam', marka: 'Vayox', cena: 119, sprawdzono: '2026-11-07', partner: true,
      opis: 'Czołówka z dwoma rodzajami światła. Jest już w naszym plecaku testowym. Z kodem PREP5 taniej o 5% na vayox.pl.',
      spec: [['Jasność', '600 lm'], ['Zasilanie', 'hybrydowe']] } },
  { id: 'akumulatory', cat: 'swiatlo', level: 'basic', partner: 'everActive', name: 'Akumulatory i ładowarka',
    why: 'Zasilą czołówkę i radio, a ładowarkę podłączysz do powerbanku.',
    produkt: { nazwa: 'Ładowarka NC-450 + akumulatory Silver Line AA', marka: 'everActive', cena: 94.9, sprawdzono: '2026-11-07', partner: true,
      opis: 'Ładowarka na USB, więc naładujesz akumulatory z powerbanku. Komplet jest już w naszym plecaku testowym.',
      spec: [['Ładowarka', 'NC-450, zasilanie USB'], ['Akumulatory', '4 × AA, 2000 mAh']] } },
  { id: 'powerbank', cat: 'swiatlo', level: 'basic', name: 'Powerbank z kablem',
    why: 'Telefon to latarka, mapa i kontakt z rodziną, więc musi mieć z czego się ładować.',
    produkt: { nazwa: 'Powerbank VA0340 + kabel USB-C', marka: 'Vayox', cena: 69.8, sprawdzono: '2026-11-07', partner: true,
      opis: 'Mały powerbank od naszego partnera Vayox. Z kodem PREP5 taniej o 5% na vayox.pl.',
      spec: [['Pojemność', '10 000 mAh'], ['Moc', '20 W'], ['Kabel', 'USB-C, 1 m']] } },
  { id: 'latarka', cat: 'swiatlo', level: 'extended', name: 'Zapasowa latarka',
    why: 'Gdy czołówka się zgubi albo rozładuje, nie zostajesz po ciemku.',
    produkt: { nazwa: 'Latarka Archer 2A Pro', marka: 'ThruNite', cena: null,
      opis: 'Mała latarka na baterie AA. Producent przysyła ją nam do testu.' } },
  { id: 'duzy-powerbank', cat: 'swiatlo', level: 'pro', replaces: 'powerbank', name: 'Duży powerbank z panelem solarnym',
    why: 'Zamiast małego: kilka pełnych ładowań telefonu i radia, a w słońcu doładuje się sam.',
    produkt: { nazwa: 'Powerbank solarny PowerSolar36', marka: 'Feegar', cena: null, partner: true,
      opis: 'Duży powerbank z wbudowanym panelem słonecznym od polskiej firmy Feegar.',
      spec: [['Pojemność', '36 000 mAh'], ['Wyjścia', '4 × USB'], ['Waga', 'ok. 500 g'], ['Ładowanie', 'gniazdo i panel solarny']] } },
  { id: 'solar', cat: 'swiatlo', level: 'pro', outside: 'na MOLLE kieszeni przedniej', name: 'Składany panel solarny',
    why: 'Doładuje powerbank w ciągu dnia, gdy prądu nie ma przez wiele dni. Kabel jedzie w żółtej saszetce.' },

  // ── Czarna: Łączność i dokumenty ──────────────────────────
  { id: 'radio', cat: 'lacznosc', level: 'basic', name: 'Radio na korbkę i słońce',
    why: 'Komunikaty RCB i służb usłyszysz także wtedy, gdy nie ma prądu ani zasięgu.',
    produkt: { nazwa: 'Radio MH-08', marka: 'MUSE', cena: null,
      opis: 'Radio FM z korbką, panelem słonecznym i latarką. Producent przysyła je nam do testu.',
      spec: [['Zasilanie', 'korbka, panel solarny, akumulator 1800 mAh'], ['Pasmo', 'FM'], ['Dodatki', 'latarka LED'], ['Waga', '0,45 kg']] } },
  { id: 'etui', cat: 'lacznosc', level: 'basic', drobne: true, name: 'Wodoodporne etui na dokumenty i gotówkę',
    why: 'Kopie dokumentów i gotówka przetrwają ulewę i przeprawę przez wodę.' },
  { id: 'notes', cat: 'lacznosc', level: 'basic', drobne: true, name: 'Notes, ołówek i lista kontaktów',
    why: 'Gdy telefon padnie, numery bliskich masz na papierze. Ołówek pisze też na mokro.' },
  { id: 'gwizdek', cat: 'lacznosc', level: 'basic', drobne: true, name: 'Gwizdek',
    why: 'Słychać go dalej niż głos i nie zdziera gardła, gdy wzywasz pomocy.' },
  { id: 'mapa', cat: 'lacznosc', level: 'extended', name: 'Mapa papierowa i kompas',
    why: 'Działają bez baterii i zasięgu. Zaznacz na mapie swoje trasy ewakuacji.',
    produkt: { nazwa: 'Polska mapa samochodowa 1:700 000, foliowana + kompas', marka: 'Expressmap', cena: null,
      opis: 'Foliowana mapa Polski: nie rozmoknie w deszczu. Kompas dobieramy.',
      spec: [['Skala', '1:700 000'], ['Wykończenie', 'foliowana']] } },
  { id: 'pmr', cat: 'lacznosc', level: 'pro', name: 'Krótkofalówki PMR',
    why: 'Kontakt z rodziną na kilka kilometrów, bez sieci komórkowej i bez opłat.',
    produkt: { nazwa: 'Krótkofalówki PMR446, para', marka: 'Baofeng', cena: null,
      opis: 'Para krótkofalówek PMR446: działają bez licencji i bez opłat. Model ustalamy z dystrybutorem.',
      spec: [['Pasmo', 'PMR446, bez licencji']] } },

  // ── Biała: Higiena ────────────────────────────────────────
  { id: 'ffp2', cat: 'higiena', level: 'basic', name: 'Półmaska FFP2',
    why: 'Chroni przed pyłem i dymem oraz przed zakażeniem w zatłoczonym miejscu.',
    produkt: { nazwa: 'Półmaska ochronna FFP2', marka: 'Delta Plus', cena: null,
      opis: 'Półmaska od producenta środków ochrony osobistej. Delta Plus przysyła ją nam do filmu.',
      spec: [['Klasa ochrony', 'FFP2']] } },
  { id: 'chusteczki', cat: 'higiena', level: 'basic', drobne: true, name: 'Chusteczki nawilżane i żel do rąk',
    why: 'Higiena bez bieżącej wody: przed jedzeniem, po toalecie i przed opatrunkiem.' },
  { id: 'higiena-podst', cat: 'higiena', level: 'basic', drobne: true, name: 'Szczoteczka, pasta i papier toaletowy',
    why: 'Drobiazgi, których najbardziej brakuje po pierwszej nocy poza domem. Papier spłaszcz, bez tulejki zajmie połowę miejsca.' },
  { id: 'intymne', cat: 'higiena', level: 'extended', drobne: true, name: 'Środki higieny intymnej',
    why: 'Na kilka dni poza domem, gdy sklepy są zamknięte albo puste.' },
  { id: 'worki', cat: 'higiena', level: 'extended', drobne: true, name: 'Worki na śmieci 60 l',
    why: 'Peleryna, podkładka pod siedzenie, worek na mokre rzeczy albo na odpadki.' },

  // ── Oliwkowa: Ochrona i nocleg ────────────────────────────
  { id: 'koc-nrc', cat: 'ochrona', level: 'basic', drobne: true, name: 'Koc ratunkowy NRC',
    why: 'Waży kilkadziesiąt gramów, a chroni przed wychłodzeniem, wiatrem i deszczem.' },
  { id: 'poncho', cat: 'ochrona', level: 'basic', name: 'Ponczo przeciwdeszczowe',
    why: 'Przykryje Ciebie razem z plecakiem i zajmuje mniej miejsca niż kurtka.',
    produkt: { nazwa: 'Ponczo-namiot', marka: 'Marabut', cena: null, partner: true,
      opis: 'Ponczo, które w razie potrzeby rozłożysz jako daszek. Testujemy je we współpracy z Marabut.' } },
  { id: 'rekawice', cat: 'ochrona', level: 'extended', name: 'Rękawice robocze',
    why: 'Ochronią dłonie przy gruzie, szkle, drewnie i ogniu.',
    produkt: { nazwa: 'Rękawice ocieplane powlekane lateksem', marka: 'Lahti PRO', cena: null,
      opis: 'Ocieplane rękawice robocze: chwyt na mokrym i ochrona przed zimnem. Model ustalamy z producentem.' } },
  { id: 'bielizna', cat: 'ochrona', level: 'extended', name: 'Bielizna i skarpety termoaktywne',
    why: 'Szybko schną, a suche skarpety to mniej otarć i mniej wychłodzenia.',
    produkt: { nazwa: 'Koszulka merino ze stójką', marka: 'Paterns', cena: null,
      opis: 'Koszulka ze 100% merino, szyta w Polsce. Merino grzeje nawet wilgotne i długo nie łapie zapachu. Resztę kompletu dobieramy.',
      spec: [['Materiał', '100% wełna merino'], ['Produkcja', 'Polska']] } },
  { id: 'spiwor', cat: 'ochrona', level: 'extended', outside: 'troczony pod plecakiem', name: 'Śpiwór',
    why: 'Noc poza domem bez śpiwora szybko odbiera siły, nawet latem.',
    produkt: { nazwa: 'Śpiwór SUPERLIGHT', marka: "Robert's", cena: null,
      opis: 'Lekki śpiwór, który zmieści się pod plecakiem. Model i wersję ustalamy z producentem.' } },
  { id: 'tarp', cat: 'ochrona', level: 'extended', outside: 'troczona razem ze śpiworem', name: 'Plandeka (tarp) i linka',
    why: 'Daszek nad głową w kilka minut. Linka przyda się też do suszenia i mocowania.',
    produkt: { nazwa: 'Plandeka VA0476 3 × 4 m', marka: 'Vayox', cena: 34.9, sprawdzono: '2026-11-07', partner: true, uwaga: 'linka osobno',
      opis: 'Lekka plandeka od naszego partnera Vayox. Z kodem PREP5 taniej o 5% na vayox.pl.',
      spec: [['Wymiary', '3 × 4 m'], ['Gramatura', '120 g/m²']] } },
  { id: 'czapka', cat: 'ochrona', level: 'extended', name: 'Czapka i komin',
    why: 'Przez głowę szybko ucieka ciepło, a komin osłoni też usta i nos przed pyłem i dymem.' },
  { id: 'okulary', cat: 'ochrona', level: 'pro', name: 'Okulary ochronne',
    why: 'Chronią oczy przed pyłem, odłamkami i dymem.' },
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
