/**
 * 🎮 TGS — TeO Games Studio. Apka-córka Katedry OtakOS.
 *
 * Droga gry (2026-10-06): Galeria → 1 To Get Sauce → 2 Reżyser i GDD → 3 Dyrygent → 4 Obrazy → 5 Assety 3D → 6 Ruch →
 * 7 Krajobrazy → 8 Kodeks buduje. Obok drogi: Forge i Agenci.
 *
 * Trzy filary z narady Rady 7 (Kronika: „Narodziny TGS"):
 *   Hub   — galeria gier (przeglądarka / pobranie / węzeł serwerowy za GRV)
 *   Forge — multi-engine, przeprowadzka Unreala z Katedry
 *   Agenci— TeOgochi Games + Kustosze Światów
 *
 * Pasek na górze mówi PRAWDĘ o moście: zielony = :3001 odpowiada, czerwony = nie.
 * Bez mostu Forge i Agenci nic nie zrobią i mówią to wprost.
 */
import { useEffect, useState } from 'react';
import { Gamepad2, Hammer, Bot, Sparkles, Wrench, Clapperboard, Box, Music2, Image as ImageIcon, Film, Mountain } from 'lucide-react';
import HubGier from './views/HubGier';
import Forge from './views/Forge';
import Agenci from './views/Agenci';
import Gra from './views/Gra';
import KodeksGra from './views/KodeksGra';
import RezyserGry from './views/RezyserGry';
import Assety3D from './views/Assety3D';
import DyrygentGry from './views/DyrygentGry';
import PracowniaObrazow from './views/PracowniaObrazow';
import RuchBryl from './views/RuchBryl';
import { mostZyje } from './lib/bridge';
import { misjaZAdresu, nasluchujMisji, type MisjaTGS } from './lib/teleport';

type Widok = 'hub' | 'gra' | 'gdd' | 'dyrygent' | 'obrazy' | 'assety' | 'ruch' | 'krajobrazy' | 'kodeks' | 'forge' | 'agenci';

/**
 * WORKFLOW (Suweren 2026-10-06: „galeria niech zostanie na początku… zaczyna się TGS… zbudowana z Reżyserem, potem
 * Dyrygent, potem tworzenie: generator obrazów, assetów 3D, ruchu, krajobrazów… finalnie gra dla pojedynczego gracza”).
 * Kroki są ponumerowane; Forge i Agenci to narzędzia obok drogi.
 */
const MENU: { id: Widok; nazwa: string; krok?: number; Ikona: typeof Gamepad2 }[] = [
  { id: 'hub', nazwa: 'Galeria Gier', Ikona: Gamepad2 },
  { id: 'gra', nazwa: 'To Get Sauce', krok: 1, Ikona: Sparkles },
  // 📜 GDD + Reżyser Gry (2026-09-21) + scenariusze Suwerena jako projekty (Teterhia — Wieczna Saga, 2026-10-06)
  { id: 'gdd', nazwa: 'Reżyser i GDD', krok: 2, Ikona: Clapperboard },
  // 🎼 Dyrygent: silniki do celu „gra” + modele TeOgochi od gier
  { id: 'dyrygent', nazwa: 'Dyrygent', krok: 3, Ikona: Music2 },
  // 🖼️ Pracownia obrazów: gałęzie świata z GDD, zestawy modelarskie, karty postaci → wycinek do 3D
  { id: 'obrazy', nazwa: 'Obrazy', krok: 4, Ikona: ImageIcon },
  // 🗿 Assety 3D z tekstu i zdjęć (2026-09-22): FLUX.2 klein → TRELLIS.2 na moście
  { id: 'assety', nazwa: 'Assety 3D', krok: 5, Ikona: Box },
  // 🎞️ Ruch brył (Blender, etap 1): obrót, lewitacja, kołysanie, oddech, podskok → GLB z animacją
  { id: 'ruch', nazwa: 'Ruch', krok: 6, Ikona: Film },
  { id: 'krajobrazy', nazwa: 'Krajobrazy', krok: 7, Ikona: Mountain },
  // 🎮 Kodeks buduje grę — three.js na moście, z panelem produkcyjnym Nocnej Zmiany (2026-09-21)
  { id: 'kodeks', nazwa: 'Kodeks buduje', krok: 8, Ikona: Wrench },
  { id: 'forge', nazwa: 'TeO Forge', Ikona: Hammer },
  { id: 'agenci', nazwa: 'Agenci', Ikona: Bot },
];

const czytajGre = () => { try { return localStorage.getItem('tgs_gra') ?? ''; } catch { return ''; } };

export default function App() {
  const [widok, setWidok] = useState<Widok>('hub');
  const [most, setMost] = useState<boolean | null>(null);
  const [misja, setMisja] = useState<MisjaTGS | null>(null);
  // Gra, nad którą pracujemy — wspólna dla kroków (Reżyser, Dyrygent, Obrazy, Krajobrazy).
  const [gra, setGraStan] = useState<string>(czytajGre);
  const setGra = (id: string) => { setGraStan(id); try { localStorage.setItem('tgs_gra', id); } catch { /* bez pamięci */ } };

  useEffect(() => {
    mostZyje().then(setMost);
    const m = misjaZAdresu();
    if (m) {
      setMisja(m);
      if (m.action === 'forge' || m.engine) setWidok('forge');
    }
    return nasluchujMisji((nowa) => setMisja(nowa));
  }, []);

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 bg-tgs-panel/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-6 py-4">
          <h1 className="text-xl font-bold tracking-wide">
            <span className="text-tgs-primary">TGS</span>{' '}
            <span className="text-slate-400">— TeO Games Studio</span>
          </h1>
          <nav className="flex flex-wrap gap-1">
            {MENU.map(({ id, nazwa, krok, Ikona }, i) => (
              <button
                key={id}
                onClick={() => setWidok(id)}
                title={krok ? `Krok ${krok}` : undefined}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm ${
                  widok === id ? 'bg-slate-800 text-tgs-primary' : 'text-slate-400 hover:text-slate-200'
                } ${i > 0 && !krok && MENU[i - 1].krok ? 'ml-2 border-l border-slate-800 pl-3' : ''}`}
              >
                {krok && <span className={`font-mono text-[10px] ${widok === id ? 'text-tgs-primary' : 'text-slate-600'}`}>{krok}</span>}
                <Ikona size={15} />
                {nazwa}
              </button>
            ))}
          </nav>
          <span
            className="ml-auto flex items-center gap-2 text-xs"
            title={
              most === null
                ? 'Pukam do mostu…'
                : most
                  ? 'Most Wiesia odpowiada na :3001'
                  : 'Most nie odpowiada — odpal Katedrę'
            }
          >
            <span
              className={`h-2 w-2 rounded-full ${
                most === null ? 'bg-slate-600' : most ? 'bg-emerald-400' : 'bg-red-500'
              }`}
            />
            <span className="text-slate-400">
              {most === null ? 'sprawdzam most…' : most ? 'most :3001 żyje' : 'most offline'}
            </span>
          </span>
        </div>
      </header>

      {misja && (
        <div className="mx-auto max-w-6xl px-6 pt-4">
          <p className="rounded-lg border border-tgs-accent/40 bg-tgs-accent/10 px-4 py-2 text-sm text-slate-300">
            🛰️ Misja z Katedry: <code className="text-tgs-accent">{JSON.stringify(misja)}</code>
          </p>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-6 py-6">
        {widok === 'hub' && <HubGier />}
        {widok === 'gra' && <Gra />}
        {widok === 'forge' && <Forge />}
        {widok === 'agenci' && <Agenci />}
        {widok === 'kodeks' && <KodeksGra />}
        {widok === 'gdd' && <RezyserGry wybranaGra={gra} onGra={setGra} />}
        {widok === 'dyrygent' && <DyrygentGry wybranaGra={gra} onGra={setGra} />}
        {widok === 'obrazy' && <PracowniaObrazow wybranaGra={gra} onGra={setGra} />}
        {widok === 'assety' && <Assety3D />}
        {widok === 'ruch' && <RuchBryl />}
        {widok === 'krajobrazy' && <PracowniaObrazow tryb="krajobraz" wybranaGra={gra} onGra={setGra} />}
      </main>
    </div>
  );
}
