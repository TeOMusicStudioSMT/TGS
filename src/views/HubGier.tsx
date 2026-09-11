/**
 * 🕹️ TGS Hub — Galeria Gier.
 *
 * Trzy kanały dystrybucji z wizji Rady: przeglądarka (WebGL/Canvas), pobranie
 * (exe/zip) i węzeł serwerowy za GRV. Katalog jest PLIKIEM, nie bazą — suwerennie,
 * ręcznie edytowalny: public/gry/katalog.json.
 */
import { useEffect, useState } from 'react';
import { Download, Globe, Server, AlertCircle } from 'lucide-react';
import type { Gra } from '../lib/types';

const IKONA = {
  przegladarka: Globe,
  pobranie: Download,
  serwer: Server,
} as const;

const ETYKIETA_STATUSU: Record<Gra['status'], string> = {
  wydana: 'wydana',
  w_budowie: 'w budowie',
  koncept: 'koncept',
};

export default function HubGier() {
  const [gry, setGry] = useState<Gra[] | null>(null);
  const [blad, setBlad] = useState('');

  useEffect(() => {
    fetch('./gry/katalog.json')
      .then((r) => r.json())
      .then((d) => setGry(Array.isArray(d?.gry) ? d.gry : []))
      .catch((e) => setBlad(String(e)));
  }, []);

  if (blad) return <p className="text-red-400">⚠ Nie wczytałem katalogu: {blad}</p>;
  if (!gry) return <p className="text-slate-400">⟳ Czytam katalog…</p>;

  if (gry.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center">
        <AlertCircle className="mx-auto mb-3 text-slate-500" size={32} />
        <p className="font-medium text-slate-300">Galeria jest pusta — i tak ma być na starcie.</p>
        <p className="mt-2 text-sm text-slate-500">
          Pierwszy tytuł dopisujesz ręcznie do <code className="text-tgs-primary">public/gry/katalog.json</code>.
          Format opisany w tym samym pliku.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {gry.map((g) => {
        const Ikona = IKONA[g.dystrybucja];
        return (
          <article key={g.id} className="flex flex-col rounded-xl border border-slate-800 bg-tgs-panel p-4">
            <header className="mb-2 flex items-center gap-2">
              <Ikona size={18} className="text-tgs-primary" />
              <h3 className="font-semibold">{g.tytul}</h3>
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
              ) : (
                <button
                  onClick={() => window.open(g.cel, '_blank')}
                  className="rounded bg-tgs-primary px-3 py-1 font-medium text-tgs-dark hover:brightness-110"
                >
                  {g.dystrybucja === 'pobranie' ? 'Pobierz' : 'Odpal'}
                </button>
              )}
            </footer>
          </article>
        );
      })}
    </div>
  );
}
