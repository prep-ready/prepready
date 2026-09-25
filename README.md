# PrepReady — serwis w Astro

Statyczna strona (PL + EN): Indeks gotowości, feed wiadomości, poradniki, checklista 72h, testy sprzętu.
Brak bazy danych i wtyczek — cały serwis to pliki w tym folderze.

## Uruchomienie

```bash
npm install
npm run dev      # podgląd na http://localhost:4321/pl/
npm run build    # gotowa strona w folderze dist/
```

## Gdzie co edytować

| Chcesz zmienić | Plik |
| --- | --- |
| Artykuł / poradnik | `src/content/articles/pl/*.md` i `src/content/articles/en/*.md` |
| Wynik indeksu, składowe, historia | `src/data/readiness.json` (aktualizuje skrypt codziennie) |
| Wiadomości w feedzie | `src/data/feed.json` (aktualizuje skrypt codziennie) |
| Sposób liczenia indeksu | `scripts/update-data.mjs` |
| Poziomy indeksu i rekomendacje „co zrobić” | `src/data/levels.ts` |
| 3 kroki, checklista, polecane produkty, tabela testu | `src/data/site.ts` |
| Teksty interfejsu (przyciski, nagłówki) i adresy sekcji | `src/i18n/ui.ts` |
| „O nas”, „Jak zarabiamy” | `src/views/SimpleViews.ts` |
| Kolory, fonty | `src/styles/global.css` (tokeny na górze) |
| Logo | `src/components/Logo.astro`, `public/favicon.svg` |

## Nowy artykuł

1. Utwórz `src/content/articles/pl/moj-slug.md` — nazwa pliku = adres (`/pl/poradniki/moj-slug/`).
2. Skopiuj nagłówek (frontmatter) z `plecak-ewakuacyjny.md` i zmień pola.
3. Wersja angielska: plik w `en/` z **tym samym `translationKey`** — strony połączą się przełącznikiem języka i `hreflang`.
4. `draft: true` ukrywa tekst w wersji produkcyjnej.
5. Pole `cluster` przypisuje tekst do jednego z 6 tematów; `kind: pillar` = tekst główny tematu (pokazywany na kafelku).

## Etykieta „Dane przykładowe”

`sample: true` w `readiness.json`, `feed.json` i `gearTest` (w `site.ts`) wyświetla etykietę. Po podłączeniu prawdziwych danych ustaw `false`.

## Afiliacja

W `src/data/site.ts` → `picks[].url` wstaw link partnerski. Linki mają `rel="sponsored"`, a przy produktach jest informacja o prowizji.

## Newsletter

W `src/components/Newsletter.astro` ustaw `ACTION` na adres formularza z MailerLite/Beehiiv. Do tego czasu formularz pokazuje komunikat „wkrótce”.

## Automatyzacja za 0 zł (zamiast n8n)

Codziennie o ok. 6:47 GitHub Actions uruchamia `scripts/update-data.mjs`, zapisuje nowe dane, buduje stronę i wysyła ją FTP-em na Hostingera. Każda Twoja zmiana w repozytorium (np. nowy artykuł) też od razu publikuje stronę.

| Składowa | Źródło (bezpłatne) | Tryb |
| --- | --- | --- |
| Konflikt w regionie | GDELT, a gdy nie odpowiada — Google News RSS | auto |
| Cyber i łączność | GDELT / Google News + CERT Polska RSS | auto |
| Energia | PSE — komunikat o zalecanym użytkowaniu mocy | auto |
| Pogoda i żywioły | IMGW (ostrzeżenia meteo) + GDACS | auto |
| Zdrowie publiczne | ECDC RSS | auto |
| Nuklearne i radiacja | PAA / EURDEP — brak prostego API | ręcznie (`mode: "manual"`) |

Jeśli któreś źródło nie odpowie, składowa zachowuje wczorajszą wartość i dostaje dopisek „brak świeżych danych”.

### Jednorazowa konfiguracja (ok. 15 min)

1. Załóż darmowe konto na github.com i nowe repozytorium `prepready` (może być prywatne).
2. Wgraj do niego zawartość tego folderu (bez `node_modules` i `dist`) — przez „Add file → Upload files” albo GitHub Desktop.
3. W Hostingerze: hPanel → Pliki → Konta FTP — sprawdź host, login i ustaw hasło.
4. W repozytorium: Settings → Secrets and variables → Actions → New repository secret. Dodaj trzy sekrety: `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`. Wpisujesz je sama — nie wklejaj ich nikomu, także do czatu.
5. Zakładka Actions → „Aktualizacja i publikacja” → Run workflow. Po 2–3 minutach strona jest na prepready.pro.

Jeśli konto FTP w Hostingerze od razu wskazuje na folder `public_html`, zmień w `.github/workflows/update.yml` wartość `server-dir` na `./`.

## Publikacja ręczna na Hostingerze (bez GitHuba)

1. **Zrób kopię obecnego WordPressa** (hPanel → Kopie zapasowe) — na wszelki wypadek.
2. `npm run build`.
3. W Menedżerze plików opróżnij `public_html` (albo przenieś stare pliki do folderu `_wp_backup`).
4. Wgraj **zawartość** folderu `dist/` do `public_html` (razem z ukrytym `.htaccess`).
5. `.htaccess` przekierowuje stare adresy WordPressa (301) na nowe strony i blokuje `wp-admin`.
6. W Google Search Console zgłoś nową mapę strony: `https://prepready.pro/sitemap-index.xml`.

Alternatywa na później: repozytorium GitHub + automatyczny deploy (Hostinger Git, Cloudflare Pages lub Netlify) — każda zmiana w pliku publikuje się sama.

## Następne kroki

- [ ] Konfiguracja GitHub + sekrety FTP (patrz wyżej)
- [ ] 6 tekstów filarowych PL + EN
- [ ] Prawdziwe zdjęcia i testy sprzętu
- [ ] Biogramy redakcji i konsultantów
- [ ] Umowy afiliacyjne z producentami i sklepami
