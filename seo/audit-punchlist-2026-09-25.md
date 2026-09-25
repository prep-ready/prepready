# PrepReady — lista rzeczy do zrobienia poza kodem (audyt SEO)

Audyt OpenSEO, 25.09.2026, 34 przeskanowane strony. Te punkty nie dają się naprawić w repozytorium.

## 1. Pilne: pamięć podręczna Hostingera nadal pokazuje stary WordPress pod adresem prepready.pro/

- Typy problemów: `broken-internal-link` (krytyczny), `broken-page` 404, `missing-h1`, `title-too-short` („Home -”), `meta-description-too-long` (323 znaki, tekst demo motywu).
- Wszystkie dotyczą strony głównej `https://prepready.pro/`. CDN Hostingera (`x-hcdn-cache-status: HIT`) i LiteSpeed Cache (`x-litespeed-cache: hit`) serwują zapisaną kopię starej strony WordPress sprzed przebudowy. Nowa strona jest poprawna (`/pl/`, `/en/`), ale Google i odwiedzający wchodzący na sam adres domeny widzą starą.
- Co zrobić (Ty, w hPanelu):
  1. hPanel → Strony → prepready.pro → **Wydajność → CDN → Wyczyść całą pamięć podręczną** (Purge all).
  2. Jeśli jest opcja **LiteSpeed Cache / Pamięć podręczna** w sekcji Zaawansowane — wyczyść ją także.
  3. Sprawdź w trybie incognito: `prepready.pro` ma przekierować na `prepready.pro/pl/`.
- Kto: właścicielka konta Hostinger.

## 2. Google Search Console

- Stara strona miała weryfikację GSC metatagiem. Dodałam ten sam metatag do nowej strony, ale adres główny przekierowuje na `/pl/`, więc weryfikacja może się zgubić.
- Co zrobić: w GSC dodaj usługę typu **Domena** (weryfikacja rekordem TXT w DNS Hostingera). Potem zgłoś mapę strony `https://prepready.pro/sitemap-index.xml`.

## 3. Wydajność — nie oceniono

- Lighthouse nie uruchomił się w tym audycie (0 z 0 pomiarów), więc nie ma danych o szybkości stron. To brak pomiaru, a nie wynik „bez problemów”.
- Co zrobić: sprawdzić ręcznie w https://pagespeed.web.dev/ dla `/pl/` i jednego poradnika.
