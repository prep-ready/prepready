/** Poziomy indeksu i rekomendacje działań. Kolor = token CSS --l1..--l5. */
export const levels = [
  { max: 20,  token: '--l1', name: { pl: 'Spokój', en: 'Calm' },
    todo: { pl: ['Utrzymuj zapas wody i jedzenia na 72 godziny', 'Raz na kwartał sprawdź daty ważności', 'Zapisz się na alerty RSO'],
            en: ['Keep 72 hours of water and food', 'Check expiry dates once a quarter', 'Sign up for official local alerts'] } },
  { max: 40,  token: '--l2', name: { pl: 'Czujność', en: 'Watchful' },
    todo: { pl: ['Uzupełnij braki z checklisty plecaka 72h', 'Ustal rodzinny plan kontaktu', 'Sprawdź najbliższe miejsce ukrycia'],
            en: ['Fill the gaps on the 72-hour checklist', 'Agree a family contact plan', 'Find your nearest shelter'] } },
  { max: 60,  token: '--l3', name: { pl: 'Podwyższone', en: 'Elevated' },
    todo: { pl: ['Zapas wody i jedzenia na 7–14 dni', 'Gotówka w drobnych nominałach na 3 dni', 'Naładowane powerbanki i pełny bak', 'Rodzinny plan kontaktu — sprawdź, czy wszyscy go znają'],
            en: ['7–14 days of water and food', '3 days of cash in small notes', 'Charged power banks and a full tank', 'Family contact plan — check everyone knows it'] } },
  { max: 80,  token: '--l4', name: { pl: 'Wysokie', en: 'High' },
    todo: { pl: ['Plecak ewakuacyjny przy drzwiach', 'Znana trasa ewakuacji i punkt spotkania', 'Radio na baterie włączone na komunikaty'],
            en: ['Go-bag by the door', 'Known evacuation route and meeting point', 'Battery radio on for announcements'] } },
  { max: 100, token: '--l5', name: { pl: 'Krytyczne', en: 'Critical' },
    todo: { pl: ['Postępuj wyłącznie według komunikatów RCB, RSO i służb', 'Nie rozpowszechniaj niesprawdzonych informacji'],
            en: ['Follow official instructions only', 'Do not share unverified information'] } },
] as const;

export const levelFor = (score: number) => levels.find((l) => score <= l.max) ?? levels[levels.length - 1];
export const levelIndex = (score: number) => levels.findIndex((l) => score <= l.max);
export const tokenFor = (v: number) => levelFor(v).token;
