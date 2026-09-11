/**
 * 🧬 Tworzenie postaci — brama do Teterhii (punkt 1).
 *
 * Podgląd ziarna jest na żywo: gracz WIDZI, że każda zmiana wkładki przestawia
 * świat. To nie ozdoba — to dowód, że punkt 2 („świat jest wypadkową postaci")
 * naprawdę działa, zanim gracz w ogóle wejdzie do gry.
 */
import { useMemo, useState } from 'react';
import { ZYWIOLY, DROGI, type Postac, type ZywiolId, type DrogaId } from '../../gra/postac';
import { generujTeterhie } from '../../gra/teterhia';

export default function TworzeniePostaci({ naGotowe }: { naGotowe: (p: Postac) => void }) {
  const [imie, setImie] = useState('');
  const [zywiol, setZywiol] = useState<ZywiolId>('eter');
  const [droga, setDroga] = useState<DrogaId>('tworca');
  const [wkladka, setWkladka] = useState('');
  const [wkladki, setWkladki] = useState<string[]>([]);

  const szkic: Postac = useMemo(
    () => ({ imie: imie || 'bezimienny', zywiol, droga, wkladki, utworzona: 0 }),
    [imie, zywiol, droga, wkladki],
  );
  const podglad = useMemo(() => generujTeterhie(szkic), [szkic]);

  const dodajWkladke = () => {
    const w = wkladka.trim();
    if (!w || wkladki.includes(w) || wkladki.length >= 6) return;
    setWkladki([...wkladki, w]);
    setWkladka('');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h2 className="text-2xl font-bold">
          <span className="text-tgs-primary">To Get Sauce</span>
          <span className="text-slate-500"> — wejście do Teterhii</span>
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Świat nie jest gotowy i nie czeka. Powstanie z Ciebie — z żywiołu, drogi i słów, które tu wpiszesz.
        </p>
      </header>

      <section className="space-y-2">
        <label className="text-sm text-slate-300">Imię</label>
        <input
          value={imie}
          onChange={(e) => setImie(e.target.value)}
          placeholder="jak Cię wołać w Teterhii"
          className="w-full rounded-lg border border-slate-700 bg-black/30 px-3 py-2 outline-none focus:border-tgs-primary"
        />
      </section>

      <section className="space-y-2">
        <label className="text-sm text-slate-300">Żywioł — przechyla rozkład biomów i paletę</label>
        <div className="grid gap-2 sm:grid-cols-3">
          {ZYWIOLY.map((z) => (
            <button
              key={z.id}
              onClick={() => setZywiol(z.id)}
              className={`rounded-lg border p-3 text-left text-sm transition ${
                zywiol === z.id ? 'border-tgs-primary bg-tgs-primary/10' : 'border-slate-700 hover:border-slate-500'
              }`}
            >
              <span className="font-medium">{z.nazwa}</span>
              <span className="mt-1 block text-xs text-slate-400">{z.opis}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <label className="text-sm text-slate-300">Droga — zmienia reguły, nie statystyki</label>
        <div className="grid gap-2 sm:grid-cols-2">
          {DROGI.map((d) => (
            <button
              key={d.id}
              onClick={() => setDroga(d.id)}
              className={`rounded-lg border p-3 text-left text-sm transition ${
                droga === d.id ? 'border-tgs-accent bg-tgs-accent/10' : 'border-slate-700 hover:border-slate-500'
              }`}
            >
              <span className="font-medium">{d.nazwa}</span>
              <span className="mt-1 block text-xs text-slate-400">{d.opis}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <label className="text-sm text-slate-300">
          Wkładki Suwerena <span className="text-slate-500">— do 6 słów, które wejdą w ziarno świata</span>
        </label>
        <div className="flex gap-2">
          <input
            value={wkladka}
            onChange={(e) => setWkladka(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && dodajWkladke()}
            placeholder="np. spawanie, radio, kot, 432"
            className="flex-1 rounded-lg border border-slate-700 bg-black/30 px-3 py-2 outline-none focus:border-tgs-primary"
          />
          <button onClick={dodajWkladke} className="rounded-lg border border-slate-700 px-4 text-sm hover:border-slate-500">
            Dodaj
          </button>
        </div>
        {wkladki.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {wkladki.map((w) => (
              <button
                key={w}
                onClick={() => setWkladki(wkladki.filter((x) => x !== w))}
                title="usuń"
                className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300 hover:bg-red-900/40"
              >
                {w} ×
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-800 bg-tgs-panel p-4">
        <p className="text-sm text-slate-400">
          Twój świat nazywa się <b className="text-tgs-primary">{podglad.nazwa}</b>, ziarno{' '}
          <code className="text-slate-500">{podglad.ziarno}</code>.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Zmień jedną wkładkę — nazwa i ziarno się przestawią. Ten sam zestaw zawsze daje ten sam świat.
        </p>
      </section>

      <button
        disabled={!imie.trim()}
        onClick={() => naGotowe({ ...szkic, imie: imie.trim(), utworzona: Date.now() })}
        className="w-full rounded-lg bg-tgs-primary py-3 font-medium text-tgs-dark disabled:opacity-40"
      >
        {imie.trim() ? `Wejdź do ${podglad.nazwa}` : 'Wpisz imię, żeby wejść'}
      </button>
    </div>
  );
}
