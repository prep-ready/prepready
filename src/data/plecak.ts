/**
 * Plecak ewakuacyjny PrepReady: wersje, kategorie i zawartość.
 * Strona: /pl/plecak-ewakuacyjny/ (src/views/BagView.astro).
 *
 * Jak edytować:
 * - nowa rzecz: dopisz obiekt do `bagItems` (id musi być unikalne, bez spacji i polskich znaków),
 * - `level` mówi, od której wersji rzecz jest w plecaku: 'basic' = Podstawowy, 'extended' = Rozszerzony, 'pro' = Pro
 *   (każda wyższa wersja zawiera wszystko z niższych),
 * - `partner` wpisz tylko wtedy, gdy ten egzemplarz jest już w naszym plecaku testowym; bez partnera marka się nie pokazuje,
 * - `cat` to id kategorii z `bagCategories` (kategoria = jeden podpis na modelu 3D).
 * Cen celowo nie ma: dopiszemy je, gdy będą znane.
 */

export type BagLevel = 'basic' | 'extended' | 'pro';
export type BagVersionId = BagLevel | 'custom';

export interface BagCategory {
  id: string;
  /** Pełna nazwa (nagłówek na liście) */
  name: string;
  /** Krótki podpis na modelu 3D */
  short: string;
  /** Punkt na modelu 3D (jednostki sceny: korpus ma ok. 0,88 × 1,3 × 0,6, środek w 0,0,0, przód to +z, 1 jednostka ≈ 38 cm) */
  anchor: [number, number, number];
  /** Kierunek „na zewnątrz” w tym punkcie: podpis chowa się, gdy ta strona plecaka jest odwrócona od widza */
  normal: [number, number, number];
}

export interface BagItem {
  id: string;
  name: string;
  /** Jedno zdanie: po co to jest */
  why: string;
  cat: string;
  level: BagLevel;
  /** Marka egzemplarza, który już jest w naszym plecaku testowym */
  partner?: string;
  /** Model tego egzemplarza (pokazywany w pasku „Co już mamy w plecaku testowym”) */
  model?: string;
}

export const bagVersions: { id: BagVersionId; name: string; desc: string }[] = [
  { id: 'basic', name: 'Podstawowy', desc: 'Na 72 godziny dla jednej osoby. Lekki, do szybkiego wyjścia z domu.' },
  { id: 'extended', name: 'Rozszerzony', desc: 'Do tego filtr, ciepły posiłek i nocleg poza domem.' },
  { id: 'pro', name: 'Pro', desc: 'Na dłuższą ewakuację: łączność bez sieci, własny prąd i apteczka na poważne urazy.' },
  { id: 'custom', name: 'Własny', desc: 'Zaznacz rzeczy, które chcesz mieć w plecaku. Resztę pomijamy.' },
];

export const levelOrder: BagLevel[] = ['basic', 'extended', 'pro'];

export const bagCategories: BagCategory[] = [
  { id: 'plecak', name: 'Plecak', short: 'Plecak', anchor: [0.49, 0.14, -0.02], normal: [1, 0, 0] },
  { id: 'woda', name: 'Woda', short: 'Woda', anchor: [-0.49, -0.3, 0.0], normal: [-1, 0, 0] },
  { id: 'jedzenie', name: 'Jedzenie i gotowanie', short: 'Jedzenie', anchor: [-0.05, 0.385, 0.226], normal: [0, 0.15, 1] },
  { id: 'swiatlo', name: 'Światło i zasilanie', short: 'Światło', anchor: [0.1, 0.652, 0.08], normal: [0, 1, 0.3] },
  { id: 'apteczka', name: 'Apteczka i higiena', short: 'Apteczka', anchor: [0.06, 0.0, 0.352], normal: [0, 0, 1] },
  { id: 'ogien', name: 'Ogień i narzędzia', short: 'Ogień', anchor: [0.565, -0.52, -0.02], normal: [1, 0, 0.15] },
  { id: 'lacznosc', name: 'Łączność i orientacja', short: 'Łączność', anchor: [-0.17, 0.22, -0.445], normal: [-0.25, 0.05, -1] },
  { id: 'dokumenty', name: 'Dokumenty', short: 'Dokumenty', anchor: [0.0, -0.12, -0.262], normal: [0, 0, -1] },
  { id: 'schronienie', name: 'Schronienie i ubrania', short: 'Schronienie', anchor: [0.3, -0.55, 0.31], normal: [0.35, -0.2, 1] },
];

export const bagItems: BagItem[] = [
  // ── Podstawowy ────────────────────────────────────────────
  { id: 'plecak', cat: 'plecak', level: 'basic', partner: 'Wisport', model: 'Whistler II 35, graphite', name: 'Plecak',
    why: 'Wytrzymały, z pasem biodrowym: cały zestaw niesiesz na plecach, a ręce masz wolne.' },
  { id: 'jedzenie-3', cat: 'jedzenie', level: 'basic', partner: 'Lyofood', name: 'Jedzenie liofilizowane na 3 dni',
    why: 'Lekkie i trwałe przez lata. Wystarczy zalać wodą, w razie potrzeby nawet zimną.' },
  { id: 'czolowka', cat: 'swiatlo', level: 'basic', partner: 'Vayox', name: 'Czołówka',
    why: 'Światło tam, gdzie patrzysz, i dwie wolne ręce do pakowania czy opatrunku.' },
  { id: 'akumulatory', cat: 'swiatlo', level: 'basic', partner: 'everActive', name: 'Akumulatory i ładowarka',
    why: 'Zasilą czołówkę i radio, a ładowarkę podłączysz do powerbanku.' },
  { id: 'woda', cat: 'woda', level: 'basic', name: 'Woda 2 × 0,75 l w butelkach + tabletki do uzdatniania',
    why: 'Woda na pierwsze godziny, a tabletki zrobią pitną wodę z kranu, studni lub rzeki.' },
  { id: 'apteczka', cat: 'apteczka', level: 'basic', name: 'Apteczka podstawowa',
    why: 'Opatrunki, plastry, rękawiczki i środek do dezynfekcji na drobne urazy.' },
  { id: 'koc-nrc', cat: 'schronienie', level: 'basic', name: 'Koc ratunkowy NRC',
    why: 'Waży kilkadziesiąt gramów, a chroni przed wychłodzeniem, wiatrem i deszczem.' },
  { id: 'radio', cat: 'lacznosc', level: 'basic', name: 'Radio na baterie lub korbkę',
    why: 'Komunikaty RCB i służb usłyszysz także wtedy, gdy nie ma prądu ani zasięgu.' },
  { id: 'powerbank', cat: 'swiatlo', level: 'basic', name: 'Powerbank z kablem',
    why: 'Telefon to latarka, mapa i kontakt z rodziną, więc musi mieć z czego się ładować.' },
  { id: 'multitool', cat: 'ogien', level: 'basic', name: 'Multitool',
    why: 'Nóż, kombinerki i śrubokręt w jednym, do drobnych napraw i otwierania puszek.' },
  { id: 'ogien', cat: 'ogien', level: 'basic', name: 'Zapalniczka i krzesiwo',
    why: 'Zapalniczka na co dzień, krzesiwo, gdy zamoknie albo skończy się gaz.' },
  { id: 'poncho', cat: 'schronienie', level: 'basic', name: 'Poncho przeciwdeszczowe',
    why: 'Przykryje Ciebie razem z plecakiem i zajmuje mniej miejsca niż kurtka.' },
  { id: 'etui', cat: 'dokumenty', level: 'basic', name: 'Wodoodporne etui na dokumenty i gotówkę',
    why: 'Kopie dokumentów i gotówka przetrwają ulewę i przeprawę przez wodę.' },
  { id: 'ffp2', cat: 'apteczka', level: 'basic', name: 'Maseczki FFP2',
    why: 'Chronią przed pyłem i dymem oraz przed zakażeniem w zatłoczonym miejscu.' },
  { id: 'chusteczki', cat: 'apteczka', level: 'basic', name: 'Chusteczki nawilżane i żel do rąk',
    why: 'Higiena bez bieżącej wody: przed jedzeniem, po toalecie i przed opatrunkiem.' },
  { id: 'gwizdek', cat: 'lacznosc', level: 'basic', name: 'Gwizdek',
    why: 'Słychać go dalej niż głos i nie zdziera gardła, gdy wzywasz pomocy.' },
  { id: 'notes', cat: 'dokumenty', level: 'basic', name: 'Notes, ołówek i lista kontaktów',
    why: 'Gdy telefon padnie, numery bliskich masz na papierze. Ołówek pisze też na mokro.' },

  // ── Rozszerzony (dochodzi do Podstawowego) ───────────────
  { id: 'filtr', cat: 'woda', level: 'extended', name: 'Filtr do wody',
    why: 'Oczyszcza wodę z rzeki lub jeziora od razu, bez czekania, aż zadziałają tabletki.' },
  { id: 'kuchenka', cat: 'jedzenie', level: 'extended', name: 'Kuchenka z kartuszem i kubkiem',
    why: 'Wrzątek do liofilizatów i ciepły posiłek w kilka minut.' },
  { id: 'spiwor', cat: 'schronienie', level: 'extended', name: 'Śpiwór lub worek biwakowy',
    why: 'Noc poza domem bez śpiwora szybko odbiera siły, nawet latem.' },
  { id: 'tarp', cat: 'schronienie', level: 'extended', name: 'Plandeka (tarp) i linka',
    why: 'Daszek nad głową w kilka minut. Linka przyda się też do suszenia i mocowania.' },
  { id: 'rekawice', cat: 'ogien', level: 'extended', name: 'Rękawice robocze',
    why: 'Ochronią dłonie przy gruzie, szkle, drewnie i ogniu.' },
  { id: 'bielizna', cat: 'schronienie', level: 'extended', name: 'Bielizna i skarpety termoaktywne',
    why: 'Szybko schną, a suche skarpety to mniej otarć i mniej wychłodzenia.' },
  { id: 'latarka', cat: 'swiatlo', level: 'extended', name: 'Zapasowa latarka',
    why: 'Gdy czołówka się zgubi albo rozładuje, nie zostajesz po ciemku.' },
  { id: 'elektrolity', cat: 'woda', level: 'extended', name: 'Elektrolity',
    why: 'Uzupełniają sole przy upale, dużym wysiłku i biegunce.' },
  { id: 'tasma', cat: 'ogien', level: 'extended', name: 'Taśma naprawcza',
    why: 'Załata plandekę, but, plecak albo pęknięty pojemnik na wodę.' },
  { id: 'mapa', cat: 'lacznosc', level: 'extended', name: 'Mapa papierowa i kompas',
    why: 'Działają bez baterii i zasięgu. Zaznacz na mapie swoje trasy ewakuacji.' },
  { id: 'worki', cat: 'apteczka', level: 'extended', name: 'Worki na śmieci',
    why: 'Peleryna, podkładka pod siedzenie, worek na mokre rzeczy albo na odpadki.' },

  // ── Pro (dochodzi do Rozszerzonego) ──────────────────────
  { id: 'pmr', cat: 'lacznosc', level: 'pro', name: 'Krótkofalówki PMR',
    why: 'Kontakt z rodziną na kilka kilometrów, bez sieci komórkowej i bez opłat.' },
  { id: 'solar', cat: 'swiatlo', level: 'pro', name: 'Składany panel solarny',
    why: 'Doładuje powerbank w ciągu dnia, gdy prądu nie ma przez wiele dni.' },
  { id: 'duzy-powerbank', cat: 'swiatlo', level: 'pro', name: 'Duży powerbank',
    why: 'Kilka pełnych ładowań telefonu i radia. Mały zostaje pod ręką w kieszeni.' },
  { id: 'apteczka-pro', cat: 'apteczka', level: 'pro', name: 'Apteczka rozszerzona ze stazą taktyczną',
    why: 'Na silne krwawienia i poważne rany, gdy pomoc dociera później.' },
  { id: 'noz', cat: 'ogien', level: 'pro', name: 'Nóż z głownią stałą',
    why: 'Mocniejszy niż multitool: drewno na opał, liny i budowa schronienia.' },
  { id: 'filtr-pro', cat: 'woda', level: 'pro', name: 'Filtr wysokowydajny',
    why: 'Szybciej filtruje więcej wody, gdy korzysta z niego cała rodzina.' },
  { id: 'okulary', cat: 'ogien', level: 'pro', name: 'Okulary ochronne',
    why: 'Chronią oczy przed pyłem, odłamkami i dymem.' },
  { id: 'jedzenie-5', cat: 'jedzenie', level: 'pro', name: 'Zapas jedzenia na 5 dni',
    why: 'Dodatkowe posiłki na wypadek, gdy powrót do domu potrwa dłużej niż 72 godziny.' },
];

/** Rzeczy w danej wersji (Własny = wybór czytelnika, więc tu pusta lista). */
export function itemsFor(version: BagVersionId): BagItem[] {
  if (version === 'custom') return [];
  const max = levelOrder.indexOf(version);
  return bagItems.filter((i) => levelOrder.indexOf(i.level) <= max);
}

/** Odmiana słowa „rzecz” po polsku: 1 rzecz, 2 rzeczy, 5 rzeczy. */
export function rzeczy(n: number): string {
  return n === 1 ? 'rzecz' : 'rzeczy';
}
