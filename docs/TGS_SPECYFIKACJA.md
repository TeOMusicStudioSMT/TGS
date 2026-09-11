# 🎮 TGS — „To Get Sauce" → „TeO Great Show"

Specyfikacja z narady Rady 7 (`TeO_Genesis/_OtakOs_Kroniki/TGS.txt`) i stan jej realizacji
w kodzie. Wersja 2D — parter pod przyszłe 3D i $D.

## 8 punktów Suwerena — co stoi, co nie

| # | Punkt | Stan | Gdzie w kodzie |
|---|---|---|---|
| 1 | Moduł tworzenia postaci + wkładki | ✅ działa | `src/gra/postac.ts`, `src/views/gra/TworzeniePostaci.tsx` |
| 2 | Świat Teterhia jako wypadkowa postaci | ✅ działa, zmierzone | `src/gra/teterhia.ts` |
| 3 | mGRV + EXP, kurs dynamiczny | ⚠️ liczy się, ale wymiana na GRV odcięta | `src/gra/ekonomia.ts` |
| 4 | Żywy świat AI (questy) | ✅ lokalnie, przez most | `src/gra/kustosz.ts`, most `/api/tgs/quest` |
| 5 | Bogata kolorystyka, ekspresja scen | ✅ paleta + dryf odcienia | `src/views/gra/Plansza.tsx` |
| 6 | Cel: odkrycie Sosu | ✅ quest `s-01`, sekretny | `src/gra/questy.ts` |
| 7 | Umiejętności tylko z questów | ✅ nie ma innej drogi | `src/gra/questy.ts` → `UMIEJETNOSCI` |
| 8 | Barwa zależna od autentyczności | ✅ steruje renderem i questami | `src/gra/sos.ts` |
| — | Katedra jako plecak | ⚠️ czyta księgę GRV, reszta czeka | `src/views/gra/Plecak.tsx` |

### Co znaczy „zmierzone" przy punkcie 2

Zmiana jednej wkładki („spawanie") przestawiła ziarno `1447780513` → `3229766651`,
a nazwę świata `Teterhia` → `Aelandra`. Ten sam zestaw cech zawsze daje ten sam świat —
dlatego świata nie zapisujemy, tylko drogę gracza (`src/gra/zapis.ts`).

### Co znaczy „steruje renderem" przy punkcie 8

Nasycenie gracza jedzie wprost do kanału S w HSL każdego kafla. Pomiar średniej
barwności pikseli planszy:

| Nasycenie | Średnia barwność | Questy schowane we mgle |
|---|---|---|
| 90 | 16.05 | 0 z 15 |
| 5 | 1.59 | 15 z 15 |

To nie jest pasek postępu obok gry. To jest gra.

## Czego NIE ma — świadomie

- **Wymiana mGRV → GRV.** Most nie ma trasy `POST /api/tgs/wymiana`. Przycisk jest
  zablokowany i podaje powód. Skumulowane mGRV czekają.
- **Popularność w metrykach = 0.** Sieci graczy nie ma, więc liczba jest zerem,
  a nie zmyśloną wartością. Kurs mGRV liczy się z trzech realnych składników.
- **3D i $D.** Umiejętności są projektowane pod nie, ale wymiaru jeszcze nie ma.
- **Kustosze Światów** (utrzymanie serwerów gry na żywo) — nadal puste gniazdo.

## Archiwum: instrukcja systemowa Rady 7

Rada przygotowała ją do wklejenia w Google AI Studio. Suweren dostał tam błąd, bo
nie było świata, którego model mógłby dotknąć — i słusznie odłożył to na później
(Złota Pauza).

**Ta instrukcja NIE poszła do chmury.** Świat już jest — na dysku — więc instrukcja
żyje jako system prompt **lokalnego** modelu, w moście: `wiesio-bridge.js` →
`POST /api/tgs/quest` → Ollama. Zero chmury, 0.00G.

Oryginalne brzmienie zostało zachowane w `_OtakOs_Kroniki/TGS.txt`. Wersja
wykonawcza (z twardym schematem JSON, bo model musi oddać dane, nie prozę) siedzi
w moście jako stała `TETERHIA_SYSTEM`.

### Sprawdzone na żywo

Model `gemma4:e2b` wykuł quest „Echa Starej Składni" dla postaci z wkładkami
`spawanie, radio` — i obie wkładki wróciły w treści (wibracje drewna, sprzęt
radiowy). Cztery wybory o różnych tonach, w tym jeden brutalny i jeden sztuczny.

⚠️ Model domyślny to `gemma4:e2b`, **nie** goły `gemma4` — Ollama rozwija goły tag
do `gemma4:latest`, a ten wywala silnik.

## Pętla rozgrywki

```
postać (żywioł + droga + wkładki)
   └→ ziarno → Teterhia (deterministyczna)
        └→ ruch (WSAD) → wejście na węzeł
             └→ quest (ziarnowy albo od Kustosza)
                  └→ wybór o danym tonie
                       ├→ nasycenie ± → BARWA ŚWIATA i widoczność sekretów
                       ├→ mGRV (baza × kurs)
                       ├→ EXP → poziom
                       └→ umiejętność (tylko tędy)
```

## Uruchomienie

```
npm run dev        # http://localhost:5177
```

Gra chodzi w całości offline. Most i Ollama są dodatkiem: żywe questy Kustosza
i plecak spięty z księgą GRV. Bez nich gra mówi wprost, czego brakuje, i gra dalej
na questach ziarnowych.
