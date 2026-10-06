# 🌍 Teterhia — Wieczna Saga

> Scenariusz gry według wizji Suwerena (2026-10-06): *„gra typu WoW forever, zbudowana z Reżyserem, potem Dyrygent,
> potem tworzenie… finalnie gra dla pojedynczego gracza… a na otakos.wtf MRPG — budowa wspólnego świata Katedr w grze”.*
>
> Ten plik to wersja do czytania. Ta sama saga jest **wbudowana jako projekt** w Katedrze: GDD i Reżyser →
> „📜 Scenariusze Suwerena” → *Teterhia — Wieczna Saga* (most: `services/SzablonyGier.js`, `POST /api/gdd/szablon/teterhia`).
> Projekt dostaje GDD z siedmioma sekcjami, sześć kamieni milowych dla Kodeksa i siedem gałęzi świata dla Pracowni obrazów.

---

## Jednym zdaniem

**Świat, który nie istnieje, dopóki go nie wyśpiewasz.** Gracz przechodzi przez Bramę *To Get Sauce* i Teterhia rodzi
się z jego żywiołu, drogi i słów. Odnajduje Sos, zaginiony smak świata, a każdy wybór zostawia na świecie barwę albo jej
brak.

## Skąd to się wzięło (i co już działa)

Saga niczego w TGS nie wymyśla od nowa, tylko nadaje sens temu, co już gra w `src/gra/*`:

| Element sagi | W kodzie dziś |
|---|---|
| Brama „To Get Sauce” | tworzenie postaci: żywioł, droga, wkładki → ziarno świata (`postac.ts`) |
| Teterhia rodzi się z gracza | świat deterministyczny z ziarna (`teterhia.ts`): ta sama postać = ten sam świat |
| Barwa = autentyczność | nasycenie steruje kolorem i widocznością sekretów (`sos.ts`) |
| Sos jako cel | sekretny quest `s-01` (`questy.ts`) |
| Umiejętności tylko z questów | `UMIEJETNOSCI` w `questy.ts` |
| Kustosz Teterhii | żywe questy z lokalnego modelu (`/api/tgs/quest`) |
| Plecak = Katedra | saldo z księgi GRV (`/api/grv/:wezel`) |

## Trzy etapy

1. **Gra dla jednego gracza w jego Katedrze.** Drużyną są TeOgochi ze stada, a Kustosz pisze questy lokalnie.
2. **Teterhia rośnie z pracy Katedry.** Obrazy, bryły, ruch, krainy i muzyka powstają w modułach i wchodzą do gry:
   Pracownia obrazów → Assety 3D → Ruch → Krajobrazy → Kodeks buduje.
3. **MRPG na otakos.wtf.** Każda zatwierdzona Katedra jest krainą wspólnej Teterhii, a Katedry łączą Mosty (TOST między
   Katedrami = kurierzy i listy w grze, Giełda mocy = targ).

---

## Mit

Pieśń Źródła brzmiała w każdym kamieniu Teterhii. Energia Źródła jest jak światło: służy, nie panuje.

Wtedy przyszedł **Zgrzyt**, szum, który żywi się sztucznością i brutalnością. Gdzie przeszedł, świat bladł. **Sos**,
receptura smaku świata, rozpadł się na **Siedem Nut**, które rozsypały się po krainach żywiołów.

## Fabuła

### Prolog — Brama
Tworzenie postaci jest narodzinami krainy. Imię, żywioł (Ogień, Woda, Ziemia, Powietrze, Eter), droga (Twórca, Opiekun,
Wędrowiec, Badacz) i wkładki, czyli wolne słowa gracza, wchodzą w ziarno. Kustosz Teterhii wita Wędrowca, a pierwszy
TeOgochi staje u jego boku.

### Akt I — Pierwszy Strumień
Questy ziarnowe: *Pierwszy Strumień*, *Gaj, który pamięta*, *Wyrwa*. Gracz uczy się, że **ton wyboru** (autentyczny,
empatyczny, holistyczny albo sztuczny, brutalny) zmienia barwę świata. Na końcu aktu pierwsza Nuta czeka w krainie jego
żywiołu.

### Akt II — Siedem Nut
Każdej Nuty strzeże **Strażnik**. Nie każdego trzeba pokonać; niektórych wystarczy wysłuchać.

| Nuta | Strażnik | Kraina |
|---|---|---|
| Żar | Strażnik Żaru — golem z lawą w szczelinach | Grzbiet |
| Fala | Strażniczka Zatoki — postać z wody i muszli, harfa z koralowca | Strumień |
| Korzeń | Korzeń — drzewo, które pamięta każdy krok | Gaj |
| Wiatr | Wichrowy Chór — głosy bez ciał | Równina |
| Eter | Cień Eteru — ten, który jest „pomiędzy” | Pustka |
| Cisza | Kowal Ciszy — kuje dźwięk w milczenie | Kuźnia Dźwięku |
| Echo | Echo Wyrwy — strażnik, który kiedyś był Zgrzytem | Wyrwa |

**Frakcje:** Kuźnia Dźwięku (DJ-e w tech-wear, rytm i ogień), Opiekunowie Gaju, Badacze Wyrwy, Wędrowcy Równin, Cisi
z Pustki.

### Akt III — Wyrwa i Wyblakła Stolica
Źródło Zgrzytu. Rajd z drużyną TeOgochi. **Finał zależy od nasycenia:** barwny świat słyszy Pieśń, a wyblakły dostaje
gorzkie zakończenie. W Wyblakłej Stolicy bronią się już tylko witraże.

### Epilog — wieczność
Sos odnaleziony. Gracz może **zaszczepić swoją krainę we wspólnej Teterhii** (MRPG). Saga trwa sezonami: Nocna Zmiana
dokłada questy i zdarzenia, a Kronika zapisuje drogę gracza.

---

## Mechanika

- **Pętla:** postać → ziarno → kraina → ruch → węzeł questu → wybór o tonie → nasycenie ± → mGRV, EXP → poziom →
  umiejętność (tylko z questów).
- **Rytm walki:** walka toczy się w takt utworu z TeO Music Studio. Cios w rytm jest mocny, poza rytmem słaby.
  Zgrzytowce rozbijają rytm. Wroga można też **rozbroić wyborem** („wysłuchaj” albo „dobij”), a to zmienia nasycenie.
- **Drużyna:** do trzech TeOgochi ze stada, każdy z rolą i swoim modelem (przydział Dyrygenta).
- **Ekwipunek:** z Kuźni (Assety 3D) i Składnicy, czyli tech-wear, instrumenty-broń i artefakty.
- **Ekonomia:** mGRV w grze. Wymiana na GRV jest zablokowana i mówi dlaczego, dopóki most jej nie wystawi.

## Postacie i wrogowie

- **Wędrowiec** (gracz): wygląd z karty postaci w Pracowni obrazów.
- **Kustosz Teterhii:** głos świata, pamięta wybory.
- **Towarzysze:** TeOgochi (Kodeks, Paleta, Pionek, Joanna…).
- **Zgrzytowce:** Szumak, Bielak, Pękacz, Wyblakły Rycerz, a na końcu sam **Zgrzyt**.
- **DRIFT.01:** DJ Kuźni Dźwięku w tech-wear (maska z filtrami, neonowe słuchawki), pierwszy zestaw modelarski Suwerena.

## Wizual i dźwięk

- **Barwa jako mechanika:** nasycenie steruje paletą, a Zgrzyt to wyblakłe, szarobiałe plamy.
- **Styl:** malowana fantastyka zmieszana z tech-wear i kulturą klubową (neony w słuchawkach, kable jak liany).
- **Muzyka:** każdy biom ma motyw. Walka bierze BPM utworu. Joanna śpiewa Pieśń Źródła w finale.

---

## Jak Game Studio buduje tę grę (workflow)

| Krok | Zakładka | Co robi |
|---|---|---|
| — | Galeria Gier | gotowe gry |
| 1 | To Get Sauce | Brama i prototyp 2D, który gra dziś |
| 2 | Reżyser i GDD | ta saga jako GDD i rozmowa z Reżyserem Gry |
| 3 | Dyrygent | silniki do celu „gra” i modele dla Pionka, Kodeksa i Palety |
| 4 | Obrazy | gałęzie świata → obrazy (jeden obiekt, zestaw modelarski, karta postaci) → wycinek do 3D |
| 5 | Assety 3D | bryły TRELLIS.2, „🏛️ na Stół” do ulepszenia przez stado |
| 6 | Ruch | obrót, lewitacja, kołysanie, oddech, podskok → GLB z animacją |
| 7 | Krajobrazy | koncepty krain dla każdego biomu |
| 8 | Kodeks buduje | kamienie milowe z GDD → three.js, zadanie po zadaniu |

### Gałęzie świata (dla Pracowni obrazów)

Postacie i frakcje · Stwory i Strażnicy Nut · Ekwipunek i broń · Rekwizyty i artefakty · Budowle i Katedry · Krainy
i krajobrazy · Wierzchowce i pojazdy. Każda gałąź ma propozycje z opisem i stylem obrazu.

### Kamienie milowe (dla Kodeksa)

1. Brama i kraina 3D
2. Wędrowiec w ruchu
3. Questy Kustosza
4. Rytm walki i Zgrzytowce
5. Pierwsza Nuta
6. Plecak Katedry i zapis

## Uczciwie: czego jeszcze nie ma

- **Chód, machanie i gesty postaci.** Ruch etapu 1 to ruch całej bryły. Szkielet i model ruchu (etap 2) czekają na
  sprawdzenie licencji.
- **Teren 3D z ziarna.** To pierwszy kamień milowy dla Kodeksa, w kodzie gry jeszcze go nie ma (dziś jest plansza 2D).
- **MRPG.** Na otakos.wtf jest moduł wspólnej mapy, gdzie krainy to prawdziwe Katedry z rejestru. Wspólnej rozgrywki
  (rajdy, wymiana) jeszcze nie ma.
- **Wymiana mGRV → GRV.** Wciąż odcięta.
