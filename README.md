# 🎮 TGS — TeO Games Studio

Apka-córka Katedry OtakOS. Rusztowanie postawione z narady Rady 7
(`TeO_Genesis/_OtakOs_Kroniki/Narodziny TGS i Nowego Universum`).

## Odpalenie

```
npm install
npm run dev        # http://localhost:5177
```

Przez most (tak jedzie USB V_ZERO, gdzie nie ma serwerów dev):

```
npm run build
cp -r dist/* ../TeO_Genesis/public/apps/games/
# → http://127.0.0.1:3001/apps/games/
```

## Co JEST podłączone (zweryfikowane)

| Moduł | Trasa mostu | Stan |
|---|---|---|
| Gra „To Get Sauce" (2D) | — działa offline | grywalna, patrz `docs/TGS_SPECYFIKACJA.md` |
| Kustosz Teterhii (żywe questy) | `POST /api/tgs/quest` | żywa (Ollama, `gemma4:e2b`) |
| Plecak = Katedra | `GET /api/grv/:wezel` | żywa |
| Forge → Unreal: otwórz edytor | `POST /api/uneng/launch` | żywa |
| Forge → Unreal: build headless | `POST /api/uneng/run-headless` | żywa |
| Forge → Unreal: log | `GET /api/uneng/headless-status` | żywa |
| Agenci → TeOgochi Games | `POST /api/cobot/ask` | żywa (wymaga Ollamy) |
| Galeria Gier | `public/gry/katalog.json` | plik, nie baza |
| Teleport (odbiór misji) | query params + BroadcastChannel | czyta obie drogi |

## Co jest GNIAZDEM PUSTYM (świadomie, bez atrapy)

Te miejsca w UI mówią wprost, że nic nie robią, i podają brakującą trasę:

- **Unity** → `POST /api/unity/launch`, `/api/unity/build`
- **Godot** → `POST /api/godot/launch`, `/api/godot/export`
- **Silnik autorski** → `POST /api/silnik/uruchom` (spawn z białą listą binarek)
- **Płatność GRV za grę** → `POST /api/grv/pay` (przycisk ceny jest zablokowany)
- **Wymiana mGRV → GRV** → `POST /api/tgs/wymiana` (przycisk w grze zablokowany, podaje powód)
- **Kustosze Światów** → `/api/tgs/swiaty`, `/api/tgs/swiat/:id/start`, `/puls`

## Czego tu NIE ma

- `F:\_AntiGravity_Wymiar` — Rada 7 ogłosiła manifestację tego katalogu; na dysku
  go nie było. Zapis na dysk idzie przez istniejące trasy mostu, nie przez ten mit.
- Floom 2 zrealizowany INACZEJ niż planowała Rada: instrukcja Agenta Teterhii nie
  poszła do Google AI Studio (chmura łamie 0.00G, a Suweren dostał tam błąd), tylko
  stała się system promptem lokalnego modelu w moście. Szczegóły: `docs/TGS_SPECYFIKACJA.md`.
- Przeprowadzka `TeoArcadeForge.tsx` z Katedry: tutaj stoi nowy, chudy Forge.
  Stary komponent (412 linii: Stocznia, Składnica Assetów, Wyspa, Co-Bot) wciąż
  siedzi w Katedrze i czeka na decyzję Suwerena — przenieść czy trzymać oba.
