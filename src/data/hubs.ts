/**
 * Strony tematów (huby): /pl/poradniki/temat/<slug>/ i /en/guides/topic/<slug>/.
 * Zbierają wszystkie poradniki z jednego tematu (pole `cluster` w artykule) i linkują do narzędzi.
 * Hub powstaje, gdy temat ma co najmniej 2 poradniki w danym języku albo ma `always: true`.
 */
import type { Lang } from '../i18n/ui';

type Cluster = 'bag' | 'water-food' | 'shelter' | 'blackout' | 'evacuation' | 'first-aid' | 'law';
type HubText = { slug: string; title: string; h1: string; desc: string; intro: string[]; start: string };

export const hubs: Record<Cluster, { always?: Lang[]; pl: HubText; en: HubText }> = {
  bag: {
    pl: {
      slug: 'plecak-ewakuacyjny',
      title: 'Plecak ewakuacyjny: wszystkie poradniki',
      h1: 'Plecak ewakuacyjny: co spakować, jaki wybrać, jak przechowywać',
      desc: 'Wszystko o plecaku ewakuacyjnym na 72 godziny: lista rzeczy według MSWiA, porównanie gotowych zestawów, waga i miejsce przechowywania.',
      intro: [
        'Plecak ewakuacyjny to pierwsza rzecz, którą warto przygotować, bo przydaje się przy każdym scenariuszu: pożarze bloku, powodzi, ewakuacji z powodu awarii przemysłowej i alarmie wojskowym. Zalecenia MSWiA i RCB mówią o zapasie na 72 godziny dla każdej osoby w domu.',
        'Poradniki w tym temacie prowadzą od listy rzeczy, przez wybór samego plecaka, po gotowe zestawy. Interaktywna checklista zapisuje w przeglądarce, co już masz, więc możesz kompletować plecak stopniowo.',
      ],
      start: 'Jeśli zaczynasz od zera, przeczytaj najpierw listę rzeczy, a potem odhacz je w checkliście 72h.',
    },
    en: {
      slug: 'go-bags',
      title: 'Go-bags: all guides',
      h1: 'Go-bags: what to pack, how to choose one and where to keep it',
      desc: 'Everything about a 72-hour go-bag: a packing list based on official guidance, weight, ready-made kits and where to store it.',
      intro: [
        'A go-bag is the first thing worth preparing because it helps in almost every scenario: a building fire, a flood, an evacuation after an industrial accident or an air-raid alert. Official guidance in most countries asks for 72 hours of supplies per person.',
        'The guides in this topic take you from the packing list to the bag itself. The interactive checklist remembers in your browser what you already have, so you can build the bag step by step.',
      ],
      start: 'Starting from scratch? Read the packing list first, then tick items off in the 72-hour checklist.',
    },
  },
  'water-food': {
    pl: {
      slug: 'woda-i-zywnosc',
      title: 'Zapas wody i żywności: wszystkie poradniki',
      h1: 'Zapas wody i żywności na kryzys: ile, co kupić, jak przechowywać',
      desc: 'Poradniki o zapasie wody i jedzenia: ile litrów na osobę, konserwy, jedzenie bez gotowania, kuchenka turystyczna, filtry i ratowanie jedzenia bez prądu.',
      intro: [
        'Woda i jedzenie to podstawa każdego zapasu. MSWiA zaleca co najmniej 3 dni samowystarczalności, a w praktyce warto mieć zapas na tydzień lub dwa: wodę pitną, żywność, którą da się zjeść bez gotowania, i sposób, żeby coś podgrzać, gdy nie ma prądu ani gazu.',
        'W tym temacie znajdziesz wyliczenia ilości na osobę, listy zakupów, zasady rotacji zapasu, porównanie filtrów do wody i poradnik, jak bezpiecznie gotować na kuchence turystycznej w mieszkaniu.',
      ],
      start: 'Zacznij od wyliczenia, ile wody i jedzenia potrzebuje Twoja rodzina, a potem dokupuj produkty z listy przy zwykłych zakupach.',
    },
    en: {
      slug: 'water-and-food',
      title: 'Emergency water and food: all guides',
      h1: 'Emergency water and food supply: how much, what to buy, how to store it',
      desc: 'Guides on emergency water and food: litres per person, canned food, camping stoves, food safety in a power cut and how to rotate your stock.',
      intro: [
        'Water and food are the core of any emergency supply. Official guidance asks for at least three days of self-sufficiency, and two weeks is a more comfortable target: drinking water, food you can eat without cooking and a safe way to heat a meal without power or gas.',
        'This topic covers quantities per person, shopping lists, stock rotation, food safety when the fridge goes off and how to cook indoors on a camping stove without risking carbon monoxide.',
      ],
      start: 'Start by working out how much water and food your household needs, then add items to your normal weekly shop.',
    },
  },
  shelter: {
    always: ['pl'],
    pl: {
      slug: 'schrony',
      title: 'Schrony i miejsca ukrycia: poradniki i mapa',
      h1: 'Schrony i miejsca ukrycia: gdzie się schować i jak znaleźć najbliższy schron',
      desc: 'Mapa schronów w Polsce z bazy PSP, strony dla 22 miast, poradnik o schronie w bloku i co zrobić po usłyszeniu syreny.',
      intro: [
        'W Polsce jest niewiele schronów w ścisłym znaczeniu. Państwowa Straż Pożarna wskazała natomiast ponad 80 tysięcy miejsc doraźnego schronienia: piwnic, garaży podziemnych, przejść podziemnych i stacji metra. Mapa PrepReady pokazuje je wszystkie i liczy odległość od Twojego adresu.',
        'Poniżej znajdziesz poradnik o ukryciu w bloku i w domu oraz osobne strony dla największych miast, z liczbą punktów, podziałem na dostępność i przykładowymi adresami czynnymi całą dobę.',
      ],
      start: 'Sprawdź na mapie najbliższy punkt dla domu, pracy i szkoły dzieci, a potem przeczytaj, co zrobić, jeśli jest za daleko.',
    },
    en: {
      slug: 'shelter',
      title: 'Shelter: all guides',
      h1: 'Shelter: where to take cover at home and in a flat',
      desc: 'Guides on sheltering in place: choosing a room, sealing it and what to keep there.',
      intro: ['Where to take cover in a flat or a house, how to seal a room and what to keep in it.'],
      start: 'Pick your shelter room today and keep water and a radio there.',
    },
  },
  blackout: {
    pl: {
      slug: 'blackout',
      title: 'Blackout: wszystkie poradniki',
      h1: 'Blackout: jak przygotować dom na kilka dni bez prądu',
      desc: 'Poradniki na blackout: przygotowanie mieszkania i domu, powerbank czy stacja zasilania, agregat prądotwórczy, radio na korbkę i jedzenie bez lodówki.',
      intro: [
        'Długi brak prądu to jeden z najbardziej prawdopodobnych kryzysów: wystarczy wichura, oblodzenie linii, atak na sieć albo awaria systemowa. Bez prądu przestaje działać ogrzewanie, lodówka, ładowanie telefonu, a w wysokich blokach także pompy wody i windy.',
        'W tym temacie dobierzesz źródło energii do potrzeb (powerbank, stacja zasilania, agregat), zaplanujesz oświetlenie, łączność przez radio i sposób, żeby nie stracić zawartości lodówki.',
      ],
      start: 'Zacznij od ogólnego planu na blackout, a potem policz, ile energii naprawdę potrzebujesz.',
    },
    en: {
      slug: 'blackouts',
      title: 'Blackouts: all guides',
      h1: 'Blackouts: how to prepare your home for days without power',
      desc: 'Blackout guides: preparing your home, backup power, lighting, radio and keeping food safe without a fridge.',
      intro: [
        'A long power cut is one of the most likely emergencies: a storm, iced power lines, an attack on the grid or a system failure is enough. Without power you lose heating, the fridge, phone charging and, in tall buildings, water pumps and lifts.',
        'This topic helps you plan backup power, lighting and communication, and keep your food safe until the power comes back.',
      ],
      start: 'Start with the general blackout plan, then work out how much power you really need.',
    },
  },
  evacuation: {
    pl: {
      slug: 'ewakuacja-i-alarmy',
      title: 'Ewakuacja, alarmy i łączność: wszystkie poradniki',
      h1: 'Ewakuacja, syreny i alerty: co robić, gdy ogłoszą alarm',
      desc: 'Sygnały alarmowe, Alert RCB i aplikacja RSO, plan ewakuacji rodziny, co robić w razie wojny i jak chronić dzieci w szkole.',
      intro: [
        'O zagrożeniu dowiesz się z syren, Alertu RCB na telefonie, radia albo aplikacji RSO. Najważniejsze jest to, żeby rozpoznać sygnał i wiedzieć, co zrobić w pierwszych minutach, zanim pojawi się panika.',
        'Poradniki w tym temacie wyjaśniają znaczenie syren, działanie alertów, przygotowanie planu ewakuacji dla całej rodziny i zachowanie w razie konfliktu zbrojnego, także z perspektywy dzieci w szkole.',
      ],
      start: 'Naucz się rozpoznawać sygnały alarmowe i w jeden wieczór przygotuj plan ewakuacji z rodziną.',
    },
    en: {
      slug: 'evacuation',
      title: 'Evacuation and alerts: all guides',
      h1: 'Evacuation and alerts: what to do when an alarm sounds',
      desc: 'Guides on evacuation plans, family communication and emergency alerts.',
      intro: ['How to make a family emergency plan, agree on meeting points and stay in touch when phone networks are down.'],
      start: 'Make a family emergency plan in one evening.',
    },
  },
  'first-aid': {
    pl: {
      slug: 'pierwsza-pomoc',
      title: 'Pierwsza pomoc i apteczka: wszystkie poradniki',
      h1: 'Pierwsza pomoc na czas kryzysu: apteczka, leki i jodek potasu',
      desc: 'Apteczka domowa i ewakuacyjna, zapas leków i jodek potasu: kiedy go brać, kto nie powinien i gdzie go dostać.',
      intro: [
        'W kryzysie pomoc medyczna może dotrzeć z opóźnieniem, a apteki bywają zamknięte. Dobrze skompletowana apteczka i zapas leków przyjmowanych na stałe to podstawa, a wiedza o tym, kiedy NIE brać jodku potasu, jest równie ważna jak to, kiedy go wziąć.',
        'Poradniki w tym temacie oparte są na zaleceniach MSWiA, Ministerstwa Zdrowia i GIS. Nie zastępują porady lekarza ani farmaceuty.',
      ],
      start: 'Zacznij od sprawdzenia domowej apteczki według naszej listy.',
    },
    en: {
      slug: 'first-aid',
      title: 'First aid: all guides',
      h1: 'First aid for emergencies: kits, medication and potassium iodide',
      desc: 'Home and go-bag first aid kits, spare medication and potassium iodide: when to take it and who should not.',
      intro: [
        'In a crisis, medical help may be delayed and pharmacies may be closed. A well-stocked first aid kit and a supply of regular medication are the basics, and knowing when NOT to take potassium iodide matters as much as knowing when to take it.',
        'These guides follow official public-health guidance and do not replace advice from a doctor or pharmacist.',
      ],
      start: 'Start by checking your home first aid kit against our list.',
    },
  },
  law: {
    pl: {
      slug: 'prawo-i-bezpieczenstwo',
      title: 'Prawo i bezpieczeństwo: poradniki',
      h1: 'Prawo i bezpieczeństwo: przepisy i pozwolenia',
      desc: 'Przepisy, pozwolenia i obowiązki obywatela na czas kryzysu.',
      intro: ['Przepisy, pozwolenia i obowiązki obywatela na czas kryzysu.'],
      start: '',
    },
    en: {
      slug: 'law-and-safety',
      title: 'Law and safety: guides',
      h1: 'Law and safety: rules and permits',
      desc: 'Rules, permits and civic duties in a crisis.',
      intro: ['Rules, permits and civic duties in a crisis.'],
      start: '',
    },
  },
};

export const hubBase = { pl: '/pl/poradniki/temat/', en: '/en/guides/topic/' } as const;
export const hubHref = (cluster: Cluster, lang: Lang) => `${hubBase[lang]}${hubs[cluster][lang].slug}/`;
/** Czy hub ma sens: co najmniej 2 poradniki albo wymuszony dla języka (schrony PL: mapa + strony miast). */
export const hubExists = (cluster: Cluster, lang: Lang, count: number) => count >= 2 || !!hubs[cluster].always?.includes(lang);
