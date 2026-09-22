/**
 * 🕹️ TGS Hub — Galeria Gier.
 *
 * Dwa źródła, jedna półka (Suweren 2026-09-22: „mamy tam galerię gier, nasze gry mogłyby
 * tam trafiać"):
 *   1. KATALOG RĘCZNY — public/gry/katalog.json, plik, nie baza. Tytuły wydane, pobrania,
 *      węzły serwerowe. Bez zmian, dalej suwerennie edytowalny.
 *   2. GRY Z KODEKSA — most (:3001) oddaje projekty typu „gra" z App Studio. Zbudowane
 *      lądują tu same, z podglądem ze zrzutu testu i przyciskiem „Odpal" na /apki/<id>/.
 *      Niezbudowane (sam szablon) pokazujemy jako koncept, bez przycisku — żeby nikt nie
 *      klikał w pustkę.
 *
 * Most offline = widać tylko katalog ręczny plus szczery pasek, że reszty nie wiemy.
 */
import { useCallback, useEffect, useState } from 'react';
import { Download, Globe, Server, AlertCircle, Hammer, RefreshCw } from 'lucide-react';
import type { Gra } from '../lib/types';
import { BRIDGE } from '../lib/bridge';
import { adresGry, adresZrzutu, gry as pobierzGryZMostu, type ProjektGry } from '../lib/kodeks';

const IKONA = { przegladarka: Globe, pobranie: Download, serwer: Server } as const;

const ETYKIETA_STATUSU: Record<Gra['status'], string> = {
  wydana: 'wydana',
  w_budowie: 'w budowie',
  koncept: 'koncept',
};

/** Projekt Kodeksa → karta galerii. Zbudowana gra jest grywalna spod mostu. */
function zProjektu(p: ProjektGry): Gra & { zKodeksa: true; iteracji: number; id: string } {
  return {
    id: p.id,
    tytul: p.nazwa,
    opis: p.opis || 'Gra budowana przez Kodeksa w Katedrze.',
    dystrybucja: 'przegladarka',
    cel: adresGry(p.id),
    grv: 0,
    silnik: 'web',
    okladka: p.zrzut ? adresZrzutu(p.id) : undefined,
    status: p.zbudowana ? 'w_budowie' : 'koncept',
    zKodeksa: true,
    iteracji: p.iteracji,
  };
}

export default function HubGier() {
  const [zPliku, setZPliku] = useState<Gra[] | null>(null);
  const [zMostu, setZMostu] = useState<Array<ReturnType<typeof zProjektu>>>([]);
  const [mostOffline, setMostOffline] = useState(false);
  const [blad, setBlad] = useState('');

  const wczytaj = useCallback(() => {
    fetch('./gry/katalog.json')
      .then((r) => r.json())
      .then((d) => setZPliku(Array.isArray(d?.gry) ? d.gry : []))
      .catch((e) => setBlad(String(e)));
    pobierzGryZMostu()
      .then((p) => { setZMostu(p.map(zProjektu)); setMostOffline(false); })
      .catch(() => { setZMostu([]); setMostOffline(true); });
  }, []);
  useEffect(wczytaj, [wczytaj]);

  if (blad) return <p className="text-red-400">⚠ Nie wczytałem katalogu: {blad}</p>;
  if (!zPliku) return <p className="text-slate-400">⟳ Czytam katalog…</p>;

  const wszystkie: Array<Gra & { zKodeksa?: boolean; iteracji?: number }> = [...zMostu, ...zPliku];

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-xs text-slate-400">
            Katalog ręczny (<code className="text-tgs-primary">public/gry/katalog.json</code>) + gry zbudowane przez Kodeksa
            {mostOffline ? ' — mostu nie ma, więc tych drugich teraz nie widać.' : `: ${zMostu.length}.`}
          </p>
        </div>
        <button onClick={wczytaj} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800" title="Odśwież"><RefreshCw size={16} /></button>
      </header>

      {mostOffline && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-950/30 px-4 py-2 text-sm text-amber-200">
          Most ({BRIDGE}) nie odpowiada — gry z Kodeksa mieszkają w nim. Odpal Katedrę i odśwież.
        </p>
      )}

      {wszystkie.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center">
          <AlertCircle className="mx-auto mb-3 text-slate-500" size={32} />
          <p className="font-medium text-slate-300">Galeria jest pusta.</p>
          <p className="mt-2 text-sm text-slate-500">
            Zbuduj grę w zakładce „Kodeks buduje" — trafi tu sama. Tytuły spoza Katedry dopisujesz do{' '}
            <code className="text-tgs-primary">public/gry/katalog.json</code>.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {wszystkie.map((g) => {
            const Ikona = IKONA[g.dystrybucja];
            const grywalna = g.status !== 'koncept';
            return (
              <article key={`${g.zKodeksa ? 'k' : 'p'}-${g.id}`} className="flex flex-col overflow-hidden rounded-xl border border-slate-800 bg-tgs-panel">
                {g.okladka && (
                  <img src={g.okladka} alt="" className="h-32 w-full bg-black/40 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
                <div className="flex flex-1 flex-col p-4">
                  <header className="mb-2 flex items-center gap-2">
                    <Ikona size={18} className="text-tgs-primary" />
                    <h3 className="min-w-0 flex-1 truncate font-semibold">{g.tytul}</h3>
                    {g.zKodeksa && (
                      <span className="flex items-center gap-1 rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-400" title={`${g.iteracji} zleceń Kodeksa`}>
                        <Hammer size={10} /> {g.iteracji}
                      </span>
                    )}
                  </header>
                  <p className="flex-1 text-sm text-slate-400">{g.opis}</p>
                  <footer className="mt-3 flex items-center justify-between text-xs">
                    <span className="rounded bg-slate-800 px-2 py-1 text-slate-400">
                      {ETYKIETA_STATUSU[g.status]}
                      {g.silnik ? ` · ${g.silnik}` : ''}
                    </span>
                    {g.grv > 0 ? (
                      <button
                        disabled
                        title="Gniazdo puste: most nie ma endpointu płatności GRV (/api/grv/pay). Nie udaję, że kupno działa."
                        className="cursor-not-allowed rounded bg-slate-800 px-3 py-1 text-tgs-grv opacity-60"
                      >
                        {g.grv} GRV 🔒
                      </button>
                    ) : grywalna ? (
                      <button
                        onClick={() => window.open(g.cel, '_blank')}
                        className="rounded bg-tgs-primary px-3 py-1 font-medium text-tgs-dark hover:brightness-110"
                      >
                        {g.dystrybucja === 'pobranie' ? 'Pobierz' : 'Odpal'}
                      </button>
                    ) : (
                      <span className="rounded bg-slate-800 px-3 py-1 text-slate-500" title="Sam szablon — Kodeks jeszcze nic nie zbudował">
                        jeszcze nie ma czego odpalać
                      </span>
                    )}
                  </footer>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
