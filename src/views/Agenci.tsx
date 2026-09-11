/**
 * 🤖 Agenci TGS — TeOgochi Games (deweloper) + Kustosze Światów.
 *
 * Co-Bot jest REALNY: most ma POST /api/cobot/ask (idzie do Ollamy).
 * Kustosze Światów (utrzymanie stanu serwerów gier na żywo) NIE MAJĄ jeszcze
 * niczego po stronie mostu — i tak są tu opisane, jako jawnie puste gniazdo.
 */
import { useState } from 'react';
import { bridge } from '../lib/bridge';

export default function Agenci() {
  const [pytanie, setPytanie] = useState('');
  const [odpowiedz, setOdpowiedz] = useState('');
  const [zajety, setZajety] = useState(false);

  const zapytaj = async () => {
    const msg = pytanie.trim();
    if (!msg) return;
    setZajety(true);
    setOdpowiedz('⟳ Co-Bot myśli (lokalna Ollama)…');
    try {
      const d = await bridge.post<{ success: boolean; reply?: string; message?: string }>('/api/cobot/ask', {
        message: msg,
      });
      if (!d.success) throw new Error(d.message || 'Co-Bot milczy');
      setOdpowiedz(d.reply || '(pusta odpowiedź)');
    } catch (e) {
      setOdpowiedz(`⚠ ${(e as Error).message}`);
    } finally {
      setZajety(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-800 bg-tgs-panel p-4">
        <h3 className="mb-1 font-semibold text-tgs-primary">TeOgochi Games — Agent Deweloper</h3>
        <p className="mb-3 text-sm text-slate-400">
          Podpięty pod żywą trasę mostu <code>/api/cobot/ask</code>. Wymaga włączonej Ollamy.
        </p>
        <textarea
          value={pytanie}
          onChange={(e) => setPytanie(e.target.value)}
          rows={3}
          placeholder="np. Zaproponuj pętlę rozgrywki dla wyspy startowej — bez kary, z teleportacją zamiast śmierci."
          className="w-full rounded-lg border border-slate-700 bg-black/30 p-3 text-sm outline-none focus:border-tgs-primary"
        />
        <button
          onClick={zapytaj}
          disabled={zajety}
          className="mt-2 rounded bg-tgs-primary px-4 py-2 text-sm font-medium text-tgs-dark disabled:opacity-50"
        >
          Zapytaj
        </button>
        {odpowiedz && (
          <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-black/40 p-3 text-sm text-slate-300">
            {odpowiedz}
          </pre>
        )}
      </section>

      <section className="rounded-xl border border-dashed border-amber-700/60 bg-amber-950/20 p-5">
        <h3 className="font-medium text-amber-300">Kustosze Światów — gniazdo puste</h3>
        <p className="mt-2 text-sm text-slate-400">
          Agenci trzymający stan serwera gry i interakcje z graczami na żywo. W moście nie ma dla nich ani trasy, ani
          procesu — więc tutaj nic nie „pilnuje". Brakujący fundament:
        </p>
        <pre className="mt-3 overflow-x-auto rounded bg-black/40 p-3 text-xs text-tgs-primary">
{`GET  /api/tgs/swiaty            → lista żywych węzłów gry
POST /api/tgs/swiat/:id/start   → spawn procesu serwera
GET  /api/tgs/swiat/:id/puls    → heartbeat + stan graczy`}
        </pre>
      </section>
    </div>
  );
}
