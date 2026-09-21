/**
 * 🎮 TGS — TeO Games Studio. Apka-córka Katedry OtakOS.
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
import { Gamepad2, Hammer, Bot, Sparkles, Wrench } from 'lucide-react';
import HubGier from './views/HubGier';
import Forge from './views/Forge';
import Agenci from './views/Agenci';
import Gra from './views/Gra';
import KodeksGra from './views/KodeksGra';
import { mostZyje } from './lib/bridge';
import { misjaZAdresu, nasluchujMisji, type MisjaTGS } from './lib/teleport';

type Widok = 'hub' | 'gra' | 'forge' | 'agenci' | 'kodeks';

const MENU: { id: Widok; nazwa: string; Ikona: typeof Gamepad2 }[] = [
  { id: 'hub', nazwa: 'Galeria Gier', Ikona: Gamepad2 },
  { id: 'gra', nazwa: 'To Get Sauce', Ikona: Sparkles },
  { id: 'forge', nazwa: 'TeO Forge', Ikona: Hammer },
  { id: 'agenci', nazwa: 'Agenci', Ikona: Bot },
  // 🎮 Kodeks buduje grę — three.js na moście, z panelem produkcyjnym Nocnej Zmiany (2026-09-21)
  { id: 'kodeks', nazwa: 'Kodeks buduje', Ikona: Wrench },
];

export default function App() {
  const [widok, setWidok] = useState<Widok>('hub');
  const [most, setMost] = useState<boolean | null>(null);
  const [misja, setMisja] = useState<MisjaTGS | null>(null);

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
          <nav className="flex gap-1">
            {MENU.map(({ id, nazwa, Ikona }) => (
              <button
                key={id}
                onClick={() => setWidok(id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                  widok === id ? 'bg-slate-800 text-tgs-primary' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Ikona size={16} />
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
      </main>
    </div>
  );
}
