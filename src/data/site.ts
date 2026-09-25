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
  { id: 'power',   name: { pl: 'Powerbank 20 000 mAh', en: '20,000 mAh power bank' }, qty: { pl: 'naładowany', en: 'charged' } },
  { id: 'meds',    name: { pl: 'Apteczka + stale przyjmowane leki', en: 'First-aid kit + regular medication' }, qty: { pl: 'leki na 7 dni', en: '7 days of meds' } },
  { id: 'docs',    name: { pl: 'Kopie dokumentów w wodoszczelnym etui', en: 'Document copies in a waterproof pouch' }, qty: { pl: 'dowód, akty, polisy', en: 'ID, deeds, policies' } },
  { id: 'cash',    name: { pl: 'Gotówka w drobnych nominałach', en: 'Cash in small notes' }, qty: { pl: 'na kilka dni', en: 'for a few days' } },
  { id: 'warm',    name: { pl: 'Folia NRC i ciepła warstwa', en: 'Emergency blanket and a warm layer' }, qty: { pl: 'na osobę', en: 'per person' } },
];

/** Polecenia afiliacyjne. `url` uzupełnisz linkiem partnerskim; pusty = przycisk prowadzi do strony sprzętu. */
export const picks = [
  { id: 'filter', icon: 'filter', url: '', title: { pl: 'Filtr grawitacyjny 0,1 µm', en: '0.1-micron squeeze filter' }, why: { pl: 'Mały, lekki, bez chemii', en: 'Small, light, no chemicals' }, price: { pl: 'od ok. 140 zł', en: 'from about €35' } },
  { id: 'radio',  icon: 'radio',  url: '', title: { pl: 'Radio FM z korbką i latarką', en: 'FM crank radio with light' }, why: { pl: 'Działa bez prądu i sieci komórkowej', en: 'Works without power or mobile network' }, price: { pl: 'od ok. 150 zł', en: 'from about €35' } },
  { id: 'lamp',   icon: 'lamp',   url: '', title: { pl: 'Latarka czołowa USB-C', en: 'USB-C headlamp' }, why: { pl: 'Wolne ręce, ładowanie z powerbanku', en: 'Hands-free, charges from a power bank' }, price: { pl: 'od ok. 90 zł', en: 'from about €25' } },
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
