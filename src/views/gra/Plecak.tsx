/**
 * 🎒 Plecak = Twoja Katedra.
 *
 * Ze specyfikacji: „z swojej katedry wchodzisz swym użytkownikiem — twoja
 * katedra to twój plecak w grze". Realizacja: plecak czyta węzeł Suwerena
 * z KSIĘGI GRV w moście. Gdy mostu nie ma — plecak mówi, że jest odcięty,
 * i pokazuje tylko to, co gracz zdobył w grze.
 */
import { useEffect, useState } from 'react';
import { bridge } from '../../lib/bridge';
import { UMIEJETNOSCI } from '../../gra/questy';
import type { Postac } from '../../gra/postac';

/** Węzeł Suwerena w księdze — tak samo nazwany jak w Katedrze (lib/universa.ts). */
const MOJ_WEZEL = 'Mistrz Arkadiusz';

interface Wezel { success: boolean; id: string; saldo?: number | string; tier?: string; message?: string }

export default function Plecak({ postac, umiejetnosci }: { postac: Postac; umiejetnosci: string[] }) {
  const [wezel, setWezel] = useState<Wezel | null>(null);
  const [blad, setBlad] = useState('');

  useEffect(() => {
    bridge
      .get<Wezel>(`/api/grv/${encodeURIComponent(MOJ_WEZEL)}`)
      .then(setWezel)
      .catch((e: Error) => setBlad(e.message));
  }, []);

  return (
    <div className="space-y-4 text-sm">
      <section className="rounded-lg border border-slate-800 bg-black/20 p-3">
        <h4 className="mb-2 font-medium text-tgs-primary">Katedra jako plecak</h4>
        {wezel?.success ? (
          <p className="text-slate-300">
            Węzeł <b>{wezel.id}</b> · saldo <b className="text-tgs-grv">{String(wezel.saldo ?? '—')} GRV</b>
            {wezel.tier ? <span className="text-slate-500"> · tier {wezel.tier}</span> : null}
          </p>
        ) : blad ? (
          <p className="text-amber-400">
            Plecak odcięty — {blad} Gra działa dalej, tylko bez spięcia z księgą.
          </p>
        ) : (
          <p className="text-slate-500">⟳ Otwieram plecak…</p>
        )}
      </section>

      <section className="rounded-lg border border-slate-800 bg-black/20 p-3">
        <h4 className="mb-2 font-medium text-slate-300">Wkładki Suwerena</h4>
        {postac.wkladki.length ? (
          <div className="flex flex-wrap gap-2">
            {postac.wkladki.map((w) => (
              <span key={w} className="rounded-full bg-slate-800 px-3 py-1 text-xs">{w}</span>
            ))}
          </div>
        ) : (
          <p className="text-slate-500">Brak — świat powstał z samego żywiołu i drogi.</p>
        )}
      </section>

      <section className="rounded-lg border border-slate-800 bg-black/20 p-3">
        <h4 className="mb-2 font-medium text-slate-300">
          Umiejętności <span className="text-xs text-slate-500">— wyłącznie z questów</span>
        </h4>
        {umiejetnosci.length ? (
          <ul className="space-y-1">
            {umiejetnosci.map((u) => (
              <li key={u} className="text-slate-300">
                • {UMIEJETNOSCI[u] ?? u}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-500">Pusto. Żadnej nie da się kupić ani wyklikać — trzeba przejść quest.</p>
        )}
      </section>
    </div>
  );
}
