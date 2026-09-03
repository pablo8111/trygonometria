# Trygonometria — interaktywny kurs dla liceum

Statyczna witryna do nauki trygonometrii na poziomie I klasy liceum
(profil matematyczno-fizyczny), po polsku. Dziewięć modułów, każdy z ruchomymi
rysunkami na `<canvas>` i generatorem zadań ze sprawdzaniem odpowiedzi.

## Moduły

| # | Plik | Zawartość | Interakcje |
|---|------|-----------|------------|
| 01 | `katy.html` | miara stopniowa i łukowa, kąt skierowany, łuk i wycinek | kąt skierowany ze spiralą obrotów, wizualizacja definicji radiana, kalkulator zamiany |
| 02 | `trojkat.html` | definicje sin/cos/tg/ctg, podobieństwo, wartości 30/45/60 | trójkąt z przeciąganym wierzchołkiem, figury 45° i 30/60°, solver trójkąta prostokątnego |
| 03 | `kolo.html` | definicja na kole jednostkowym, znaki, okresowość | koło z przeciąganym punktem, tangens jako odcinek na prostej x = 1, pełna tabela wartości |
| 04 | `wykresy.html` | sinusoida, cosinusoida, tangensoida, przekształcenia | animowane „rozwijanie” okręgu w falę, laboratorium `a·f(b(x−c))+d` |
| 05 | `tozsamosci.html` | jedynka, wzory redukcyjne, sumy kątów, kąt podwojony | słupek sin²+cos², reduktor wzorów, sprawdzacz jedenastu tożsamości |
| 06 | `rownania.html` | równania i nierówności podstawowe | rozwiązania na kole i na wykresie równolegle, łuk zbioru rozwiązań |
| 07 | `twierdzenia.html` | tw. sinusów, tw. cosinusów, pole, okrąg opisany | trójkąt z trzema przeciąganymi wierzchołkami i weryfikacją obu twierdzeń, solver (bbb/bkb/kbk/bbk) |
| 08 | `trening.html` | losowe zadania z całości, 3 poziomy | bank ~20 generatorów, statystyki skuteczności po działach |
| 09 | `sciagawka.html` | wszystkie wzory na jednej stronie | tabele generowane z kodu, arkusz do druku |

## Architektura

Zero zależności, zero kroku budowania — czysty HTML, CSS i JavaScript.

- `public/assets/app.js` — wspólna warstwa (globalny obiekt `TR`):
  - `TR.Plot` — cienka nakładka na `<canvas>`: układ współrzędnych, siatka, osie,
    wykresy funkcji z obsługą asymptot, przeciąganie wskaźnikiem (mysz i palec),
    obsługa HiDPI i zmiany rozmiaru okna;
  - `TR.quiz` — silnik zestawów zadań (pytania zamknięte i otwarte, wyjaśnienia,
    ocenianie, zapis postępu);
  - `TR.exact` / `TR.radPiText` / `TR.fracHTML` — wartości dokładne i zapis ułamków;
  - `TR.chrome` — pasek nawigacji, stopka i nawigacja między modułami wstrzykiwane
    z jednego miejsca;
  - `TR.progress` — postęp nauki w `localStorage` (nic nie wychodzi na serwer).
- `public/assets/style.css` — motyw jasny i ciemny (`prefers-color-scheme` +
  ręczny przełącznik), style do druku, komponenty matematyczne (ułamki, tabele).
- Stały kod barwny na wszystkich rysunkach: **sinus czerwony, cosinus niebieski,
  tangens zielony**.

## Uruchomienie lokalne

```bash
npm install
npx wrangler dev          # serwuje public/ przez lokalny runtime Workers
# albo bez wranglera:
python3 -m http.server 8788 --directory public
```

## Wdrożenie (Cloudflare Workers — Static Assets)

Konfiguracja w `wrangler.jsonc`: worker bez kodu (`main`), wyłącznie zasoby
statyczne z katalogu `public/`.

```bash
npx wrangler deploy
```

Wymaga `CLOUDFLARE_API_TOKEN` i `CLOUDFLARE_ACCOUNT_ID` w środowisku.

Adres produkcyjny: <https://trygonometria.pwojto-seo.workers.dev>

`html_handling: "auto-trailing-slash"` sprawia, że `/kolo.html` przekierowuje
na `/kolo` — oba adresy działają, linki wewnątrz witryny używają wersji z `.html`,
żeby ta sama struktura plików działała też na zwykłym serwerze statycznym.
