/** Treści sekcji strony głównej, checklisty i sprzętu. Edytuj tu tekst — układ zostaje. */

export const steps = [
  { title: { pl: 'Woda i jedzenie na 3 dni', en: 'Water and food for 3 days' },
    body: { pl: '3 litry wody na osobę dziennie i jedzenie, które nie wymaga gotowania. Kupisz w jednym markecie.', en: 'About 3 litres of water per person per day and food that needs no cooking. One grocery run.' },
    meta: { pl: '≈ 1 h · od ok. 150 zł', en: '≈ 1 h · from about €35' } },
  { title: { pl: 'Plan kontaktu rodziny', en: 'Family contact plan' },
    body: { pl: 'Gdzie się spotykacie, kto jest osobą kontaktową spoza miasta, co robicie bez zasięgu.', en: 'Where you meet, who the out-of-town contact is, what you do with no signal.' },
    meta: { pl: '≈ 30 min · 0 zł', en: '≈ 30 min · free' } },
  { title: { pl: 'Plecak 72h przy drzwiach', en: '72-hour bag by the door' },
    body: { pl: 'Dokumenty, leki, latarka, radio, gotówka. Checklista pokaże, czego brakuje.', en: 'Documents, meds, flashlight, radio, cash. The checklist shows what is missing.' },
    meta: { pl: '≈ 2 h · od ok. 300 zł', en: '≈ 2 h · from about €70' } },
];

/** pickId łączy punkt z polecanym produktem z `picks`. */
export const checklist = [
  { id: 'water',   name: { pl: 'Woda pitna', en: 'Drinking water' }, qty: { pl: '9 l na osobę', en: '9 l per person' } },
  { id: 'food',    name: { pl: 'Jedzenie bez gotowania', en: 'No-cook food' }, qty: { pl: 'na 3 dni', en: 'for 3 days' } },
  { id: 'filter',  name: { pl: 'Filtr lub tabletki do uzdatniania wody', en: 'Water filter or purification tablets' }, qty: { pl: '1 szt.', en: '1' }, pickId: 'filter' },
  { id: 'light',   name: { pl: 'Latarka czołowa + zapasowe baterie', en: 'Headlamp + spare batteries' }, qty: { pl: '1 + 2 komplety', en: '1 + 2 sets' }, pickId: 'lamp' },
  { id: 'radio',   name: { pl: 'Radio na baterie lub korbkę (FM)', en: 'Battery or hand-crank radio (FM)' }, qty: { pl: '1 szt.', en: '1' }, pickId: 'radio' },
  { id: 'power',   name: { pl: 'Powerbank 20 000 mAh', en: '20,000 mAh power bank' }, qty: { pl: 'naładowany', en: 'charged' }, pickId: 'powerbank' },
  { id: 'meds',    name: { pl: 'Apteczka + stale przyjmowane leki', en: 'First-aid kit + regular medication' }, qty: { pl: 'leki na 7 dni', en: '7 days of meds' }, pickId: 'firstaid' },
  { id: 'tool',    name: { pl: 'Multitool lub scyzoryk', en: 'Multitool or pocket knife' }, qty: { pl: '1 szt.', en: '1' }, pickId: 'multitool' },
  { id: 'docs',    name: { pl: 'Kopie dokumentów w wodoszczelnym etui', en: 'Document copies in a waterproof pouch' }, qty: { pl: 'dowód, akty, polisy', en: 'ID, deeds, policies' } },
  { id: 'cash',    name: { pl: 'Gotówka w drobnych nominałach', en: 'Cash in small notes' }, qty: { pl: 'na kilka dni', en: 'for a few days' } },
  { id: 'warm',    name: { pl: 'Folia NRC i ciepła warstwa', en: 'Emergency blanket and a warm layer' }, qty: { pl: 'na osobę', en: 'per person' }, pickId: 'warm' },
];

/**
 * Polecenia afiliacyjne. `url.pl` / `url.en` — link partnerski dla danej wersji językowej;
 * pusty = przycisk prowadzi do strony sprzętu. PL i EN nie mieszamy (polskie sklepy tylko w PL).
 * Ceny z 11.10.2026 — sprawdzaj co kwartał.
 */
const PP = '?tracking=6TjpudogVnmAPlRLSfPdnIfOPpA5HuKEKdfTanbx';
export const picks = [
  { id: 'filter', icon: 'filter', url: { pl: 'https://www.prepersi.eu/sklep/survival/systemy-uzdatniania-wody/filtr-do-wody-sawyer-mini-black' + PP, en: '' },
    title: { pl: 'Filtr do wody Sawyer Mini', en: '0.1-micron squeeze filter' }, why: { pl: '0,1 µm, 57 g — mieści się w kieszeni', en: 'Small, light, no chemicals' }, price: { pl: 'ok. 269 zł', en: 'from about €35' } },
  { id: 'lamp', icon: 'lamp', url: { pl: 'https://www.prepersi.eu/sklep/oswietlenie/latarki/Latarka-czolowa-Armytek-Wizard-C2-Pro-Magnet-USB-White' + PP, en: '' },
    title: { pl: 'Latarka czołowa Armytek Wizard C2 Pro', en: 'USB-C headlamp' }, why: { pl: 'Ładowana przez USB, wodoszczelna, z magnesem', en: 'Hands-free, charges from a power bank' }, price: { pl: 'ok. 419 zł', en: 'from about €25' } },
  { id: 'radio', icon: 'radio', url: { pl: 'https://www.prepersi.eu/sklep/Blackout-zestawy-i-sprzet-na-brak-pradu/Radio-awaryjne-Fosco-Outdoormen-Edition-Solar-Dynamo' + PP, en: '' },
    title: { pl: 'Radio awaryjne Fosco (solar, dynamo)', en: 'FM crank radio with light' }, why: { pl: 'FM/AM, korbka i panel — działa bez prądu', en: 'Works without power or mobile network' }, price: { pl: 'ok. 159 zł', en: 'from about €35' } },
  { id: 'powerbank', icon: 'bolt', url: { pl: 'https://www.prepersi.eu/sklep/Blackout-zestawy-i-sprzet-na-brak-pradu/powerbank-solarny-xtorm-rugged-10000-mah-20w' + PP, en: '' },
    title: { pl: 'Powerbank solarny Xtorm Rugged 10 000 mAh', en: 'Rugged power bank' }, why: { pl: 'IP65, panel słoneczny do doładowania', en: 'Keeps your phone alive for days' }, price: { pl: 'ok. 429 zł', en: 'from about €40' } },
  { id: 'firstaid', icon: 'cross', url: { pl: 'https://webep1.com/go/f2bc99c8d6', en: '' },
    title: { pl: 'Gotowe apteczki w i-APTEKA.pl', en: 'Ready-made first-aid kit' }, why: { pl: 'Dobra baza — dołóż swoje leki i opatrunki', en: 'A base kit — add your own meds' }, price: { pl: 'różne ceny', en: 'various prices' } },
  { id: 'multitool', icon: 'bag', url: { pl: 'https://webep1.com/go/3a5ece27d6', en: '' },
    title: { pl: 'Multitool Leatherman Wingman', en: 'Multitool' }, why: { pl: 'Kombinerki, nóż, nożyczki i śrubokręty w jednym', en: 'Pliers, knife, scissors in one tool' }, price: { pl: 'ok. 349 zł', en: 'from about €60' } },
  { id: 'warm', icon: 'shelter', url: { pl: 'https://webep1.com/go/33518e41d6', en: '' },
    title: { pl: 'Kurtki softshell w Tramp4', en: 'Softshell jacket' }, why: { pl: 'Ciepła, wiatroodporna warstwa na ewakuację', en: 'Warm, windproof layer' }, price: { pl: 'różne ceny', en: 'various prices' } },
];

/** Tabela testu. sample=true dopóki nie wpiszesz prawdziwych pomiarów. */
export const gearTest = {
  sample: true,
  rows: [
    { model: 'Model A · 1 kWh LiFePO₄', badge: { pl: 'Najlepszy ogólnie', en: 'Best overall' }, cap: 912, charge: 1.2, phone: 61, score: 8.9, price: { pl: 3499, en: 799 } },
    { model: 'Model B · 512 Wh', badge: { pl: 'Najlepszy do mieszkania', en: 'Best for flats' }, cap: 468, charge: 1.0, phone: 31, score: 8.4, price: { pl: 1899, en: 429 } },
    { model: 'Model C · 2 kWh', badge: { pl: 'Na dłuższe awarie', en: 'For long outages' }, cap: 1790, charge: 1.8, phone: 119, score: 8.1, price: { pl: 6299, en: 1449 } },
    { model: 'Model D · 300 Wh', badge: { pl: 'Budżetowy', en: 'Budget' }, cap: 254, charge: 2.5, phone: 17, score: 6.7, price: { pl: 999, en: 229 } },
  ],
};

export const sourcesMonitored = {
  pl: ['IMGW · GDACS', 'PSE', 'CERT Polska', 'ECDC', 'GDELT · Google News (PL)', 'PAA (ręcznie)'],
  en: ['GDACS', 'ECDC', 'GDELT · Google News', 'IAEA (manual)'],
};

/** Tematy poradników na stronie głównej (kolejność = kolejność kafelków). */
export const guideTopics = [
  { cluster: 'blackout',   icon: 'bolt' },
  { cluster: 'shelter',    icon: 'shelter' },
  { cluster: 'water-food', icon: 'food' },
  { cluster: 'evacuation', icon: 'siren' },
  { cluster: 'bag',        icon: 'bag' },
  { cluster: 'first-aid',  icon: 'cross' },
] as const;
