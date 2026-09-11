/**
 * 🔨 TeO Forge — Multi-Engine.
 *
 * Unreal to JEDYNA zakładka podłączona do maszyny: most ma realne trasy
 * /api/uneng/launch, /api/uneng/run-headless, /api/uneng/headless-status
 * (wiesio-bridge.js). Unity / Godot / silniki autorskie to GNIAZDA PUSTE —
 * mówią to wprost i podają, czego brakuje w moście. Zero atrap.
 *
 * „WYKUJ ŚWIAT" PRZYJECHAŁO Z HUBA (2026-09-11). Hub trzymał w menu własny
 * TeoArcadeForge: obok tych samych tras UE miał plan craftu, zasilenie wyspy
 * i generator skryptu UE z modelu — a do tego wpięte Reżysera i Księgarnię
 * Skilli, które mają domy w Story i Marketplace. Suweren: „forge = games studio,
 * tam je przenieś". Przeniesione są FUNKCJE, nie cudze wtyczki.
 */
import { useState } from 'react';
import toast from 'react-hot-toast';
import { bridge } from '../lib/bridge';

type Silnik = 'unreal' | 'wykuj' | 'unity' | 'godot' | 'custom';

const ZAKLADKI: { id: Silnik; nazwa: string }[] = [
  { id: 'unreal', nazwa: 'Unreal Engine' },
  { id: 'wykuj', nazwa: 'Wykuj świat' },
  { id: 'unity', nazwa: 'Unity' },
  { id: 'godot', nazwa: 'Godot' },
  { id: 'custom', nazwa: 'Silnik autorski' },
];

/** Czego brakuje w moście, żeby zakładka przestała być pusta. */
const BRAKUJE: Record<Exclude<Silnik, 'unreal' | 'wykuj'>, string> = {
  unity: 'POST /api/unity/launch + /api/unity/build (Unity Hub CLI: -batchmode -projectPath)',
  godot: 'POST /api/godot/launch + /api/godot/export (godot --headless --export-release)',
  custom: 'POST /api/silnik/uruchom {komenda} — generyczny spawn z białą listą binarek',
};

function Unreal() {
  const [log, setLog] = useState('');
  const [zajety, setZajety] = useState(false);

  const wykonaj = async (opis: string, fn: () => Promise<unknown>) => {
    setZajety(true);
    setLog(`⟳ ${opis}…`);
    try {
      const d = (await fn()) as { success?: boolean; message?: string };
      if (d.success === false) throw new Error(d.message || 'most odmówił');
      setLog(`✅ ${opis}: ${JSON.stringify(d, null, 2)}`);
      toast.success(opis);
    } catch (e) {
      setLog(`⚠ ${(e as Error).message}`);
      toast.error((e as Error).message);
    } finally {
      setZajety(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400">
        Projekty UE żyją w <code className="text-tgs-primary">TeO_Genesis/TeO_Arcade_Forge/</code> (GENESIS_OVERRIDE,
        ElectricDreamsEnv). Ścieżka do binarki UE siedzi w zmiennej <code>OTAKOS_UE_PATH</code> po stronie mostu.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          disabled={zajety}
          onClick={() => wykonaj('Otwieram Unreal Engine', () => bridge.post('/api/uneng/launch'))}
          className="rounded bg-tgs-primary px-3 py-2 text-sm font-medium text-tgs-dark disabled:opacity-50"
        >
          Otwórz edytor
        </button>
        <button
          disabled={zajety}
          onClick={() =>
            wykonaj('Buduję świat bez okna (headless)', () =>
              bridge.post('/api/uneng/run-headless', { script: '_headless_build.py' }),
            )
          }
          className="rounded bg-tgs-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Build headless
        </button>
        <button
          disabled={zajety}
          onClick={() => wykonaj('Stan buildu', () => bridge.get('/api/uneng/headless-status'))}
          className="rounded border border-slate-700 px-3 py-2 text-sm disabled:opacity-50"
        >
          Odśwież log
        </button>
      </div>
      {log && (
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-black/40 p-3 text-xs text-slate-300">
          {log}
        </pre>
      )}
    </div>
  );
}

/**
 * Wykuj świat — trzy realne trasy mostu, każda osobno, żeby dało się przerwać
 * po dowolnej:
 *   · plan craftu   → POST /api/craft/plan   { target }        (statyczne przepisy, bez modelu)
 *   · zasil wyspę   → POST /api/island/scan  { dir }           (liczy ludzi i przedmioty w katalogu)
 *   · skrypt UE     → POST /api/forge/ue-script { prompt }     (MODEL pisze Python pod UE; zapis na dysk)
 *
 * ⚠️ Tylko ostatnia woła model — i mówi, KTÓRY odpowiedział, bo skrypt bez
 * podpisu silnika za miesiąc wygląda, jakby napisał go człowiek.
 */
function WykujSwiat() {
  const [cel, setCel] = useState('tratwa');
  const [plan, setPlan] = useState('');
  const [katalog, setKatalog] = useState('');
  const [wyspa, setWyspa] = useState('');
  const [opis, setOpis] = useState('');
  const [kod, setKod] = useState('');
  const [plik, setPlik] = useState('');
  const [silnik, setSilnik] = useState('');
  const [zajety, setZajety] = useState<'' | 'plan' | 'wyspa' | 'skrypt'>('');

  const planuj = async () => {
    setZajety('plan');
    try {
      const d = await bridge.post<{ success: boolean; message?: string; name: string; energy: number; steps: string[] }>('/api/craft/plan', { target: cel });
      if (!d.success) throw new Error(d.message || 'Plan nieudany');
      setPlan(`⛵ ${d.name} (energia ${d.energy}):\n${d.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`);
    } catch (e) { toast.error((e as Error).message); }
    finally { setZajety(''); }
  };

  const zasil = async () => {
    if (!katalog.trim()) { toast.error('Podaj katalog wyspy.'); return; }
    setZajety('wyspa');
    try {
      const d = await bridge.post<{ success: boolean; message?: string; people: number; assets: number; total: number }>('/api/island/scan', { dir: katalog.trim() });
      if (!d.success) throw new Error(d.message || 'Skan nieudany');
      setWyspa(`✅ ${d.people} ludzi · ${d.assets} przedmiotów (${d.total}). W UE: scene_island_populate.py`);
      toast.success(`Wyspa zasilona: ${d.people} ludzi, ${d.assets} przedmiotów.`);
    } catch (e) { toast.error((e as Error).message); }
    finally { setZajety(''); }
  };

  const wykuj = async () => {
    if (!opis.trim()) { toast.error('Opisz scenę, którą model ma wykuć.'); return; }
    setZajety('skrypt');
    try {
      const d = await bridge.post<{ success: boolean; message?: string; code: string; file: string; model: string }>('/api/forge/ue-script', { prompt: opis });
      if (!d.success) throw new Error(d.message || 'Generacja nieudana');
      setKod(d.code); setPlik(d.file); setSilnik(d.model);
      toast.success(`Skrypt UE gotowy (${d.model}). Zapisany na dysku.`);
    } catch (e) { toast.error((e as Error).message); }
    finally { setZajety(''); }
  };

  const przycisk = 'rounded bg-tgs-primary px-3 py-2 text-sm font-medium text-tgs-dark disabled:opacity-50';
  const pole = 'w-full rounded border border-slate-700 bg-black/40 px-3 py-2 text-sm text-slate-200 outline-none focus:border-tgs-primary';

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-400">
        Blueprint <code className="text-tgs-primary">GENESIS OVERRIDE</code>: zaplanuj craft, zasil wyspę ludźmi
        i przedmiotami, a potem każ modelowi wykuć skrypt Pythona pod UE. Każdy krok osobno.
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2 rounded-xl border border-slate-800 p-4">
          <div className="text-xs font-medium uppercase tracking-wider text-slate-500">1 · plan craftu</div>
          <select value={cel} onChange={(e) => setCel(e.target.value)} className={pole}>
            <option value="tratwa">Tratwa</option>
            <option value="lodz">Łódź</option>
            <option value="statek">Statek</option>
          </select>
          <button disabled={!!zajety} onClick={planuj} className={przycisk}>{zajety === 'plan' ? 'planuję…' : 'Zaplanuj'}</button>
          {plan && <pre className="whitespace-pre-wrap rounded bg-black/40 p-3 text-xs text-slate-300">{plan}</pre>}
        </div>

        <div className="space-y-2 rounded-xl border border-slate-800 p-4">
          <div className="text-xs font-medium uppercase tracking-wider text-slate-500">2 · zasil wyspę</div>
          <input value={katalog} onChange={(e) => setKatalog(e.target.value)} placeholder="katalog z ludźmi i przedmiotami" className={pole} />
          <button disabled={!!zajety} onClick={zasil} className={przycisk}>{zajety === 'wyspa' ? 'skanuję…' : 'Skanuj'}</button>
          {wyspa && <p className="text-xs text-slate-300">{wyspa}</p>}
        </div>

        <div className="space-y-2 rounded-xl border border-slate-800 p-4">
          <div className="text-xs font-medium uppercase tracking-wider text-slate-500">3 · skrypt UE z modelu</div>
          <textarea value={opis} onChange={(e) => setOpis(e.target.value)} rows={3} placeholder="opis sceny do wykucia" className={pole} />
          <button disabled={!!zajety} onClick={wykuj} className={przycisk}>{zajety === 'skrypt' ? 'model pisze…' : 'Wykuj skrypt'}</button>
          {kod && (
            <div className="space-y-1">
              <div className="text-[11px] text-slate-500">
                silnik: <span className="text-tgs-primary">{silnik}</span> · plik: <code>{plik}</code>
              </div>
              <pre className="max-h-64 overflow-auto rounded bg-black/40 p-3 text-xs text-tgs-primary">{kod}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GniazdoPuste({ silnik }: { silnik: Exclude<Silnik, 'unreal' | 'wykuj'> }) {
  return (
    <div className="rounded-xl border border-dashed border-amber-700/60 bg-amber-950/20 p-5">
      <p className="font-medium text-amber-300">Gniazdo puste — ta zakładka niczego nie uruchamia.</p>
      <p className="mt-2 text-sm text-slate-400">
        Rada 7 zapisała ten silnik w wizji, ale w moście nie ma dla niego trasy. Żeby ożył, dopisz do{' '}
        <code className="text-tgs-primary">wiesio-bridge.js</code>:
      </p>
      <pre className="mt-3 overflow-x-auto rounded bg-black/40 p-3 text-xs text-tgs-primary">{BRAKUJE[silnik]}</pre>
    </div>
  );
}

export default function Forge() {
  const [akt, setAkt] = useState<Silnik>('unreal');
  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
        {ZAKLADKI.map((z) => (
          <button
            key={z.id}
            onClick={() => setAkt(z.id)}
            className={`rounded-t px-3 py-2 text-sm ${
              akt === z.id ? 'bg-slate-800 text-tgs-primary' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {z.nazwa}
            {z.id !== 'unreal' && z.id !== 'wykuj' && <span className="ml-1 text-amber-500">•</span>}
          </button>
        ))}
      </nav>
      {akt === 'unreal' ? <Unreal /> : akt === 'wykuj' ? <WykujSwiat /> : <GniazdoPuste silnik={akt} />}
    </div>
  );
}
